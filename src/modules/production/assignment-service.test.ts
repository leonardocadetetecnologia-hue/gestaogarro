import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionUser } from "@/lib/auth";

const { tx, transaction } = vi.hoisted(() => {
  const tx = {
    $queryRaw: vi.fn(),
    user: { findFirst: vi.fn() },
    deliverable: { findMany: vi.fn(), update: vi.fn() },
    scheduleEvent: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    demand: { findUnique: vi.fn(), update: vi.fn() },
    demandMessage: { create: vi.fn() },
    notification: { create: vi.fn() },
    auditLog: { create: vi.fn() },
  };
  return { tx, transaction: vi.fn(async (work: (client: typeof tx) => Promise<unknown>) => work(tx)) };
});
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: transaction } }));
import { assignManyDeliverables } from "./assignment-service";

const gestora: SessionUser = { id: "gestora", name: "Gestora", email: "gestora@example.test", role: "GESTOR_GARRO" };
const editor: SessionUser = { id: "babi", name: "Babi", email: "babi@example.test", role: "EDITOR" };
const due = new Date("2026-10-27T02:59:00.000Z");

beforeEach(() => {
  vi.clearAllMocks();
  tx.user.findFirst.mockResolvedValue({ id: "babi", name: "Babi Lua" });
  tx.deliverable.findMany.mockResolvedValue([
    { id: "dani", title: "Dani - todas", demandId: "projeto" },
    { id: "sofia", title: "Sofia - 5", demandId: "projeto" },
  ]);
  tx.scheduleEvent.findFirst.mockResolvedValue(null);
  tx.demand.findUnique.mockResolvedValue({ status: "EM_PRODUCAO" });
});

describe("atribuição de vários entregáveis", () => {
  it("grava o mesmo editor e o mesmo prazo nos itens escolhidos", async () => {
    await assignManyDeliverables(gestora, { demandId: "projeto", deliverableIds: ["dani", "sofia", "dani"], editorId: "babi", editorDueAt: due, reviewDueAt: null });
    expect(tx.deliverable.update).toHaveBeenCalledTimes(2);
    expect(tx.deliverable.update).toHaveBeenCalledWith({ where: { id: "dani" }, data: { editorId: "babi", editorDueAt: due, reviewDueAt: null } });
    expect(tx.deliverable.update).toHaveBeenCalledWith({ where: { id: "sofia" }, data: { editorId: "babi", editorDueAt: due, reviewDueAt: null } });
    expect(tx.notification.create).toHaveBeenCalledTimes(1);
    expect(tx.auditLog.create).toHaveBeenCalledTimes(2);
  });

  it("recusa entregável de outro projeto e perfil que não é Gestora", async () => {
    tx.deliverable.findMany.mockResolvedValue([{ id: "dani", title: "Dani - todas", demandId: "projeto" }]);
    await expect(assignManyDeliverables(gestora, { demandId: "projeto", deliverableIds: ["dani", "fora"], editorId: "babi", editorDueAt: due, reviewDueAt: null })).rejects.toThrow(/deste projeto/);
    await expect(assignManyDeliverables(editor, { demandId: "projeto", deliverableIds: ["dani"], editorId: "babi", editorDueAt: due, reviewDueAt: null })).rejects.toThrow(/Somente a Gestora/);
    await expect(assignManyDeliverables(gestora, { demandId: "projeto", deliverableIds: ["dani"], editorId: "babi", editorDueAt: null, reviewDueAt: null })).rejects.toThrow(/dia do prazo/);
  });
});
