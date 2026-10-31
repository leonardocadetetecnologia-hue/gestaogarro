import type { Prisma, ServiceProposalAction } from "@prisma/client";
import type { SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CrmFlowError } from "@/modules/crm/send-to-production";
import { proposalActionLabel, type ServiceSnapshot } from "./model";
import { serviceChanges } from "./rules";

type Tx = Prisma.TransactionClient;

function amount(value: { toString(): string } | number | null | undefined) {
  if (value == null) return null;
  const number = Number(value.toString());
  return Number.isFinite(number) ? number : null;
}

function dateKey(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : "";
}

function dateValue(value: string) {
  return value ? new Date(`${value}T12:00:00.000Z`) : null;
}

type StoredService = {
  name: string;
  category: ServiceSnapshot["category"];
  description: string;
  referencePrice: { toString(): string } | number | null;
  priceType: ServiceSnapshot["priceType"];
  deliveryDays: number | null;
  hasSelection: boolean;
  selectionDays: number | null;
  recurrence: ServiceSnapshot["recurrence"];
  recurrenceDate: Date | null;
  standardCost: { toString(): string } | number | null;
  variations: { name: string; referencePrice: { toString(): string } | number | null; sortOrder?: number }[];
};

export function snapshotOf(service: StoredService): ServiceSnapshot {
  return {
    name: service.name,
    category: service.category,
    description: service.description,
    referencePrice: amount(service.referencePrice),
    priceType: service.priceType,
    deliveryDays: service.deliveryDays,
    hasSelection: service.hasSelection,
    selectionDays: service.selectionDays,
    recurrence: service.recurrence,
    recurrenceDate: dateKey(service.recurrenceDate),
    standardCost: amount(service.standardCost),
    variations: [...service.variations]
      .sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0))
      .map((item) => ({ name: item.name, referencePrice: amount(item.referencePrice) })),
  };
}

function serviceData(snapshot: ServiceSnapshot, cost: number | null) {
  return {
    name: snapshot.name,
    category: snapshot.category,
    description: snapshot.description,
    referencePrice: snapshot.referencePrice,
    priceType: snapshot.priceType,
    deliveryDays: snapshot.deliveryDays,
    hasSelection: snapshot.hasSelection,
    selectionDays: snapshot.selectionDays,
    recurrence: snapshot.recurrence,
    recurrenceDate: dateValue(snapshot.recurrenceDate),
    standardCost: cost,
  };
}

async function replaceVariations(tx: Tx, serviceId: string, variations: ServiceSnapshot["variations"]) {
  await tx.serviceVariation.deleteMany({ where: { serviceId } });
  if (variations.length) {
    await tx.serviceVariation.createMany({
      data: variations.map((item, index) => ({ serviceId, name: item.name, referencePrice: item.referencePrice, sortOrder: index + 1 })),
    });
  }
}

async function assertActiveName(tx: Tx, name: string, exceptId = "") {
  const clash = await tx.service.findFirst({ where: { name, status: "ATIVO", ...(exceptId ? { NOT: { id: exceptId } } : {}) }, select: { id: true } });
  if (clash) throw new CrmFlowError("Já existe um serviço ativo com este nome.");
}

async function assertNoPending(tx: Tx, serviceId: string) {
  const pending = await tx.serviceProposal.count({ where: { serviceId, status: "PENDENTE" } });
  if (pending) throw new CrmFlowError("Há uma alteração pendente neste serviço. Autorize ou recuse antes de mudar de novo.");
}

async function assertUnused(tx: Tx, serviceId: string) {
  const used = await tx.serviceUsage.count({ where: { serviceId } });
  if (used) throw new CrmFlowError("Este serviço já foi usado. Arquive para tirá-lo das novas seleções.");
}

const serviceInclude = { variations: { orderBy: { sortOrder: "asc" as const } } };

async function notifyManagers(tx: Tx, title: string, message: string) {
  const managers = await tx.user.findMany({ where: { role: "GESTOR_GARRO", active: true }, select: { id: true } });
  if (managers.length) {
    await tx.notification.createMany({
      data: managers.map((manager) => ({ userId: manager.id, type: "SERVICO", title, message, href: "/painel/servicos" })),
    });
  }
}

async function propose(tx: Tx, user: SessionUser, action: ServiceProposalAction, serviceId: string | null, payload: Prisma.InputJsonValue, before: ServiceSnapshot | null) {
  await tx.serviceProposal.create({
    data: { serviceId, authorId: user.id, action, payload, before: before ? (before as unknown as Prisma.InputJsonValue) : undefined },
  });
  await tx.auditLog.create({
    data: { userId: user.id, action: "SERVICE_PROPOSED", entityType: "ServiceProposal", entityId: serviceId || user.id, details: { action, name: before?.name || "" } },
  });
  await notifyManagers(tx, "Alteração de serviço pendente", `${user.name} propôs: ${proposalActionLabel[action]}.`);
}

export async function saveService(user: SessionUser, serviceId: string, snapshot: ServiceSnapshot, includeCost: boolean) {
  if (user.role === "EDITOR") throw new CrmFlowError("Os serviços são do comercial.");
  await prisma.$transaction(async (tx) => {
    if (!serviceId) {
      await assertActiveName(tx, snapshot.name);
      if (user.role === "ATENDENTE") {
        await propose(tx, user, "CRIAR", null, { includeCost: false, service: { ...snapshot, standardCost: null } }, null);
        return;
      }
      const last = await tx.service.aggregate({ where: { category: snapshot.category }, _max: { sortOrder: true } });
      const created = await tx.service.create({
        data: {
          ...serviceData(snapshot, snapshot.standardCost),
          code: `servico-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          sortOrder: (last._max.sortOrder ?? 0) + 1,
          variations: { create: snapshot.variations.map((item, index) => ({ name: item.name, referencePrice: item.referencePrice, sortOrder: index + 1 })) },
        },
      });
      await tx.auditLog.create({ data: { userId: user.id, action: "SERVICE_CREATED", entityType: "Service", entityId: created.id, details: { name: snapshot.name } } });
      return;
    }
    const current = await tx.service.findUnique({ where: { id: serviceId }, include: serviceInclude });
    if (!current) throw new CrmFlowError("Serviço não encontrado.");
    await assertNoPending(tx, current.id);
    await assertActiveName(tx, snapshot.name, current.id);
    const before = snapshotOf(current);
    if (user.role === "ATENDENTE") {
      const proposed = { ...snapshot, standardCost: null };
      if (!serviceChanges(before, proposed, true).length) throw new CrmFlowError("Nada mudou neste serviço.");
      await propose(tx, user, "EDITAR", current.id, { includeCost: false, service: proposed }, before);
      return;
    }
    await tx.service.update({ where: { id: current.id }, data: serviceData(snapshot, includeCost ? snapshot.standardCost : amount(current.standardCost)) });
    await replaceVariations(tx, current.id, snapshot.variations);
    await tx.auditLog.create({
      data: { userId: user.id, action: "SERVICE_UPDATED", entityType: "Service", entityId: current.id, details: { changes: serviceChanges(before, snapshot) } },
    });
  });
}

async function changeStatus(user: SessionUser, serviceId: string, action: "ARQUIVAR" | "DESARQUIVAR") {
  if (user.role === "EDITOR") throw new CrmFlowError("Os serviços são do comercial.");
  const next = action === "ARQUIVAR" ? "ARQUIVADO" : "ATIVO";
  await prisma.$transaction(async (tx) => {
    const current = await tx.service.findUnique({ where: { id: serviceId }, include: serviceInclude });
    if (!current) throw new CrmFlowError("Serviço não encontrado.");
    if (current.status === next) return;
    await assertNoPending(tx, current.id);
    if (next === "ATIVO") await assertActiveName(tx, current.name, current.id);
    if (user.role === "ATENDENTE") {
      await propose(tx, user, action, current.id, { status: next }, snapshotOf(current));
      return;
    }
    await tx.service.update({ where: { id: current.id }, data: { status: next } });
    await tx.auditLog.create({ data: { userId: user.id, action: next === "ARQUIVADO" ? "SERVICE_ARCHIVED" : "SERVICE_RESTORED", entityType: "Service", entityId: current.id, details: { name: current.name } } });
  });
}

export const archiveService = (user: SessionUser, id: string) => changeStatus(user, id, "ARQUIVAR");
export const restoreService = (user: SessionUser, id: string) => changeStatus(user, id, "DESARQUIVAR");

export async function removeService(user: SessionUser, serviceId: string) {
  if (user.role === "EDITOR") throw new CrmFlowError("Os serviços são do comercial.");
  await prisma.$transaction(async (tx) => {
    const current = await tx.service.findUnique({ where: { id: serviceId }, include: serviceInclude });
    if (!current) throw new CrmFlowError("Serviço não encontrado.");
    await assertNoPending(tx, current.id);
    await assertUnused(tx, current.id);
    if (user.role === "ATENDENTE") {
      await propose(tx, user, "EXCLUIR", current.id, { deleted: true }, snapshotOf(current));
      return;
    }
    await tx.service.delete({ where: { id: current.id } });
    await tx.auditLog.create({ data: { userId: user.id, action: "SERVICE_DELETED", entityType: "Service", entityId: current.id, details: { name: current.name } } });
  });
}

type ProposalPayload = { includeCost?: boolean; service?: ServiceSnapshot; status?: "ATIVO" | "ARQUIVADO"; deleted?: boolean };

export async function reviewServiceProposal(user: SessionUser, proposalId: string, decision: "autorizar" | "recusar", comment: string) {
  if (user.role !== "GESTOR_GARRO") throw new CrmFlowError("Somente a Gestora autoriza uma alteração de serviço.");
  const note = comment.trim().slice(0, 500);
  await prisma.$transaction(async (tx) => {
    const proposal = await tx.serviceProposal.findUnique({ where: { id: proposalId } });
    if (!proposal || proposal.status !== "PENDENTE") throw new CrmFlowError("Esta alteração não está mais pendente.");
    const payload = proposal.payload as ProposalPayload;
    if (decision === "recusar") {
      await tx.serviceProposal.update({ where: { id: proposal.id }, data: { status: "RECUSADA", reviewedById: user.id, reviewedAt: new Date(), comment: note } });
      await tx.notification.create({ data: { userId: proposal.authorId, type: "SERVICO", title: "Alteração de serviço recusada", message: note || proposalActionLabel[proposal.action], href: "/painel/servicos" } });
      await tx.auditLog.create({ data: { userId: user.id, action: "SERVICE_PROPOSAL_REFUSED", entityType: "ServiceProposal", entityId: proposal.id, details: { authorId: proposal.authorId, action: proposal.action } } });
      return;
    }
    if (proposal.action === "CRIAR" && payload.service) {
      await assertActiveName(tx, payload.service.name);
      const last = await tx.service.aggregate({ where: { category: payload.service.category }, _max: { sortOrder: true } });
      const created = await tx.service.create({
        data: {
          ...serviceData(payload.service, null),
          code: `proposta-${proposal.id.slice(-8)}`,
          sortOrder: (last._max.sortOrder ?? 0) + 1,
          variations: { create: payload.service.variations.map((item, index) => ({ name: item.name, referencePrice: item.referencePrice, sortOrder: index + 1 })) },
        },
      });
      await tx.serviceProposal.update({ where: { id: proposal.id }, data: { status: "AUTORIZADA", serviceId: created.id, reviewedById: user.id, reviewedAt: new Date(), comment: note } });
    } else if (proposal.action === "EDITAR" && payload.service && proposal.serviceId) {
      const current = await tx.service.findUnique({ where: { id: proposal.serviceId } });
      if (!current) throw new CrmFlowError("Serviço não encontrado.");
      await assertActiveName(tx, payload.service.name, current.id);
      const cost = payload.includeCost ? payload.service.standardCost : amount(current.standardCost);
      await tx.service.update({ where: { id: current.id }, data: serviceData(payload.service, cost) });
      await replaceVariations(tx, current.id, payload.service.variations);
      await tx.serviceProposal.update({ where: { id: proposal.id }, data: { status: "AUTORIZADA", reviewedById: user.id, reviewedAt: new Date(), comment: note } });
    } else if ((proposal.action === "ARQUIVAR" || proposal.action === "DESARQUIVAR") && proposal.serviceId) {
      const status = proposal.action === "ARQUIVAR" ? "ARQUIVADO" : "ATIVO";
      const current = await tx.service.findUnique({ where: { id: proposal.serviceId }, select: { id: true, name: true } });
      if (!current) throw new CrmFlowError("Serviço não encontrado.");
      if (status === "ATIVO") await assertActiveName(tx, current.name, current.id);
      await tx.service.update({ where: { id: current.id }, data: { status } });
      await tx.serviceProposal.update({ where: { id: proposal.id }, data: { status: "AUTORIZADA", reviewedById: user.id, reviewedAt: new Date(), comment: note } });
    } else if (proposal.action === "EXCLUIR" && proposal.serviceId) {
      await assertUnused(tx, proposal.serviceId);
      await tx.serviceProposal.update({ where: { id: proposal.id }, data: { status: "AUTORIZADA", reviewedById: user.id, reviewedAt: new Date(), comment: note, serviceId: null } });
      await tx.service.delete({ where: { id: proposal.serviceId } });
    } else {
      throw new CrmFlowError("Não foi possível aplicar esta alteração.");
    }
    await tx.notification.create({ data: { userId: proposal.authorId, type: "SERVICO", title: "Alteração de serviço autorizada", message: proposalActionLabel[proposal.action], href: "/painel/servicos" } });
    await tx.auditLog.create({ data: { userId: user.id, action: "SERVICE_PROPOSAL_APPROVED", entityType: "ServiceProposal", entityId: proposal.id, details: { authorId: proposal.authorId, action: proposal.action } } });
  });
}
