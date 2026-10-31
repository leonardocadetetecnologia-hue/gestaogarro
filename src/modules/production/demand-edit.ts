import { z } from "zod";
import type { DemandStatus, Prisma } from "@prisma/client";
import type { SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CrmFlowError } from "@/modules/crm/send-to-production";
import { demandMediaTypeSchema } from "@/lib/demand-media-type";
import { normalizeWebLink, prepareDeliveryLinks } from "@/modules/production/delivery-links";

const id = z.string().min(1).max(80);
const link = z.string().trim().max(2000).refine(value => value === "" || /^https?:\/\/\S+$/i.test(value), "Informe um link completo ou deixe em branco.");

export const updateDemandSchema = z.object({
  id,
  title: z.string().trim().min(2, "Informe o nome da demanda.").max(200),
  description: z.string().trim().max(10000),
  due: z.string().datetime({ offset: true }).or(z.literal("")),
  links: link,
  mediaType: demandMediaTypeSchema.or(z.literal("")).optional(),
});
export const addDeliverableSchema = z.object({
  demandId: id,
  title: z.string().trim().min(1, "Informe o nome do entregável.").max(200),
});
export const demandMediaSchema = z.object({
  id,
  hd: z.string().trim().max(200, "O HD pode ter no máximo 200 caracteres."),
  drive: link,
});
export const renameDeliverableSchema = z.object({
  id,
  title: z.string().trim().min(1, "Informe o nome do entregável.").max(200),
});
const httpAddress = z.string().max(2000).refine(value => /^https?:\/\/\S+$/i.test(value), "Informe um endereço http ou https.");
export const deliveryLinksSchema = z.object({
  id,
  links: z.array(httpAddress).max(30, "São permitidos até 30 links de entrega."),
});
export const deliveryLinksInputSchema = z.object({
  id,
  links: z.array(z.string().max(2000)).max(30, "São permitidos até 30 links de entrega."),
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
    await tx.demand.update({
      where: { id: demand.id },
      data: {
        title: input.title,
        description: input.description,
        clientDueAt: due,
        clientDueManual: Boolean(due),
        clientDuePaused: false,
        ...(input.mediaType ? { mediaType: input.mediaType } : {}),
      },
    });
    if (due) {
      await tx.scheduleEvent.updateMany({
        where: { demandId: demand.id, type: "ENTREGA_CLIENTE", status: "PENDENTE" },
        data: { dueAt: due },
      });
      await tx.deliverable.updateMany({ where: { demandId: demand.id }, data: { clientDueAt: due } });
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

function withDriveProtocol(raw: unknown) {
  if (!raw || typeof raw !== "object" || !("drive" in raw)) return raw;
  return { ...raw, drive: normalizeWebLink(String(raw.drive ?? "")) };
}

function withDeliveryProtocols(raw: unknown) {
  if (!raw || typeof raw !== "object" || !("links" in raw)) return raw;
  return { ...raw, links: prepareDeliveryLinks(raw.links) };
}

export async function saveDemandMedia(user: SessionUser, raw: unknown) {
  assertManager(user);
  const parsed = demandMediaSchema.safeParse(withDriveProtocol(raw));
  if (!parsed.success) throw new CrmFlowError(parsed.error.issues[0].message);
  const input = parsed.data;
  await prisma.$transaction(async tx => {
    const demand = await tx.demand.findUnique({ where: { id: input.id }, select: { id: true } });
    if (!demand) throw new CrmFlowError("Demanda não encontrada.");
    await tx.demand.update({ where: { id: demand.id }, data: { hd: input.hd || null, driveUrl: input.drive || null } });
    await tx.auditLog.create({ data: { userId: user.id, action: "DEMAND_MEDIA", entityType: "Demand", entityId: demand.id } });
  });
}

export async function saveDeliveryLinks(user: SessionUser, raw: unknown) {
  assertManager(user);
  const parsed = deliveryLinksSchema.safeParse(withDeliveryProtocols(raw));
  if (!parsed.success) throw new CrmFlowError(parsed.error.issues[0].message);
  const input = parsed.data;
  await prisma.$transaction(async tx => {
    const demand = await tx.demand.findUnique({ where: { id: input.id }, select: { id: true } });
    if (!demand) throw new CrmFlowError("Demanda não encontrada.");
    await tx.demand.update({
      where: { id: demand.id },
      data: { deliveryLinks: input.links as Prisma.InputJsonValue },
    });
    await tx.auditLog.create({
      data: { userId: user.id, action: "DEMAND_DELIVERY_LINKS", entityType: "Demand", entityId: demand.id, details: { count: input.links.length } },
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
