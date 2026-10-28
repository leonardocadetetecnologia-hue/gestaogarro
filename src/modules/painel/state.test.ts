import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionUser } from "@/lib/auth";
const { db } = vi.hoisted(() => ({ db: {
  customer: { findMany: vi.fn() }, opportunity: { findMany: vi.fn() }, demand: { findMany: vi.fn() },
  user: { findMany: vi.fn() }, scheduleEvent: { findMany: vi.fn() }, notification: { findMany: vi.fn() }, kanbanLabel: { findMany: vi.fn() },
} }));
vi.mock("@/lib/prisma", () => ({ prisma: db }));
import { loadPanelState } from "./state";
const user: SessionUser = { id: "user", name: "Usuário", email: "user@example.test", role: "GESTOR_GARRO" };
beforeEach(() => { vi.resetAllMocks(); for (const model of Object.values(db)) model.findMany.mockResolvedValue([]); });
describe("dados e agenda por perfil", () => {
  it("não volta a carregar clientes ou demandas demonstrativas quando o banco está vazio", async () => {
    const state = await loadPanelState(user);
    expect(state.customers).toEqual([]); expect(state.opportunities).toEqual([]); expect(state.demands).toEqual([]);
  });
  it("inclui a Gestora na equipe de edição e permite apenas a ela a agenda global", async () => {
    await loadPanelState(user);
    expect(db.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { role: { in: ["EDITOR", "GESTOR_GARRO"] } } }));
    expect(db.scheduleEvent.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
    expect(db.demand.findMany).toHaveBeenCalledWith(expect.objectContaining({
      include: expect.objectContaining({ deliverables: expect.objectContaining({ orderBy: [{ createdAt: "asc" }, { id: "asc" }] }) }),
    }));
  });
  it("não consulta a produção para a atendente e filtra sua agenda comercial no servidor", async () => {
    const state = await loadPanelState({ ...user, role: "ATENDENTE" });
    expect(db.demand.findMany).not.toHaveBeenCalled();
    expect(db.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { active: true, OR: [{ id: user.id }, { role: "GESTOR_GARRO" }] } }));
    expect(state.demands).toEqual([]); expect(state.deliverables).toEqual([]);
    expect(db.scheduleEvent.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ userId: user.id, demandId: null }) }));
    expect(db.opportunity.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { responsibleId: user.id } }));
    expect(db.customer.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { OR: [{ createdById: user.id }, { opportunities: { some: { responsibleId: user.id } } }] },
    }));
  });
  it("nega dados comerciais ao editor e consulta somente suas atribuições", async () => {
    await loadPanelState({ ...user, role: "EDITOR" });
    expect(db.opportunity.findMany).not.toHaveBeenCalled();
    expect(db.customer.findMany).toHaveBeenCalledWith(expect.objectContaining({ select: { id: true, name: true } }));
    expect(db.demand.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { deliverables: { some: { editorId: user.id } } } }));
    expect(db.notification.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ userId: user.id }) }));
  });
  it("leva o tipo ao quadro e deixa a demanda antiga sem tipo", async () => {
    const row = {
      id: "nova", customerId: "c", title: "Casamento", description: "", status: "NOVA", clientDueAt: null,
      hd: null, driveUrl: null, mediaType: "FOTO_E_VIDEO", createdAt: new Date("2026-10-28T15:00:00.000Z"),
      deliverables: [], messages: [], files: [], sale: null,
    };
    db.demand.findMany.mockResolvedValue([row, { ...row, id: "antiga", title: "Arquivo", mediaType: null }]);
    const state = await loadPanelState(user);
    expect(state.demands.map(item => [item.id, item.mediaType])).toEqual([["nova", "FOTO_E_VIDEO"], ["antiga", undefined]]);
  });
});
