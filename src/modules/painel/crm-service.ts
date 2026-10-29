import { z } from "zod";
import { Prisma } from "@prisma/client";
import type { SessionUser } from "@/lib/auth";
import { stages } from "@/lib/data";
import { STAGE_VALUES } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { attendantOwnsCustomer, canAccessOpportunity } from "@/modules/crm/visibility";
import { publishSaleClosed } from "@/lib/integration-feed";
import { formatSaoPaulo } from "@/lib/deadlines";
import { readBirthDate } from "@/lib/birthdays";
import { FUTURE_CONTACT_ACTION, isContactDayAllowed } from "@/modules/crm/future-contact";
import { CrmFlowError, productionSubmissionSchema, sendToProduction } from "@/modules/crm/send-to-production";

const customer = z.object({
  id: z.string().max(80), kind: z.enum(["LEAD", "CLIENTE"]).default("LEAD"), name: z.string().trim().min(2).max(200), phone: z.string().trim().max(40),
  email: z.string().trim().email().or(z.literal("")), origin: z.string().trim().max(80),
  company: z.string().trim().max(200), service: z.string().trim().max(200), notes: z.string().trim().max(10000),
  birthDate: z.string().trim().max(10).optional().default(""),
});
export const crmCommandSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("createCustomer"), customer, value: z.number().finite().min(0).max(9999999999).nullable() }),
  z.object({ kind: z.literal("updateCustomer"), customer }),
  z.object({ kind: z.literal("createOpportunity"), customerId: z.string().min(1).max(80), service: z.string().trim().min(2).max(200) }),
  z.object({
    kind: z.literal("move"), id: z.string().min(1).max(80), stage: z.enum([stages[0], ...stages.slice(1)]),
    futureContact: z.enum(["sim", "nao"]).optional(),
    futureAt: z.string().datetime({ offset: true }).or(z.literal("")).optional(),
  }),
  z.object({
    kind: z.literal("futureContact"), id: z.string().min(1).max(80),
    futureContact: z.enum(["sim", "nao"]),
    futureAt: z.string().datetime({ offset: true }).or(z.literal("")),
    responsibleId: z.string().max(80).default(""),
    reason: z.string().trim().max(1000).default(""),
  }),
  z.object({ kind: z.literal("value"), id: z.string().min(1).max(80), value: z.number().finite().min(0).max(9999999999).nullable() }),
  z.object({
    kind: z.literal("lose"), id: z.string().min(1).max(80), reason: z.string().trim().min(3, "Informe o motivo.").max(1000),
    futureContact: z.enum(["sim", "nao"]),
    futureAt: z.string().datetime({ offset: true }).or(z.literal("")),
    responsibleId: z.string().max(80),
  }),
  z.object({
    kind: z.literal("kanbanLabels"),
    labels: z.array(z.object({ stage: z.enum([stages[0], ...stages.slice(1)]), label: z.string().trim().min(2, "Informe o nome da coluna.").max(40) })).length(stages.length),
  }),
  z.object({
    kind: z.literal("contact"), id: z.string().min(1).max(80), summary: z.string().trim().min(1).max(10000),
    waitingOn: z.enum(["cliente", "atendente", "nenhum"]), nextAction: z.string().trim().max(200),
    nextAt: z.string().datetime({ offset: true }).or(z.literal("")),
  }),
  z.object({ kind: z.literal("send"), submission: productionSubmissionSchema }),
]);
export type CrmCommand = z.infer<typeof crmCommandSchema>;

export async function executeCrmCommand(user: SessionUser, raw: unknown) {
  if (!can(user.role, "crm")) throw new CrmFlowError("Este perfil não pode alterar o CRM.");
  const parsed = crmCommandSchema.safeParse(raw);
  if (!parsed.success) throw new CrmFlowError(parsed.error.issues[0].message);
  const input = parsed.data;
  if (input.kind === "send") return sendToProduction(user, input.submission);
  let saleNotice: { opportunityId: string; customerName: string; serviceTitle: string; previousStage: string } | null = null;
  await prisma.$transaction(async tx => {
    if (input.kind === "createOpportunity") {
      const contact = await tx.customer.findUnique({ where: { id: input.customerId }, select: { createdById: true, opportunities: { select: { responsibleId: true } } } });
      if (!contact || !attendantOwnsCustomer(user, contact)) throw new CrmFlowError("Contato não encontrado.");
      const opportunity = await tx.opportunity.create({ data: { customerId: input.customerId, service: input.service, responsibleId: user.id, stage: "LEAD" } });
      await tx.auditLog.create({ data: { userId: user.id, action: "OPPORTUNITY_CREATED", entityType: "Opportunity", entityId: opportunity.id } });
      return;
    }
    if (input.kind === "createCustomer" || input.kind === "updateCustomer") {
      const c = input.customer;
      const birthDate = readBirthDate(c.birthDate || "");
      if ("error" in birthDate) throw new CrmFlowError(birthDate.error);
      const data = { name: c.name, phone: c.phone || null, email: c.email || null, origin: c.origin || null, company: c.company || null, notes: c.notes || null, birthDate: birthDate.date };
      if (input.kind === "updateCustomer") {
        const existing = await tx.customer.findUnique({ where: { id: c.id }, select: { createdById: true, opportunities: { select: { responsibleId: true } } } });
        if (!existing || !attendantOwnsCustomer(user, existing)) throw new CrmFlowError("Contato não encontrado.");
      }
      const row = input.kind === "createCustomer"
        ? await tx.customer.create({ data: { ...data, kind: c.kind, createdById: user.id } })
        : await tx.customer.update({ where: { id: c.id }, data });
      if (input.kind === "createCustomer" && c.kind === "LEAD") await tx.opportunity.create({
        data: { customerId: row.id, responsibleId: user.id, service: c.service || "Serviço a definir", stage: "LEAD", estimatedValue: input.value },
      });
      await tx.auditLog.create({ data: { userId: user.id, action: input.kind === "createCustomer" ? "CUSTOMER_CREATED" : "CUSTOMER_UPDATED", entityType: "Customer", entityId: row.id } });
      return;
    }
    if (input.kind === "kanbanLabels") {
      if (user.role !== "GESTOR_GARRO") throw new CrmFlowError("Somente a Gestora pode editar os nomes do kanban.");
      const keys = new Set(input.labels.map(item => item.stage));
      if (keys.size !== stages.length) throw new CrmFlowError("Informe o nome de todas as colunas.");
      const names = new Set<string>();
      for (const item of input.labels) {
        const key = item.label.trim().toLocaleLowerCase("pt-BR");
        if (names.has(key)) throw new CrmFlowError("Cada coluna precisa de um nome diferente.");
        names.add(key);
        await tx.kanbanLabel.upsert({ where: { stage: item.stage }, create: { stage: item.stage, label: item.label.trim() }, update: { label: item.label.trim() } });
      }
      await tx.auditLog.create({ data: { userId: user.id, action: "KANBAN_LABELS_UPDATED", entityType: "KanbanLabel", entityId: "kanban" } });
      return;
    }
    await tx.$queryRaw`SELECT "id" FROM "Opportunity" WHERE "id" = ${input.id} FOR UPDATE`;
    const current = await tx.opportunity.findUnique({ where: { id: input.id }, include: { customer: { select: { name: true } }, sale: { select: { demand: { select: { id: true } } } } } });
    if (!current || !canAccessOpportunity(user, current.responsibleId)) throw new CrmFlowError("Oportunidade não encontrada. Atualize o CRM.");
    if (input.kind === "value") {
      if (current.sale?.demand || current.closedValue !== null) throw new CrmFlowError("O valor fechado não pode ser alterado depois do envio para produção.");
      const previous = current.proposalValue ?? current.estimatedValue;
      const amount = input.value === null ? null : new Prisma.Decimal(input.value);
      await tx.opportunity.update({ where: { id: current.id }, data: {
        proposalValue: amount,
        ...(amount === null ? { estimatedValue: null } : {}),
        lastActivityAt: new Date(),
      } });
      await tx.crmInteraction.create({ data: {
        opportunityId: current.id, userId: user.id, channel: "Sistema",
        summary: amount === null
          ? `Valor da oportunidade removido (anterior: ${previous?.toString() ?? "não definido"}).`
          : `Valor da oportunidade atualizado de ${previous?.toString() ?? "não definido"} para ${amount.toString()}.`,
        occurredAt: new Date(),
      } });
      await tx.auditLog.create({ data: {
        userId: user.id, action: "OPPORTUNITY_VALUE_UPDATED", entityType: "Opportunity", entityId: current.id,
        details: { previousValue: previous?.toString() ?? null, newValue: amount?.toString() ?? null },
      } });
      return;
    }
    if (input.kind === "futureContact") {
      if (current.sale?.demand) throw new CrmFlowError("Esta venda já foi enviada para produção e permanece fechada.");
      if (current.stage !== "SEM_INTERESSE" && current.stage !== "PERDIDO") throw new CrmFlowError("O retorno só pode ser editado em Sem interesse ou Fechado sem sucesso.");
      if (current.stage === "PERDIDO") {
        if (input.reason.trim().length < 3) throw new CrmFlowError("Informe o motivo do fechamento sem sucesso.");
        await tx.opportunity.update({ where: { id: current.id }, data: { lossReason: input.reason.trim() } });
      }
      const summary = await saveFutureContact(tx, current, input.futureContact, input.futureAt, input.responsibleId || current.responsibleId);
      await tx.crmInteraction.create({ data: { opportunityId: current.id, userId: user.id, channel: "Sistema", summary, occurredAt: new Date() } });
      await tx.auditLog.create({ data: { userId: user.id, action: "FUTURE_CONTACT_UPDATED", entityType: "Opportunity", entityId: current.id } });
      return;
    }
    if (input.kind === "move" || input.kind === "lose") {
      if (current.sale?.demand) throw new CrmFlowError("Esta venda já foi enviada para produção e permanece fechada.");
      if (input.kind === "move" && input.stage === "Fechado sem sucesso") throw new CrmFlowError("Informe o motivo, o retorno e o responsável.");
      if (input.kind === "move" && input.stage === "Sem interesse" && !input.futureContact) throw new CrmFlowError("Informe se deverá entrar em contato no futuro.");
      const lost = input.kind === "lose";
      const stage = lost ? "PERDIDO" : STAGE_VALUES[input.stage];
      const terminal = stage === "FECHADO" || stage === "PERDIDO";
      if (stage === "FECHADO") await tx.customer.update({ where: { id: current.customerId }, data: { kind: "CLIENTE" } });
      await tx.opportunity.update({ where: { id: current.id }, data: {
        stage, outcome: lost ? "PERDIDA" : stage === "FECHADO" ? "GANHA" : "ABERTA", lastActivityAt: new Date(),
        ...(terminal ? { waitingOn: "NINGUEM", waitingSince: null, nextActionAt: null } : {}),
        ...(lost ? { lossReason: input.reason, lostAt: new Date() } : { lossReason: null, lostAt: null }),
      } });
      let summary = `Etapa alterada para ${input.kind === "move" ? input.stage : "Fechado sem sucesso"}.`;
      if (lost) summary = `Fechado sem sucesso: ${input.reason}. ${await saveFutureContact(tx, current, input.futureContact, input.futureAt, input.responsibleId)}`;
      else if (input.stage === "Sem interesse") summary = `Sem interesse. ${await saveFutureContact(tx, current, input.futureContact || "nao", input.futureAt || "", current.responsibleId)}`;
      else {
        await clearFutureContact(tx, current.id);
        if (current.nextAction === FUTURE_CONTACT_ACTION) await tx.opportunity.update({ where: { id: current.id }, data: { nextAction: null, nextActionAt: null } });
      }
      await tx.crmInteraction.create({ data: { opportunityId: current.id, userId: user.id, channel: "Sistema", summary, occurredAt: new Date() } });
      if (terminal) await tx.scheduleEvent.updateMany({ where: { opportunityId: current.id, demandId: null, status: "PENDENTE", type: { not: "CONTATO_FUTURO" } }, data: { status: "CANCELADO" } });
      await tx.auditLog.create({ data: { userId: user.id, action: lost ? "OPPORTUNITY_LOST" : "OPPORTUNITY_MOVED", entityType: "Opportunity", entityId: current.id, details: { stage, from: current.stage } } });
      if (stage === "FECHADO" && current.stage !== "FECHADO") saleNotice = {
        opportunityId: current.id, customerName: current.customer.name, serviceTitle: current.service, previousStage: current.stage,
      };
      return;
    }
    await tx.crmInteraction.create({ data: { opportunityId: current.id, userId: user.id, channel: "Manual", summary: input.summary, occurredAt: new Date() } });
    await tx.opportunity.update({ where: { id: current.id }, data: {
      lastContactAt: new Date(), lastActivityAt: new Date(), waitingOn: input.waitingOn === "cliente" ? "CLIENTE" : input.waitingOn === "atendente" ? "GARRO" : "NINGUEM",
      waitingSince: input.waitingOn === "nenhum" ? null : new Date(), nextAction: input.nextAction || null, nextActionAt: input.nextAt ? new Date(input.nextAt) : null,
    } });
    if (input.nextAt) await tx.scheduleEvent.create({ data: {
      userId: user.id, opportunityId: current.id, title: `${input.nextAction || "Retornar contato"} — ${current.customer.name}`,
      type: "FOLLOW_UP", dueAt: new Date(input.nextAt),
    } });
    await tx.auditLog.create({ data: { userId: user.id, action: "CRM_INTERACTION", entityType: "Opportunity", entityId: current.id } });
  });
  if (saleNotice) await publishSaleClosed(saleNotice);
}

type ContactCard = { id: string; responsibleId: string; customer: { name: string } };

async function clearFutureContact(tx: Prisma.TransactionClient, opportunityId: string) {
  await tx.scheduleEvent.updateMany({ where: { opportunityId, type: "CONTATO_FUTURO", status: "PENDENTE" }, data: { status: "CANCELADO" } });
  await tx.notification.deleteMany({ where: { type: "CONTATO_FUTURO", href: { endsWith: `o=${opportunityId}` }, readAt: null } });
}

async function assertReturnResponsible(tx: Prisma.TransactionClient, cardOwnerId: string, responsibleId: string) {
  if (responsibleId === cardOwnerId) return;
  const manager = await tx.user.findFirst({ where: { id: responsibleId, active: true, role: "GESTOR_GARRO" }, select: { id: true } });
  if (!manager) throw new CrmFlowError("Escolha a atendente deste atendimento ou a Gestora como responsável.");
}

async function saveFutureContact(tx: Prisma.TransactionClient, current: ContactCard, choice: "sim" | "nao", futureAt: string, responsibleId: string) {
  if (choice === "nao") {
    await clearFutureContact(tx, current.id);
    await tx.opportunity.update({ where: { id: current.id }, data: { nextAction: null, nextActionAt: null } });
    return "Sem contato futuro.";
  }
  const date = new Date(futureAt);
  if (!futureAt || Number.isNaN(date.getTime()) || !isContactDayAllowed(date)) throw new CrmFlowError("Informe uma data de retorno a partir de hoje.");
  const ownerId = responsibleId || current.responsibleId;
  await assertReturnResponsible(tx, current.responsibleId, ownerId);
  await clearFutureContact(tx, current.id);
  await tx.opportunity.update({ where: { id: current.id }, data: { nextAction: FUTURE_CONTACT_ACTION, nextActionAt: date } });
  await tx.scheduleEvent.create({ data: {
    userId: ownerId, opportunityId: current.id, type: "CONTATO_FUTURO", title: `Contato futuro — ${current.customer.name}`, dueAt: date,
  } });
  const managers = await tx.user.findMany({ where: { role: "GESTOR_GARRO", active: true }, select: { id: true } });
  const recipients = new Map<string, string>();
  const link = (id: string) => managers.some(manager => manager.id === id) ? `/painel/crm?o=${current.id}` : `/painel?o=${current.id}`;
  recipients.set(ownerId, link(ownerId));
  recipients.set(current.responsibleId, link(current.responsibleId));
  for (const manager of managers) recipients.set(manager.id, `/painel/crm?o=${current.id}`);
  await tx.notification.createMany({ data: [...recipients.entries()].map(([userId, href]) => ({
    userId, type: "CONTATO_FUTURO", title: "Contato futuro", message: current.customer.name, href, visibleAt: date,
  })) });
  return `Contato futuro em ${formatSaoPaulo(date)}.`;
}
