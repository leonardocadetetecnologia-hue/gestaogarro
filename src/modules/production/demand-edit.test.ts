import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionUser } from "@/lib/auth";

const { tx, transaction } = vi.hoisted(() => {
  const tx = {
    demand: { findUnique: vi.fn(), update: vi.fn() },
    deliverable: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    scheduleEvent: { updateMany: vi.fn() },
    demandFile: { findMany: vi.fn(), update: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
    auditLog: { create: vi.fn() },
  };
  return { tx, transaction: vi.fn(async (work: (client: typeof tx) => Promise<unknown>) => work(tx)) };
});
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: transaction } }));
import { addDeliverable, renameDeliverable, saveDeliveryLinks, saveDemandMedia, updateDemandDetails } from "./demand-edit";

const gestora: SessionUser = { id: "gestora", name: "Gestora", email: "gestora@example.test", role: "GESTOR_GARRO" };
const atendente: SessionUser = { id: "ana", name: "Ana", email: "ana@example.test", role: "ATENDENTE" };
const editor: SessionUser = { id: "editor", name: "Editor", email: "editor@example.test", role: "EDITOR" };

beforeEach(() => {
  vi.clearAllMocks();
  tx.demand.findUnique.mockResolvedValue({ id: "demand", status: "ENTREGUE", clientDueAt: null });
  tx.deliverable.findUnique.mockResolvedValue({ id: "task", demandId: "demand", status: "APROVADO" });
  tx.deliverable.create.mockResolvedValue({ id: "new-task" });
  tx.demandFile.findMany.mockResolvedValue([]);
});

describe("edição da demanda fora da esteira", () => {
  it("permite corrigir uma demanda já entregue sem mudar a etapa", async () => {
    await updateDemandDetails(gestora, { id: "demand", title: "IANDRA revisada", description: "Briefing completo", due: "", links: "" });
    expect(tx.demand.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { title: "IANDRA revisada", description: "Briefing completo", clientDueAt: null },
    }));
    expect(tx.demand.update.mock.calls[0][0].data.status).toBeUndefined();
    await updateDemandDetails(gestora, { id: "demand", title: "IANDRA revisada", description: "Briefing completo", due: "", links: "", mediaType: "FOTO" });
    expect(tx.demand.update).toHaveBeenLastCalledWith(expect.objectContaining({
      data: expect.objectContaining({ mediaType: "FOTO" }),
    }));
    await expect(updateDemandDetails(gestora, { id: "demand", title: "IANDRA revisada", description: "", due: "", links: "", mediaType: "EVENTO" })).rejects.toThrow(/tipo/i);
  });

  it("grava o HD e o link do Drive sem mexer na etapa", async () => {
    await saveDemandMedia(gestora, { id: "demand", hd: "HD 04", drive: "https://drive.google.com/pasta" });
    expect(tx.demand.update).toHaveBeenCalledWith({ where: { id: "demand" }, data: { hd: "HD 04", driveUrl: "https://drive.google.com/pasta" } });
    await saveDemandMedia(gestora, { id: "demand", hd: "HD 04", drive: "drive.google.com/pasta" });
    expect(tx.demand.update).toHaveBeenLastCalledWith({ where: { id: "demand" }, data: { hd: "HD 04", driveUrl: "https://drive.google.com/pasta" } });
    await expect(saveDemandMedia(gestora, { id: "demand", hd: "HD 04", drive: "pasta-local" })).rejects.toThrow(/link completo/);
    await expect(saveDemandMedia(atendente, { id: "demand", hd: "HD 04", drive: "" })).rejects.toThrow(/Somente a Gestora/);
  });

  it("grava vários links de entrega e recusa o que não é endereço", async () => {
    await expect(saveDeliveryLinks(gestora, { id: "demand", links: ["pasta-local"] })).rejects.toThrow(/endereço http/);
    expect(transaction).not.toHaveBeenCalled();
    await saveDeliveryLinks(gestora, {
      id: "demand",
      links: ["https://entrega.example/fotos", "drive.google.com/videos", "", "example.com/extra"],
    });
    expect(tx.demand.update).toHaveBeenCalledWith({
      where: { id: "demand" },
      data: { deliveryLinks: ["https://entrega.example/fotos", "https://drive.google.com/videos", "https://example.com/extra"] },
    });
    await saveDeliveryLinks(gestora, { id: "demand", links: ["  ", ""] });
    expect(tx.demand.update).toHaveBeenLastCalledWith({ where: { id: "demand" }, data: { deliveryLinks: [] } });
    const calls = transaction.mock.calls.length;
    await expect(saveDeliveryLinks(atendente, { id: "demand", links: [] })).rejects.toThrow(/Somente a Gestora/);
    await expect(saveDeliveryLinks(editor, { id: "demand", links: ["https://ok.example"] })).rejects.toThrow(/Somente a Gestora/);
    expect(transaction.mock.calls.length).toBe(calls);
  });

  it("inclui um entregável novo no fim, sem alterar os existentes", async () => {
    tx.demand.findUnique.mockResolvedValue({ id: "demand", status: "PRONTO_ENTREGA", clientDueAt: new Date("2026-11-03T17:58:00.000Z") });
    await addDeliverable(gestora, { demandId: "demand", title: "9- NOVO CORTE" });
    expect(tx.deliverable.update).not.toHaveBeenCalled();
    expect(tx.deliverable.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ title: "9- NOVO CORTE", status: "AGUARDANDO_EDITOR" }),
    }));
    expect(tx.demand.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: "AGUARDANDO_EDITOR" } }));
  });

  it("renomeia um entregável aprovado sem mexer no status", async () => {
    await renameDeliverable(gestora, { id: "task", title: "1- NEW TECH revisado" });
    expect(tx.deliverable.update).toHaveBeenCalledWith({ where: { id: "task" }, data: { title: "1- NEW TECH revisado" } });
  });

  it("bloqueia a atendente antes de gravar", async () => {
    await expect(updateDemandDetails(atendente, { id: "demand", title: "Troca", description: "", due: "", links: "" })).rejects.toThrow("Somente a Gestora");
    await expect(addDeliverable(atendente, { demandId: "demand", title: "Extra" })).rejects.toThrow("Somente a Gestora");
    expect(transaction).not.toHaveBeenCalled();
  });
});
