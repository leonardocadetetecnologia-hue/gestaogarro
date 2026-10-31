import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionUser } from "@/lib/auth";

const { tx, transaction } = vi.hoisted(() => {
  const tx = {
    deliverable: { findUnique: vi.fn(), update: vi.fn(), findMany: vi.fn() },
    scheduleEvent: { updateMany: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    demandMessage: { create: vi.fn() },
    auditLog: { create: vi.fn() },
    demand: { update: vi.fn() },
    notification: { create: vi.fn() },
  };
  return { tx, transaction: vi.fn(async (work: (client: typeof tx) => Promise<unknown>) => work(tx)) };
});
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: transaction } }));
import { archiveDeliverable, restoreDeliverable } from "./archive-deliverable";

const gestora: SessionUser = { id: "gestora", name: "Gestora", email: "gestora@example.test", role: "GESTOR_GARRO" };
const editor: SessionUser = { id: "editor", name: "Editor", email: "editor@example.test", role: "EDITOR" };
const item = {
  id: "errado", demandId: "demanda", title: "Item criado errado", editorId: "editor", status: "AGUARDANDO_EDITOR", archivedAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  tx.deliverable.findUnique.mockResolvedValue(item);
  tx.deliverable.findMany.mockResolvedValue([{ status: "EM_PRODUCAO" }]);
  tx.scheduleEvent.findFirst.mockResolvedValue(null);
});

describe("arquivar entregável", () => {
  it("só a Gestora tira o item da esteira e cancela o prazo pendente", async () => {
    await expect(archiveDeliverable(editor, item.id)).rejects.toThrow(/Gestora/);
    await archiveDeliverable(gestora, item.id);
    expect(tx.deliverable.update).toHaveBeenCalledWith({ where: { id: item.id }, data: { archivedAt: expect.any(Date) } });
    expect(tx.scheduleEvent.updateMany).toHaveBeenCalledWith({ where: { deliverableId: item.id, status: "PENDENTE" }, data: { status: "CANCELADO" } });
    expect(tx.deliverable.findMany).toHaveBeenCalledWith({ where: { demandId: item.demandId, archivedAt: null }, select: { status: true } });
    expect(tx.demand.update).toHaveBeenCalledWith({ where: { id: item.demandId }, data: { status: "EM_PRODUCAO" } });
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "DELIVERABLE_ARCHIVED" }) }));
    expect(tx.notification.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ userId: "editor", title: "Entregável arquivado" }) }));
  });

  it("repetir o arquivamento não grava de novo", async () => {
    tx.deliverable.findUnique.mockResolvedValue({ ...item, archivedAt: new Date() });
    await archiveDeliverable(gestora, item.id);
    expect(tx.deliverable.update).not.toHaveBeenCalled();
  });

  it("restaurar devolve o item e o prazo cancelado", async () => {
    tx.deliverable.findUnique.mockResolvedValue({ ...item, archivedAt: new Date("2026-10-30T18:00:00.000Z") });
    tx.scheduleEvent.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "prazo-editor" })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    await restoreDeliverable(gestora, item.id);
    expect(tx.deliverable.update).toHaveBeenCalledWith({ where: { id: item.id }, data: { archivedAt: null } });
    expect(tx.scheduleEvent.update).toHaveBeenCalledWith({ where: { id: "prazo-editor" }, data: { status: "PENDENTE", completedAt: null } });
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "DELIVERABLE_RESTORED" }) }));
  });
});
