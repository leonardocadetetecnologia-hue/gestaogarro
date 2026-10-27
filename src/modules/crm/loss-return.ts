import { prisma } from "@/lib/prisma";
import { FUTURE_CONTACT_ACTION } from "@/modules/crm/future-contact";

export async function returnDueLostOpportunities(now = new Date()) {
  const due = await prisma.opportunity.findMany({
    where: { stage: "PERDIDO", nextAction: FUTURE_CONTACT_ACTION, nextActionAt: { lte: now } },
    select: { id: true, responsibleId: true },
  });
  if (!due.length) return;
  await prisma.$transaction(async tx => {
    for (const row of due) {
      await tx.opportunity.update({ where: { id: row.id }, data: {
        stage: "LEAD", outcome: "ABERTA", lastActivityAt: now, waitingOn: "NINGUEM", waitingSince: null, nextAction: null, nextActionAt: null,
      } });
      await tx.crmInteraction.create({ data: {
        opportunityId: row.id, userId: row.responsibleId, channel: "Sistema",
        summary: "Prazo de retorno atingido. A oportunidade voltou para Lead para nova tentativa.",
        occurredAt: now,
      } });
      await tx.scheduleEvent.updateMany({
        where: { opportunityId: row.id, type: "CONTATO_FUTURO", status: "PENDENTE" },
        data: { status: "CONCLUIDO", completedAt: now },
      });
      await tx.auditLog.create({ data: {
        userId: row.responsibleId, action: "OPPORTUNITY_RETURNED_TO_LEAD", entityType: "Opportunity", entityId: row.id,
      } });
    }
  });
}
