import { createHash } from "crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const findMany = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({ prisma: { integrationEvent: { findMany } } }));

import { resetIntegrationRateLimit, signCursor } from "@/lib/integration-feed";
import { DELETE, GET, POST } from "./route";

const secret = "segredo-de-cursor-com-pelo-menos-32-caracteres";
const token = "token-de-teste-nao-usar-em-producao";
const hash = createHash("sha256").update(token).digest("hex");
const url = "https://exemplo.test/gestaogarro/api/integrations/events";

function call(path = url, headers: Record<string, string> = {}) {
  return GET(new Request(path, { headers }));
}

beforeEach(() => {
  vi.clearAllMocks();
  resetIntegrationRateLimit();
  findMany.mockResolvedValue([]);
  process.env.GARRO_EVENT_CAPTURE_MODE = "disabled";
  process.env.GARRO_EVENTS_SCOPE = "empresa-a";
  process.env.GARRO_EVENTS_TOKEN_SHA256 = hash;
  process.env.GARRO_EVENTS_CURSOR_SECRET = secret;
});

afterEach(() => {
  delete process.env.GARRO_EVENT_CAPTURE_MODE;
  delete process.env.GARRO_EVENTS_SCOPE;
  delete process.env.GARRO_EVENTS_TOKEN_SHA256;
  delete process.env.GARRO_EVENTS_CURSOR_SECRET;
});

describe("GET /api/integrations/events", () => {
  it("responde 401 sem token, com token inválido e com cookie de gestor", async () => {
    const attempts: Record<string, string>[] = [{}, { authorization: "Bearer errado" }, { cookie: "garro_session=sessao" }, { authorization: "Token abc" }];
    for (const headers of attempts) {
      const response = await call(url, headers);
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: "unauthorized" });
      expect(response.headers.get("cache-control")).toBe("no-store");
    }
    expect(findMany).not.toHaveBeenCalled();
  });

  it("responde 503 com modo inválido sem consultar eventos", async () => {
    process.env.GARRO_EVENT_CAPTURE_MODE = "whatsapp";
    const response = await call(url, { authorization: `Bearer ${token}` });
    expect(response.status).toBe(503);
    expect(findMany).not.toHaveBeenCalled();
  });

  it("responde 503 quando a autenticação não está configurada", async () => {
    delete process.env.GARRO_EVENTS_TOKEN_SHA256;
    const response = await call(url, { authorization: `Bearer ${token}` });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "unavailable" });
  });

  it("responde 200 com o token correto, sem cookie, e não avança cursor vazio", async () => {
    const response = await call(url, { authorization: `Bearer ${token}` });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.captureMode).toBe("disabled");
    expect(body.events).toEqual([]);
    expect(body.hasMore).toBe(false);
    expect(body.schemaVersion).toBe(1);
    const again = await call(`${url}?cursor=${encodeURIComponent(body.nextCursor)}`, { authorization: `Bearer ${token}` });
    expect((await again.json()).events).toEqual([]);
  });

  it("rejeita escrita, limite inválido, cursor inválido e cursor de outro escopo", async () => {
    expect((await POST()).status).toBe(405);
    expect((await DELETE()).status).toBe(405);
    expect((await call(`${url}?limit=101`, { authorization: `Bearer ${token}` })).status).toBe(400);
    expect((await call(`${url}?cursor=nao-e-cursor`, { authorization: `Bearer ${token}` })).status).toBe(400);
    const foreign = signCursor("empresa-b", BigInt(1), secret);
    const expired = await call(`${url}?cursor=${encodeURIComponent(foreign)}`, { authorization: `Bearer ${token}` });
    expect(expired.status).toBe(410);
    expect(await expired.json()).toEqual({ error: "cursor_expired" });
  });

  it("pagina sem pular o restante e repete a mesma página", async () => {
    const rows = Array.from({ length: 101 }, (_, index) => ({
      eventId: `evt-${index + 1}`, type: "crm.sale_closed.v1", schemaVersion: 1, occurredAt: new Date("2026-10-16T00:00:00.000Z"), sequence: BigInt(index + 1),
      payload: { opportunityId: "op", saleId: null, demandId: null, customerName: "Ana", serviceTitle: "Vídeo", clientDueAt: null, source: "CRM", demandPath: null },
    }));
    findMany.mockImplementation(async ({ take, where }: { take: number; where: { sequence: { gt: bigint } } }) => rows.filter(row => row.sequence > where.sequence.gt).slice(0, take));
    const first = await call(`${url}?limit=100`, { authorization: `Bearer ${token}` });
    const page = await first.json();
    expect(page.events).toHaveLength(100);
    expect(page.hasMore).toBe(true);
    const repeated = await call(`${url}?limit=100`, { authorization: `Bearer ${token}` });
    expect((await repeated.json()).events[0].eventId).toBe("evt-1");
    const second = await call(`${url}?limit=100&cursor=${encodeURIComponent(page.nextCursor)}`, { authorization: `Bearer ${token}` });
    const rest = await second.json();
    expect(rest.events.map((event: { eventId: string }) => event.eventId)).toEqual(["evt-101"]);
    expect(rest.hasMore).toBe(false);
  });

  it("responde 429 com Retry-After", async () => {
    let status = 200;
    for (let i = 0; i < 61; i += 1) status = (await call(url, { authorization: `Bearer ${token}` })).status;
    expect(status).toBe(429);
    const blocked = await call(url, { authorization: `Bearer ${token}` });
    expect(blocked.headers.get("retry-after")).toMatch(/^\d+$/);
  });
});
