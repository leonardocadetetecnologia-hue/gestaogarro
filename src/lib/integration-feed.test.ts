import { createHash } from "crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const queryRaw = vi.hoisted(() => vi.fn());
const create = vi.hoisted(() => vi.fn());
const transaction = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({ prisma: { integrationEvent: { findMany: vi.fn() }, $transaction: transaction } }));

import { captureProductionRequested, captureSaleClosed, consumeRateLimit, openCursor, publishProductionRequested, readFeedConfig, resetIntegrationRateLimit, signCursor } from "./integration-feed";

const secret = "segredo-de-cursor-com-pelo-menos-32-caracteres";
const token = "token-de-teste-nao-usar-em-producao";
const hash = createHash("sha256").update(token).digest("hex");
const tx = { $queryRaw: queryRaw, integrationEvent: { create } };

beforeEach(() => {
  vi.clearAllMocks();
  resetIntegrationRateLimit();
  process.env.GARRO_EVENT_CAPTURE_MODE = "disabled";
  process.env.GARRO_EVENTS_SCOPE = "empresa-a";
  process.env.GARRO_EVENTS_TOKEN_SHA256 = hash;
  process.env.GARRO_EVENTS_CURSOR_SECRET = secret;
  process.env.BASE_PATH = "/gestaogarro";
});

afterEach(() => {
  delete process.env.GARRO_EVENT_CAPTURE_MODE;
  delete process.env.GARRO_EVENTS_SCOPE;
  delete process.env.GARRO_EVENTS_TOKEN_SHA256;
  delete process.env.GARRO_EVENTS_CURSOR_SECRET;
  delete process.env.BASE_PATH;
});

describe("configuração do feed", () => {
  it("trata modo ausente como disabled e rejeita valor inválido", () => {
    delete process.env.GARRO_EVENT_CAPTURE_MODE;
    expect(readFeedConfig().mode).toBe("disabled");
    process.env.GARRO_EVENT_CAPTURE_MODE = "whatsapp";
    expect(() => readFeedConfig()).toThrow(/inválido/);
  });

  it("falha fechado sem hash, escopo ou segredo do cursor", () => {
    delete process.env.GARRO_EVENTS_TOKEN_SHA256;
    expect(() => readFeedConfig()).toThrow(/ausente/);
    process.env.GARRO_EVENTS_TOKEN_SHA256 = hash;
    delete process.env.GARRO_EVENTS_SCOPE;
    expect(() => readFeedConfig()).toThrow(/ausente/);
    process.env.GARRO_EVENTS_SCOPE = "empresa-a";
    delete process.env.GARRO_EVENTS_CURSOR_SECRET;
    expect(() => readFeedConfig()).toThrow(/ausente/);
  });
});

describe("cursor", () => {
  it("rejeita cursor adulterado e cursor de outro escopo", () => {
    const cursor = signCursor("empresa-a", BigInt(4), secret);
    expect(openCursor(cursor, "empresa-a")).toEqual({ sequence: BigInt(4) });
    expect(openCursor(`${cursor}x`, "empresa-a")).toEqual({ error: "invalid" });
    expect(openCursor(signCursor("empresa-b", BigInt(4), secret), "empresa-a")).toEqual({ error: "incompatible" });
    expect(openCursor(null, "empresa-a")).toEqual({ sequence: BigInt(0) });
  });
});

describe("captura", () => {
  it("não grava evento com o modo desligado ou inválido", async () => {
    process.env.GARRO_EVENT_CAPTURE_MODE = "whatsapp";
    await captureSaleClosed(tx as never, { opportunityId: "op", customerName: "Ana", serviceTitle: "Vídeo", previousStage: "LEAD" });
    delete process.env.GARRO_EVENT_CAPTURE_MODE;
    await captureSaleClosed(tx as never, { opportunityId: "op", customerName: "Ana", serviceTitle: "Vídeo", previousStage: "LEAD" });
    await captureProductionRequested(tx as never, {
      opportunityId: "op", saleId: "sale", demandId: "demand", customerName: "Ana", serviceTitle: "Vídeo", clientDueAt: new Date("2026-11-01T18:00:00.000Z"),
    });
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it("no fechamento só captura a transição real e permite outra após reabertura", async () => {
    process.env.GARRO_EVENT_CAPTURE_MODE = "sale_closed";
    await captureSaleClosed(tx as never, { opportunityId: "op", customerName: "Ana", serviceTitle: "Vídeo", previousStage: "FECHADO" });
    expect(queryRaw).not.toHaveBeenCalled();
    queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([{ value: BigInt(7) }]);
    await captureSaleClosed(tx as never, { opportunityId: "op", customerName: "Ana", serviceTitle: "Vídeo", previousStage: "LEAD" });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        type: "crm.sale_closed.v1",
        scope: "empresa-a",
        sequence: BigInt(7),
        deduplicationKey: "crm.sale_closed.v1:op:7",
        payload: expect.objectContaining({ saleId: null, demandId: null, source: "CRM", clientDueAt: null, demandPath: null }),
      }),
    }));
    expect(JSON.stringify(create.mock.calls[0][0].data.payload)).not.toMatch(/phone|email|briefing|senha/i);
  });

  it("na produção deduplica pela demanda e não inclui o valor", async () => {
    process.env.GARRO_EVENT_CAPTURE_MODE = "production_requested";
    queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([{ value: BigInt(3) }]);
    await captureProductionRequested(tx as never, {
      opportunityId: "op", saleId: "sale", demandId: "demand", customerName: "Ana", serviceTitle: "Vídeo", clientDueAt: new Date("2026-11-01T18:00:00.000Z"),
    });
    const data = create.mock.calls[0][0].data;
    expect(data.deduplicationKey).toBe("crm.production_requested.v1:demand");
    expect(data.payload.demandPath).toBe("/gestaogarro/painel/demanda?id=demand");
    expect(data.payload).not.toHaveProperty("value");
  });
});

describe("aviso depois da ação", () => {
  it("não abre transação com o modo desligado e engole falha do aviso", async () => {
    await publishProductionRequested({
      opportunityId: "op", saleId: "sale", demandId: "demand", customerName: "Ana", serviceTitle: "Vídeo", clientDueAt: new Date("2026-11-01T18:00:00.000Z"),
    });
    expect(transaction).not.toHaveBeenCalled();
    process.env.GARRO_EVENT_CAPTURE_MODE = "production_requested";
    transaction.mockRejectedValue(new Error("aviso indisponível"));
    await expect(publishProductionRequested({
      opportunityId: "op", saleId: "sale", demandId: "demand", customerName: "Ana", serviceTitle: "Vídeo", clientDueAt: new Date("2026-11-01T18:00:00.000Z"),
    })).resolves.toBeUndefined();
  });
});

describe("limite de leitura", () => {
  it("devolve 429 com Retry-After depois do limite anônimo", () => {
    for (let i = 0; i < 20; i += 1) expect(consumeRateLimit("anonymous", 1_000).allowed).toBe(true);
    const blocked = consumeRateLimit("anonymous", 1_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });
});
