import { sessionCookiePath } from "@/lib/public-path";
import { crmAttention, deliveryRisk, formatDuration, remainingLabel } from "@/lib/deadlines";
import { can } from "@/lib/rbac";
import { describe, expect, it } from "vitest";

const now = new Date("2026-10-14T15:00:00.000Z");

describe("prazos", () => {
  it("mostra atraso e entrega realizada", () => {
    expect(remainingLabel(new Date("2026-10-14T11:00:00.000Z"), null, now)).toBe("Atrasado há 4h");
    expect(remainingLabel(null, new Date("2026-10-14T16:42:00.000Z"), now)).toContain("Entregue em");
    expect(formatDuration(90 * 60 * 1000 + 6 * 60 * 60 * 1000)).toBe("7h");
  });

  it("eleva o timer quando a próxima ação venceu", () => {
    expect(
      crmAttention({
        waitingSince: null,
        nextActionAt: new Date("2026-10-14T14:00:00.000Z"),
        lastActivityAt: now,
        yellowHours: 4,
        orangeHours: 24,
        redHours: 48,
        now,
      }),
    ).toBe("atrasado");
  });

  it("classifica risco crítico quando o prazo do cliente venceu", () => {
    expect(
      deliveryRisk({
        status: "EM_PRODUCAO",
        editorDueAt: new Date("2026-10-16T18:00:00.000Z"),
        reviewDueAt: new Date("2026-10-17T18:00:00.000Z"),
        clientDueAt: new Date("2026-10-13T18:00:00.000Z"),
        editorDeliveredAt: null,
        managerApprovedAt: null,
        now,
      }),
    ).toBe("CRITICO");
  });
});

describe("rbac", () => {
  it("separa comercial, produção e gestão", () => {
    expect(can("GESTOR_GARRO", "users")).toBe(true);
    expect(can("ATENDENTE", "crm")).toBe(true);
    expect(can("ATENDENTE", "production")).toBe(false);
    expect(can("EDITOR", "commercial.values")).toBe(false);
    expect(can("EDITOR", "production")).toBe(true);
  });
});

describe("caminho público", () => {
  it("restringe o cookie da sessão ao prefixo publicado", () => {
    const previous = process.env.BASE_PATH;
    process.env.BASE_PATH = "/gestaogarro";
    expect(sessionCookiePath()).toBe("/gestaogarro");
    delete process.env.BASE_PATH;
    expect(sessionCookiePath()).toBe("/");
    if (previous !== undefined) process.env.BASE_PATH = previous;
  });
});
