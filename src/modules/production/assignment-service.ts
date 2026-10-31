import type { Prisma } from "@prisma/client";
import type { SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CrmFlowError } from "@/modules/crm/send-to-production";

type AssignmentTx = Prisma.TransactionClient;

async function writeAssignment(tx: AssignmentTx, user: SessionUser, item: { id: string; title: string; demandId: string }, editor: { id: string; name: string }, editorDueAt: Date, reviewDueAt: Date | null, notify: boolean) {
  await tx.deliverable.update({ where: { id: item.id }, data: { editorId: editor.id, editorDueAt, reviewDueAt } });
  for (const event of [
    { type: "ENTREGA_EDITOR" as const, dueAt: editorDueAt, userId: editor.id, title: `${item.title} — entrega da edição` },
    { type: "REVISAO_GARRO" as const, dueAt: reviewDueAt, userId: user.id, title: `${item.title} — revisão Garro` },
  ]) {
    const existing = await tx.scheduleEvent.findFirst({ where: { deliverableId: item.id, type: event.type, status: "PENDENTE" } });
    if (!event.dueAt) {
      if (existing) await tx.scheduleEvent.update({ where: { id: existing.id }, data: { status: "CANCELADO" } });
    } else if (existing) await tx.scheduleEvent.update({ where: { id: existing.id }, data: { ...event, dueAt: event.dueAt } });
    else await tx.scheduleEvent.create({ data: { ...event, dueAt: event.dueAt, deliverableId: item.id, demandId: item.demandId } });
  }
  const demand = await tx.demand.findUnique({ where: { id: item.demandId }, select: { status: true } });
  if (demand?.status === "NOVA" || demand?.status === "PLANEJAMENTO") await tx.demand.update({ where: { id: item.demandId }, data: { status: "AGUARDANDO_EDITOR" } });
  if (notify) {
    await tx.demandMessage.create({ data: { demandId: item.demandId, senderId: user.id, system: true, content: `${editor.name} ficou responsável por ${item.title}.` } });
    await tx.notification.create({ data: { userId: editor.id, type: "ATRIBUICAO", title: "Novo trabalho de edição", message: item.title, href: `/painel/demanda?id=${item.demandId}` } });
  }
  await tx.auditLog.create({ data: { userId: user.id, action: "DELIVERABLE_ASSIGNED", entityType: "Deliverable", entityId: item.id, details: { editorId: editor.id } } });
}

export async function assignProductionEditor(user: SessionUser, input: {
  deliverableId: string; editorId: string; editorDueAt: Date | null; reviewDueAt: Date | null;
}) {
  if (user.role !== "GESTOR_GARRO") throw new CrmFlowError("Somente a Gestora pode atribuir entregáveis.");
  if (!input.editorDueAt || Number.isNaN(input.editorDueAt.getTime())) throw new CrmFlowError("Informe o dia do prazo de edição.");
  const editorDueAt = input.editorDueAt;
  await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "Deliverable" WHERE "id" = ${input.deliverableId} FOR UPDATE`;
    const item = await tx.deliverable.findUnique({ where: { id: input.deliverableId } });
    const editor = await tx.user.findFirst({ where: { id: input.editorId, role: { in: ["EDITOR", "GESTOR_GARRO"] }, active: true } });
    if (!item || !editor) throw new CrmFlowError("Escolha um editor ativo ou a própria Gestora.");
    if (item.archivedAt) throw new CrmFlowError("Este entregável está arquivado.");
    await writeAssignment(tx, user, item, editor, editorDueAt, input.reviewDueAt, true);
  }, { maxWait: 10000, timeout: 15000 });
}

export async function assignManyDeliverables(user: SessionUser, input: {
  demandId: string; deliverableIds: string[]; editorId: string; editorDueAt: Date | null; reviewDueAt: Date | null;
}) {
  if (user.role !== "GESTOR_GARRO") throw new CrmFlowError("Somente a Gestora pode atribuir entregáveis.");
  const ids = [...new Set(input.deliverableIds)];
  if (!ids.length) throw new CrmFlowError("Selecione ao menos um entregável.");
  if (!input.editorDueAt || Number.isNaN(input.editorDueAt.getTime())) throw new CrmFlowError("Informe o dia do prazo de edição.");
  const editorDueAt = input.editorDueAt;
  await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "Demand" WHERE "id" = ${input.demandId} FOR UPDATE`;
    const editor = await tx.user.findFirst({ where: { id: input.editorId, role: { in: ["EDITOR", "GESTOR_GARRO"] }, active: true } });
    const items = await tx.deliverable.findMany({ where: { id: { in: ids }, demandId: input.demandId }, select: { id: true, title: true, demandId: true, archivedAt: true } });
    if (!editor || items.length !== ids.length) throw new CrmFlowError("Escolha entregáveis deste projeto e um editor ativo.");
    if (items.some((item) => item.archivedAt)) throw new CrmFlowError("Este entregável está arquivado.");
    for (const item of items) await writeAssignment(tx, user, item, editor, editorDueAt, input.reviewDueAt, false);
    await tx.demandMessage.create({ data: { demandId: input.demandId, senderId: user.id, system: true, content: `${editor.name} ficou responsável por ${items.length} entregáveis.` } });
    await tx.notification.create({ data: { userId: editor.id, type: "ATRIBUICAO", title: "Novos trabalhos de edição", message: `${items.length} entregáveis no mesmo projeto`, href: `/painel/demanda?id=${input.demandId}` } });
  }, { maxWait: 10000, timeout: 20000 });
}
