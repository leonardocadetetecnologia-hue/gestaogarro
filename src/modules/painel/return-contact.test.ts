import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionUser } from "@/lib/auth";
import { stages } from "@/lib/data";
import { futureContactAt } from "@/modules/crm/future-contact";

const { tx, transaction } = vi.hoisted(() => {
  const tx = {
    $queryRaw: vi.fn(),
    customer: { update: vi.fn() },
    opportunity: { findUnique: vi.fn(), update: vi.fn() },
    auditLog: { create: vi.fn() },
    crmInteraction: { create: vi.fn() },
    scheduleEvent: { create: vi.fn(), updateMany: vi.fn() },
    notification: { createMany: vi.fn(), deleteMany: vi.fn() },
    user: { findMany: vi.fn(), findFirst: vi.fn() },
    kanbanLabel: { upsert: vi.fn() },
  };
  return { tx, transaction: vi.fn() };
});
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: transaction } }));
vi.mock("@/lib/integration-feed", () => ({ publishSaleClosed: vi.fn() }));
import { executeCrmCommand } from "./crm-service";

const malu: SessionUser = { id: "malu", name: "Malu", email: "malu@example.test", role: "ATENDENTE" };
const gestora: SessionUser = { id: "gestora", name: "Garro", email: "garro@example.test", role: "GESTOR_GARRO" };
const when = futureContactAt(30, new Date("2026-10-27T21:00:00.000Z")).toISOString();

beforeEach(() => {
  vi.resetAllMocks();
  transaction.mockImplementation(async (work: (client: typeof tx) => Promise<unknown>) => work(tx));
  tx.opportunity.findUnique.mockResolvedValue({
    id: "card", responsibleId: "malu", stage: "LEAD", outcome: "ABERTA", nextAction: null, customerId: "cliente",
    customer: { name: "Cliente" }, sale: null,
  });
  tx.user.findMany.mockResolvedValue([{ id: "gestora" }]);
  tx.user.findFirst.mockImplementation(async (args: { where?: { id?: string } }) => args.where?.id === "gestora" ? { id: "gestora" } : null);
});

describe("retorno comercial", () => {
  it("não move para Sem interesse sem a resposta sobre contato futuro", async () => {
    await expect(executeCrmCommand(malu, { kind: "move", id: "card", stage: "Sem interesse" })).rejects.toThrow("contato no futuro");
    expect(tx.scheduleEvent.create).not.toHaveBeenCalled();
  });

  it("grava o contato futuro na agenda da atendente e deixa a notificação para a data", async () => {
    await executeCrmCommand(malu, { kind: "move", id: "card", stage: "Sem interesse", futureContact: "sim", futureAt: when });
    expect(tx.scheduleEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ type: "CONTATO_FUTURO", userId: "malu", opportunityId: "card" }),
    }));
    const notices = tx.notification.createMany.mock.calls[0][0].data as { userId: string; visibleAt: Date }[];
    expect(notices.some(item => item.userId === "malu" && item.visibleAt.toISOString() === when)).toBe(true);
    expect(notices.some(item => item.userId === "gestora")).toBe(true);
  });

  it("em Fechado sem sucesso exige responsável válido e marca a agenda dessa pessoa", async () => {
    await expect(executeCrmCommand(malu, {
      kind: "lose", id: "card", reason: "Preço", futureContact: "sim", futureAt: when, responsibleId: "ana",
    })).rejects.toThrow("responsável");
    await executeCrmCommand(malu, {
      kind: "lose", id: "card", reason: "Preço", futureContact: "sim", futureAt: when, responsibleId: "gestora",
    });
    expect(tx.scheduleEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ type: "CONTATO_FUTURO", userId: "gestora" }),
    }));
    expect(tx.opportunity.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ stage: "PERDIDO", lossReason: "Preço" }),
    }));
  });

  it("permite somente à Gestora renomear as colunas", async () => {
    const labels = stages.map(stage => ({ stage, label: stage === "Lead" ? "Novo lead" : stage }));
    await expect(executeCrmCommand(malu, { kind: "kanbanLabels", labels })).rejects.toThrow("Gestora");
    await executeCrmCommand(gestora, { kind: "kanbanLabels", labels });
    expect(tx.kanbanLabel.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { stage: "Lead" }, create: { stage: "Lead", label: "Novo lead" },
    }));
  });
});
