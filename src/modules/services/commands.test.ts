import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionUser } from "@/lib/auth";
import type { ServiceSnapshot } from "./model";

const { tx, transaction } = vi.hoisted(() => {
  const tx = {
    service: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), aggregate: vi.fn() },
    serviceVariation: { deleteMany: vi.fn(), createMany: vi.fn() },
    serviceProposal: { count: vi.fn(), create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    serviceUsage: { count: vi.fn() },
    auditLog: { create: vi.fn() },
    notification: { create: vi.fn(), createMany: vi.fn() },
    user: { findMany: vi.fn() },
  };
  return { tx, transaction: vi.fn(async (work: (client: typeof tx) => Promise<unknown>) => work(tx)) };
});
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: transaction } }));
import { archiveService, removeService, reviewServiceProposal, saveService } from "./commands";

const gestora: SessionUser = { id: "gestora", name: "Gestora", email: "gestora@example.test", role: "GESTOR_GARRO" };
const atendente: SessionUser = { id: "ana", name: "Ana", email: "ana@example.test", role: "ATENDENTE" };
const editor: SessionUser = { id: "lia", name: "Lia", email: "lia@example.test", role: "EDITOR" };
const snapshot: ServiceSnapshot = {
  name: "Pacote novo", category: "ENSAIOS", description: "Ensaio.", referencePrice: 1000, priceType: "FECHADO",
  deliveryDays: null, hasSelection: true, selectionDays: 7, recurrence: "UMA_VEZ", recurrenceDate: "",
  standardCost: 400, variations: [{ name: "Só vídeo", referencePrice: 800 }],
};
const current = {
  id: "srv", name: "Pacote", category: "ENSAIOS", description: "Ensaio.", referencePrice: 900, priceType: "FECHADO",
  deliveryDays: null, hasSelection: false, selectionDays: null, recurrence: "UMA_VEZ", recurrenceDate: null,
  standardCost: 200, status: "ATIVO", variations: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  tx.service.findFirst.mockResolvedValue(null);
  tx.service.aggregate.mockResolvedValue({ _max: { sortOrder: 1 } });
  tx.service.create.mockResolvedValue({ id: "novo" });
  tx.service.findUnique.mockResolvedValue(current);
  tx.serviceProposal.count.mockResolvedValue(0);
  tx.serviceUsage.count.mockResolvedValue(0);
  tx.user.findMany.mockResolvedValue([{ id: "gestora" }]);
});

describe("alteração de serviço", () => {
  it("a Gestora grava direto e a atendente só deixa a proposta pendente", async () => {
    await saveService(gestora, "", snapshot, true);
    expect(tx.service.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ name: "Pacote novo", standardCost: 400 }) }));
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "SERVICE_CREATED" }) }));

    await saveService(atendente, "", { ...snapshot, standardCost: null }, false);
    expect(tx.serviceProposal.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: "CRIAR", authorId: "ana", payload: expect.objectContaining({ includeCost: false }) }),
    }));
    expect(tx.notification.createMany).toHaveBeenCalled();
    expect(tx.service.create).toHaveBeenCalledTimes(1);
  });

  it("não aceita outra proposta enquanto a anterior espera, nem apaga serviço já usado", async () => {
    tx.serviceProposal.count.mockResolvedValue(1);
    await expect(saveService(gestora, "srv", snapshot, true)).rejects.toThrow(/pendente/);
    tx.serviceProposal.count.mockResolvedValue(0);
    tx.serviceUsage.count.mockResolvedValue(2);
    await expect(removeService(gestora, "srv")).rejects.toThrow(/Arquive/);
    expect(tx.service.delete).not.toHaveBeenCalled();
  });

  it("autorizar cria o serviço sem custo e recusar avisa quem propôs", async () => {
    tx.serviceProposal.findUnique.mockResolvedValueOnce({
      id: "prop", serviceId: null, authorId: "ana", action: "CRIAR", status: "PENDENTE",
      payload: { includeCost: false, service: { ...snapshot, standardCost: null } },
    });
    await reviewServiceProposal(gestora, "prop", "autorizar", "");
    expect(tx.service.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ standardCost: null, name: "Pacote novo" }) }));
    expect(tx.serviceProposal.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "AUTORIZADA", reviewedById: "gestora" }) }));
    expect(tx.notification.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ userId: "ana", title: "Alteração de serviço autorizada" }) }));

    tx.serviceProposal.findUnique.mockResolvedValueOnce({
      id: "prop-2", serviceId: "srv", authorId: "ana", action: "EDITAR", status: "PENDENTE", payload: {},
    });
    await reviewServiceProposal(gestora, "prop-2", "recusar", "O nome já existe.");
    expect(tx.serviceProposal.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "RECUSADA", comment: "O nome já existe." }) }));
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "SERVICE_PROPOSAL_REFUSED", details: expect.objectContaining({ authorId: "ana" }) }) }));
  });

  it("o editor não mexe no catálogo e arquivar pela atendente não muda o status", async () => {
    await expect(archiveService(editor, "srv")).rejects.toThrow(/comercial/);
    await archiveService(atendente, "srv");
    expect(tx.service.update).not.toHaveBeenCalled();
    expect(tx.serviceProposal.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "ARQUIVAR" }) }));
    await archiveService(gestora, "srv");
    expect(tx.service.update).toHaveBeenCalledWith({ where: { id: "srv" }, data: { status: "ARQUIVADO" } });
  });
});
