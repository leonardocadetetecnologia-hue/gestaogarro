import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionUser } from "@/lib/auth";
const { db } = vi.hoisted(() => ({ db: {
  customer: { findMany: vi.fn() }, opportunity: { findMany: vi.fn() }, demand: { findMany: vi.fn() }, deliverable: { findMany: vi.fn() },
  user: { findMany: vi.fn() }, scheduleEvent: { findMany: vi.fn() }, notification: { findMany: vi.fn() }, kanbanLabel: { findMany: vi.fn() },
  service: { findMany: vi.fn() }, serviceProposal: { findMany: vi.fn() }, setting: { findUnique: vi.fn(), findMany: vi.fn() },
} }));
vi.mock("@/lib/prisma", () => ({ prisma: db }));
import { loadPanelState } from "./state";
const user: SessionUser = { id: "user", name: "Usuário", email: "user@example.test", role: "GESTOR_GARRO" };
beforeEach(() => {
  vi.resetAllMocks();
  for (const model of Object.values(db)) model.findMany.mockResolvedValue([]);
  db.setting.findUnique.mockResolvedValue({ key: "services.catalog", value: "1" });
});
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
  it("entrega à atendente só o andamento da produção e filtra sua agenda comercial no servidor", async () => {
    const state = await loadPanelState({ ...user, role: "ATENDENTE" });
    expect(db.demand.findMany).toHaveBeenCalledWith(expect.objectContaining({
      select: expect.objectContaining({
        title: true,
        customer: { select: { name: true } },
        deliverables: expect.objectContaining({ where: { archivedAt: null } }),
      }),
    }));
    expect(db.demand.findMany.mock.calls[0][0].select.messages).toBeUndefined();
    expect(db.demand.findMany.mock.calls[0][0].include).toBeUndefined();
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
    expect(db.service.findMany).not.toHaveBeenCalled();
    expect(db.customer.findMany).toHaveBeenCalledWith(expect.objectContaining({ select: { id: true, name: true } }));
    expect(db.demand.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { deliverables: { some: { editorId: user.id, archivedAt: null } } } }));
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
  it("numera os entregáveis pela criação e publica só links de entrega válidos", async () => {
    const task = (id: string, createdAt: string, editorId: string | null = null) => ({
      id, title: id, description: "", status: "AGUARDANDO_EDITOR", editorId, createdAt: new Date(createdAt),
      editorDueAt: null, reviewDueAt: null, clientDueAt: null, editorDeliveredAt: null, managerApprovedAt: null, clientDeliveredAt: null,
      scriptAttachments: [],
    });
    const demand = {
      id: "nova", customerId: "c", title: "Casamento", description: "", status: "EM_PRODUCAO", clientDueAt: null,
      hd: null, driveUrl: null, mediaType: "FOTO_E_VIDEO", createdAt: new Date("2026-10-28T15:00:00.000Z"),
      deliveryLinks: ["https://entrega.example/album", "texto"],
      deliverables: [task("segundo", "2026-10-02T12:00:00.000Z"), task("primeiro", "2026-10-01T12:00:00.000Z", "user")],
      messages: [], files: [], sale: null,
    };
    db.demand.findMany.mockResolvedValue([demand]);
    const state = await loadPanelState(user);
    expect(state.demands[0].deliveryLinks).toEqual(["https://entrega.example/album"]);
    expect(state.deliverables.map(item => [item.number, item.id])).toEqual([[1, "primeiro"], [2, "segundo"]]);

    db.demand.findMany.mockResolvedValue([{ ...demand, deliverables: [task("meu", "2026-10-02T12:00:00.000Z", "user")] }]);
    db.deliverable.findMany.mockResolvedValue([
      { id: "outro", demandId: "nova", createdAt: new Date("2026-10-01T12:00:00.000Z") },
      { id: "meu", demandId: "nova", createdAt: new Date("2026-10-02T12:00:00.000Z") },
    ]);
    const editor = await loadPanelState({ ...user, role: "EDITOR" });
    expect(editor.deliverables.map(item => [item.id, item.number])).toEqual([["meu", 2]]);
    expect(editor.demands[0].deliveryLinks).toEqual(["https://entrega.example/album"]);
  });
});
