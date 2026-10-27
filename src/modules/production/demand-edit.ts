import { z } from "zod";
import type { DemandStatus } from "@prisma/client";
import type { SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CrmFlowError } from "@/modules/crm/send-to-production";

const id = z.string().min(1).max(80);
const link = z.string().trim().max(2000).refine(value => value === "" || /^https?:\/\/\S+$/i.test(value), "Informe um link completo ou deixe em branco.");

export const updateDemandSchema = z.object({
  id,
  title: z.string().trim().min(2, "Informe o nome da demanda.").max(200),
  description: z.string().trim().max(10000),
  due: z.string().datetime({ offset: true }).or(z.literal("")),
  links: link,
});
export const addDeliverableSchema = z.object({
  demandId: id,
  title: z.string().trim().min(1, "Informe o nome do entregável.").max(200),
});
export const renameDeliverableSchema = z.object({
  id,
  title: z.string().trim().min(1, "Informe o nome do entregável.").max(200),
});

function assertManager(user: SessionUser) {
  if (user.role !== "GESTOR_GARRO") throw new CrmFlowError("Somente a Gestora pode editar a demanda.");
}

const closedStages = new Set<DemandStatus>(["PRONTO_ENTREGA", "ENTREGUE", "CONCLUIDO"]);

export async function updateDemandDetails(user: SessionUser, raw: unknown) {
  assertManager(user);
  const parsed = updateDemandSchema.safeParse(raw);
  if (!parsed.success) throw new CrmFlowError(parsed.error.issues[0].message);
  const input = parsed.data;
  const due = input.due ? new Date(input.due) : null;
  await prisma.$transaction(async tx => {
    const demand = await tx.demand.findUnique({ where: { id: input.id }, select: { id: true, status: true } });
    if (!demand) throw new CrmFlowError("Demanda não encontrada.");
    await tx.demand.update({ where: { id: demand.id }, data: { title: input.title, description: input.description, clientDueAt: due } });
    if (due) {
      await tx.scheduleEvent.updateMany({
        where: { demandId: demand.id, type: "ENTREGA_CLIENTE", status: "PENDENTE" },
        data: { dueAt: due },
      });
    }
    const files = await tx.demandFile.findMany({ where: { demandId: demand.id }, select: { id: true, storagePath: true } });
    const urls = files.filter(file => /^https?:\/\//i.test(file.storagePath));
    if (input.links) {
      if (urls[0]) await tx.demandFile.update({ where: { id: urls[0].id }, data: { storagePath: input.links, fileName: "Referência" } });
      else await tx.demandFile.create({ data: { demandId: demand.id, fileName: "Referência", storagePath: input.links, uploadedById: user.id } });
    } else if (urls.length) {
      await tx.demandFile.deleteMany({ where: { id: { in: urls.map(file => file.id) } } });
    }
    await tx.auditLog.create({
      data: { userId: user.id, action: "DEMAND_UPDATED", entityType: "Demand", entityId: demand.id, details: { status: demand.status } },
    });
  });
}

export async function addDeliverable(user: SessionUser, raw: unknown) {
  assertManager(user);
  const parsed = addDeliverableSchema.safeParse(raw);
  if (!parsed.success) throw new CrmFlowError(parsed.error.issues[0].message);
  const input = parsed.data;
  await prisma.$transaction(async tx => {
    const demand = await tx.demand.findUnique({ where: { id: input.demandId }, select: { id: true, status: true, clientDueAt: true } });
    if (!demand) throw new CrmFlowError("Demanda não encontrada.");
    const created = await tx.deliverable.create({
      data: { demandId: demand.id, title: input.title, status: "AGUARDANDO_EDITOR", clientDueAt: demand.clientDueAt },
    });
    if (closedStages.has(demand.status)) {
      await tx.demand.update({ where: { id: demand.id }, data: { status: "AGUARDANDO_EDITOR" } });
    }
    await tx.auditLog.create({
      data: { userId: user.id, action: "DELIVERABLE_ADDED", entityType: "Deliverable", entityId: created.id, details: { demandId: demand.id } },
    });
  });
}

export async function renameDeliverable(user: SessionUser, raw: unknown) {
  assertManager(user);
  const parsed = renameDeliverableSchema.safeParse(raw);
  if (!parsed.success) throw new CrmFlowError(parsed.error.issues[0].message);
  const input = parsed.data;
  await prisma.$transaction(async tx => {
    const item = await tx.deliverable.findUnique({ where: { id: input.id }, select: { id: true, demandId: true, status: true } });
    if (!item) throw new CrmFlowError("Entregável não encontrado.");
    await tx.deliverable.update({ where: { id: item.id }, data: { title: input.title } });
    await tx.auditLog.create({
      data: { userId: user.id, action: "DELIVERABLE_RENAMED", entityType: "Deliverable", entityId: item.id, details: { demandId: item.demandId, status: item.status } },
    });
  });
}
