import type { Prisma } from "@prisma/client";
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

async function assertUnused(tx: Tx, serviceId: string) {
  const used = await tx.serviceUsage.count({ where: { serviceId } });
  if (used) throw new CrmFlowError("Este serviço já foi usado. Arquive para tirá-lo das novas seleções.");
}

const serviceInclude = { variations: { orderBy: { sortOrder: "asc" as const } } };

function assertManager(user: SessionUser) {
  if (user.role !== "GESTOR_GARRO") throw new CrmFlowError("Somente a Gestora altera o catálogo de serviços.");
}

export async function saveService(user: SessionUser, serviceId: string, snapshot: ServiceSnapshot, includeCost: boolean) {
  assertManager(user);
  await prisma.$transaction(async (tx) => {
    if (!serviceId) {
      await assertActiveName(tx, snapshot.name);
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
    await assertActiveName(tx, snapshot.name, current.id);
    const before = snapshotOf(current);
    await tx.service.update({ where: { id: current.id }, data: serviceData(snapshot, includeCost ? snapshot.standardCost : amount(current.standardCost)) });
    await replaceVariations(tx, current.id, snapshot.variations);
    await tx.auditLog.create({
      data: { userId: user.id, action: "SERVICE_UPDATED", entityType: "Service", entityId: current.id, details: { changes: serviceChanges(before, snapshot) } },
    });
  });
}

async function changeStatus(user: SessionUser, serviceId: string, action: "ARQUIVAR" | "DESARQUIVAR") {
  assertManager(user);
  const next = action === "ARQUIVAR" ? "ARQUIVADO" : "ATIVO";
  await prisma.$transaction(async (tx) => {
    const current = await tx.service.findUnique({ where: { id: serviceId }, include: serviceInclude });
    if (!current) throw new CrmFlowError("Serviço não encontrado.");
    if (current.status === next) return;
    if (next === "ATIVO") await assertActiveName(tx, current.name, current.id);
    await tx.service.update({ where: { id: current.id }, data: { status: next } });
    await tx.auditLog.create({ data: { userId: user.id, action: next === "ARQUIVADO" ? "SERVICE_ARCHIVED" : "SERVICE_RESTORED", entityType: "Service", entityId: current.id, details: { name: current.name } } });
  });
}

export const archiveService = (user: SessionUser, id: string) => changeStatus(user, id, "ARQUIVAR");
export const restoreService = (user: SessionUser, id: string) => changeStatus(user, id, "DESARQUIVAR");

export async function removeService(user: SessionUser, serviceId: string) {
  assertManager(user);
  await prisma.$transaction(async (tx) => {
    const current = await tx.service.findUnique({ where: { id: serviceId }, include: serviceInclude });
    if (!current) throw new CrmFlowError("Serviço não encontrado.");
    await assertUnused(tx, current.id);
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
