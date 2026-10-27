import { beforeEach, describe, expect, it, vi } from "vitest";

const { db } = vi.hoisted(() => ({ db: {
  opportunity: { findMany: vi.fn(), update: vi.fn() },
  crmInteraction: { create: vi.fn() },
  scheduleEvent: { updateMany: vi.fn() },
  auditLog: { create: vi.fn() },
  $transaction: vi.fn(),
} }));
vi.mock("@/lib/prisma", () => ({ prisma: db }));
import { returnDueLostOpportunities } from "./loss-return";

beforeEach(() => {
  vi.resetAllMocks();
  db.$transaction.mockImplementation(async (work: (tx: typeof db) => Promise<void>) => work(db));
});

describe("retorno para Lead", () => {
  it("não altera nada enquanto a data de retorno não chegou", async () => {
    db.opportunity.findMany.mockResolvedValue([]);
    await returnDueLostOpportunities(new Date("2026-11-01T12:00:00.000Z"));
    expect(db.opportunity.update).not.toHaveBeenCalled();
  });

  it("devolve a oportunidade para Lead quando o prazo chega", async () => {
    const now = new Date("2026-11-26T12:00:00.000Z");
    db.opportunity.findMany.mockResolvedValue([{ id: "card", responsibleId: "malu" }]);
    await returnDueLostOpportunities(now);
    expect(db.opportunity.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ stage: "PERDIDO", nextAction: "Contato futuro", nextActionAt: { lte: now } }),
    }));
    expect(db.opportunity.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "card" },
      data: expect.objectContaining({ stage: "LEAD", outcome: "ABERTA" }),
    }));
    expect(db.crmInteraction.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ opportunityId: "card", summary: expect.stringContaining("voltou para Lead") }),
    }));
    expect(db.scheduleEvent.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ opportunityId: "card", type: "CONTATO_FUTURO", status: "PENDENTE" }),
    }));
  });
});
