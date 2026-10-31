import { Prisma } from "@prisma/client";
import { z } from "zod";
import type { SessionUser } from "@/lib/auth";
import { demandMediaTypeSchema } from "@/lib/demand-media-type";
import { publishProductionRequested } from "@/lib/integration-feed";
import { can } from "@/lib/rbac";
import { addBusinessDays, dateKey, endOfSaoPauloDay } from "@/modules/agenda/business-days";
import { holidayKeys, syncServiceSchedule } from "@/modules/agenda/service-schedule";
import { canAccessOpportunity } from "@/modules/crm/visibility";
import { prisma } from "@/lib/prisma";

export class CrmFlowError extends Error {}

export const productionSubmissionSchema = z.object({
  opportunityId: z.string().min(1).max(80),
  title: z.string().trim().min(2, "Informe o serviço contratado.").max(200),
  mediaType: demandMediaTypeSchema,
  description: z.string().trim().min(3, "Informe o briefing da produção.").max(10000),
  amount: z.string().trim().regex(/^\d{1,10}([.,]\d{1,2})?$/, "Informe um valor com até duas casas decimais.")
    .refine(v => Number(v.replace(",", ".")) > 0, "O valor fechado deve ser maior que zero."),
  due: z.string().datetime({ offset: true, message: "Informe um prazo válido para o cliente." }),
  deliverables: z.array(z.string().trim().min(1).max(200)).min(1, "Informe ao menos um entregável.").max(50),
});
export type ProductionSubmission = z.infer<typeof productionSubmissionSchema>;

export async function sendToProduction(user: SessionUser, rawInput: unknown) {
  if (!can(user.role, "crm")) throw new CrmFlowError("Este perfil não pode enviar vendas para produção.");
  const parsed = productionSubmissionSchema.safeParse(rawInput);
  if (!parsed.success) throw new CrmFlowError(parsed.error.issues[0].message);
  const input = parsed.data;
  const amount = new Prisma.Decimal(input.amount.replace(",", "."));

  const result = await prisma.$transaction(async tx => {
    // A trava serializa dois envios da mesma oportunidade antes de ler/criar venda e demanda.
    await tx.$queryRaw`SELECT "id" FROM "Opportunity" WHERE "id" = ${input.opportunityId} FOR UPDATE`;
    const opportunity = await tx.opportunity.findUnique({
      where: { id: input.opportunityId },
      include: { sale: { include: { demand: true } }, customer: { select: { name: true } } },
    });
    if (!opportunity || !canAccessOpportunity(user, opportunity.responsibleId)) throw new CrmFlowError("Oportunidade não encontrada. Atualize o CRM.");
    if (opportunity.stage !== "CONTRATO" || opportunity.outcome === "PERDIDA") {
      throw new CrmFlowError("O envio para produção sai do estágio Contrato.");
    }
    if (opportunity.sale?.demand) return { demandId: opportunity.sale.demand.id, alreadySent: true as const };
    if (opportunity.sale && !opportunity.sale.value.equals(amount)) {
      throw new CrmFlowError("O valor informado deve corresponder ao valor da venda já registrada.");
    }
    const managers = await tx.user.findMany({
      where: { role: "GESTOR_GARRO", active: true }, select: { id: true },
    });
    const lines = await tx.contractLine.findMany({ where: { opportunityId: opportunity.id } });
    const holidays = await holidayKeys(tx);
    const deliveries = lines.flatMap(line => line.serviceDate && line.proposedDays != null ? [addBusinessDays(dateKey(line.serviceDate), line.proposedDays, holidays)] : []);
    const scheduledDue = deliveries.length ? endOfSaoPauloDay(deliveries.reduce((max, key) => key > max ? key : max, "")) : null;
    const due = scheduledDue || new Date(input.due);
    const sale = opportunity.sale || await tx.sale.create({
      data: {
        opportunityId: opportunity.id, customerId: opportunity.customerId,
        value: amount, closedAt: new Date(), clientDueAt: due, description: input.description,
      },
    });
    await tx.customer.update({ where: { id: opportunity.customerId }, data: { kind: "CLIENTE" } });
    await tx.opportunity.update({
      where: { id: opportunity.id },
      data: { service: input.title, outcome: "GANHA", closedValue: amount, waitingOn: "NINGUEM", waitingSince: null, nextActionAt: null, nextAction: null, lastActivityAt: new Date() },
    });
    const demand = await tx.demand.create({
      data: {
        saleId: sale.id, customerId: opportunity.customerId, title: input.title, mediaType: input.mediaType,
        description: input.description, clientDueAt: due, status: "NOVA",
        deliverables: { create: input.deliverables.map(title => ({ title, clientDueAt: due, status: "AGUARDANDO_EDITOR" })) },
        messages: { create: { senderId: user.id, content: "Venda enviada para produção pelo CRM.", system: true } },
        ...(scheduledDue ? {} : { events: { create: {
          userId: managers[0]?.id || user.id, opportunityId: opportunity.id,
          title: `Entrega ao cliente — ${opportunity.customer.name}`, type: "ENTREGA_CLIENTE" as const, dueAt: due,
        } } }),
      },
    });
    if (scheduledDue) await syncServiceSchedule(tx, {
      id: opportunity.id, responsibleId: opportunity.responsibleId, customerName: opportunity.customer.name, demandId: demand.id,
    }, lines);
    await tx.crmInteraction.create({
      data: {
        opportunityId: opportunity.id, userId: user.id, channel: "Sistema",
        summary: `Enviado para produção. Demanda ${demand.id}.`, occurredAt: new Date(),
      },
    });
    await tx.auditLog.create({
      data: { userId: user.id, action: "SALE_SENT_TO_PRODUCTION", entityType: "Opportunity", entityId: opportunity.id, details: { saleId: sale.id, demandId: demand.id, mediaType: input.mediaType } },
    });
    if (managers.length) await tx.notification.createMany({
      data: managers.map(manager => ({
        userId: manager.id, type: "NOVA_DEMANDA", title: "Nova demanda de produção",
        message: `${opportunity.customer.name} — ${input.title}`, href: `/painel/demanda?id=${demand.id}`,
      })),
    });
    return {
      demandId: demand.id, alreadySent: false as const, notice: {
        opportunityId: opportunity.id, saleId: sale.id, demandId: demand.id,
        customerName: opportunity.customer.name, serviceTitle: input.title, clientDueAt: due,
      },
    };
  }, { maxWait: 10000, timeout: 15000 });
  if (result.alreadySent) return { demandId: result.demandId, alreadySent: true };
  await publishProductionRequested(result.notice);
  return { demandId: result.demandId, alreadySent: false };
}
