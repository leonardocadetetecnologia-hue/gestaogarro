import type { Prisma } from "@prisma/client";
import type { SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CrmFlowError } from "@/modules/crm/send-to-production";
import { syncDemandStatus } from "./demand-status";

const ASSIGNMENT_EVENTS = ["ENTREGA_EDITOR", "REVISAO_GARRO"] as const;

function assertManager(user: SessionUser) {
  if (user.role !== "GESTOR_GARRO") throw new CrmFlowError("Somente a Gestora pode arquivar ou restaurar um entregável.");
}

async function reopenAssignmentEvents(tx: Prisma.TransactionClient, deliverableId: string) {
  for (const type of ASSIGNMENT_EVENTS) {
    const pending = await tx.scheduleEvent.findFirst({ where: { deliverableId, type, status: "PENDENTE" } });
    if (pending) continue;
    const cancelled = await tx.scheduleEvent.findFirst({
      where: { deliverableId, type, status: "CANCELADO" },
      orderBy: { createdAt: "desc" },
    });
    if (cancelled) await tx.scheduleEvent.update({ where: { id: cancelled.id }, data: { status: "PENDENTE", completedAt: null } });
  }
}

async function reopenClientDelivery(tx: Prisma.TransactionClient, demandId: string, status: string) {
  if (status === "ENTREGUE" || status === "CONCLUIDO") return;
  await tx.scheduleEvent.updateMany({
    where: { demandId, type: "ENTREGA_CLIENTE", status: "CONCLUIDO" },
    data: { status: "PENDENTE", completedAt: null },
  });
}

export async function archiveDeliverable(user: SessionUser, id: string) {
  assertManager(user);
  await prisma.$transaction(async (tx) => {
    const item = await tx.deliverable.findUnique({ where: { id } });
    if (!item) throw new CrmFlowError("Entregável não encontrado.");
    if (item.archivedAt) return;
    await tx.deliverable.update({ where: { id: item.id }, data: { archivedAt: new Date() } });
    await tx.scheduleEvent.updateMany({
      where: { deliverableId: item.id, status: "PENDENTE" },
      data: { status: "CANCELADO" },
    });
    await tx.demandMessage.create({
      data: { demandId: item.demandId, senderId: user.id, system: true, content: `${item.title} foi arquivado e saiu da esteira.` },
    });
    await tx.auditLog.create({
      data: { userId: user.id, action: "DELIVERABLE_ARCHIVED", entityType: "Deliverable", entityId: item.id },
    });
    const status = await syncDemandStatus(tx, item.demandId);
    await reopenClientDelivery(tx, item.demandId, status);
    if (item.editorId && item.editorId !== user.id) {
      await tx.notification.create({
        data: {
          userId: item.editorId, type: "ARQUIVADO", title: "Entregável arquivado", message: item.title,
          href: `/painel/demanda?id=${item.demandId}`,
        },
      });
    }
  });
}

export async function restoreDeliverable(user: SessionUser, id: string) {
  assertManager(user);
  await prisma.$transaction(async (tx) => {
    const item = await tx.deliverable.findUnique({ where: { id } });
    if (!item) throw new CrmFlowError("Entregável não encontrado.");
    if (!item.archivedAt) return;
    await tx.deliverable.update({ where: { id: item.id }, data: { archivedAt: null } });
    await reopenAssignmentEvents(tx, item.id);
    await tx.demandMessage.create({
      data: { demandId: item.demandId, senderId: user.id, system: true, content: `${item.title} voltou para a esteira.` },
    });
    await tx.auditLog.create({
      data: { userId: user.id, action: "DELIVERABLE_RESTORED", entityType: "Deliverable", entityId: item.id },
    });
    await syncDemandStatus(tx, item.demandId);
  });
}
