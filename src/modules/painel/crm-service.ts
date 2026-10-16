import { z } from "zod";
import { Prisma } from "@prisma/client";
import type { SessionUser } from "@/lib/auth";
import { stages } from "@/lib/data";
import { STAGE_VALUES } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { publishSaleClosed } from "@/lib/integration-feed";
import { CrmFlowError, productionSubmissionSchema, sendToProduction } from "@/modules/crm/send-to-production";

const customer = z.object({
  id: z.string().max(80), kind: z.enum(["LEAD", "CLIENTE"]).default("LEAD"), name: z.string().trim().min(2).max(200), phone: z.string().trim().max(40),
  email: z.string().trim().email().or(z.literal("")), origin: z.string().trim().max(80),
  company: z.string().trim().max(200), service: z.string().trim().max(200), notes: z.string().trim().max(10000),
});
export const crmCommandSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("createCustomer"), customer, value: z.number().finite().min(0).max(9999999999).nullable() }),
  z.object({ kind: z.literal("updateCustomer"), customer }),
  z.object({ kind: z.literal("createOpportunity"), customerId: z.string().min(1).max(80), service: z.string().trim().min(2).max(200) }),
  z.object({ kind: z.literal("move"), id: z.string().min(1).max(80), stage: z.enum([stages[0], ...stages.slice(1)]) }),
  z.object({ kind: z.literal("value"), id: z.string().min(1).max(80), value: z.number().finite().min(0).max(9999999999).nullable() }),
  z.object({ kind: z.literal("lose"), id: z.string().min(1).max(80), reason: z.string().trim().min(3).max(1000) }),
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
      if (!await tx.customer.findUnique({ where: { id: input.customerId } })) throw new CrmFlowError("Contato não encontrado.");
      const opportunity = await tx.opportunity.create({ data: { customerId: input.customerId, service: input.service, responsibleId: user.id, stage: "LEAD" } });
      await tx.auditLog.create({ data: { userId: user.id, action: "OPPORTUNITY_CREATED", entityType: "Opportunity", entityId: opportunity.id } });
      return;
    }
    if (input.kind === "createCustomer" || input.kind === "updateCustomer") {
      const c = input.customer;
      const data = { name: c.name, phone: c.phone || null, email: c.email || null, origin: c.origin || null, company: c.company || null, notes: c.notes || null };
      const row = input.kind === "createCustomer" ? await tx.customer.create({ data: { ...data, kind: c.kind } }) : await tx.customer.update({ where: { id: c.id }, data });
      if (input.kind === "createCustomer" && c.kind === "LEAD") await tx.opportunity.create({
        data: { customerId: row.id, responsibleId: user.id, service: c.service || "Serviço a definir", stage: "LEAD", estimatedValue: input.value },
      });
      await tx.auditLog.create({ data: { userId: user.id, action: input.kind === "createCustomer" ? "CUSTOMER_CREATED" : "CUSTOMER_UPDATED", entityType: "Customer", entityId: row.id } });
      return;
    }
    await tx.$queryRaw`SELECT "id" FROM "Opportunity" WHERE "id" = ${input.id} FOR UPDATE`;
    const current = await tx.opportunity.findUnique({ where: { id: input.id }, include: { customer: { select: { name: true } }, sale: { select: { demand: { select: { id: true } } } } } });
    if (!current) throw new CrmFlowError("Oportunidade não encontrada. Atualize o CRM.");
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
    if (input.kind === "move" || input.kind === "lose") {
      if (current.sale?.demand) throw new CrmFlowError("Esta venda já foi enviada para produção e permanece fechada.");
      if (input.kind === "move" && input.stage === "Fechado sem sucesso") throw new CrmFlowError("Informe o motivo do fechamento sem sucesso.");
      const lost = input.kind === "lose";
      const stage = lost ? "PERDIDO" : STAGE_VALUES[input.stage];
      const terminal = stage === "FECHADO" || stage === "PERDIDO";
      if (stage === "FECHADO") await tx.customer.update({ where: { id: current.customerId }, data: { kind: "CLIENTE" } });
      await tx.opportunity.update({ where: { id: current.id }, data: {
        stage, outcome: lost ? "PERDIDA" : stage === "FECHADO" ? "GANHA" : "ABERTA", lastActivityAt: new Date(),
        ...(terminal ? { waitingOn: "NINGUEM", waitingSince: null, nextActionAt: null } : {}),
        ...(lost ? { lossReason: input.reason, lostAt: new Date() } : { lossReason: null, lostAt: null }),
      } });
      const summary = lost ? `Fechado sem sucesso: ${input.reason}` : `Etapa alterada para ${input.stage}.`;
      await tx.crmInteraction.create({ data: { opportunityId: current.id, userId: user.id, channel: "Sistema", summary, occurredAt: new Date() } });
      if (terminal) await tx.scheduleEvent.updateMany({ where: { opportunityId: current.id, demandId: null, status: "PENDENTE" }, data: { status: "CANCELADO" } });
      await tx.auditLog.create({ data: { userId: user.id, action: lost ? "OPPORTUNITY_LOST" : "OPPORTUNITY_MOVED", entityType: "Opportunity", entityId: current.id, details: { stage } } });
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
