import type { SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { applySelectionReturn } from "@/modules/agenda/service-schedule";
import { CrmFlowError } from "@/modules/crm/send-to-production";

const finished = new Set(["ENTREGUE", "CONCLUIDO"]);

async function selectableDemand(demandId: string) {
  const demand = await prisma.demand.findUnique({
    where: { id: demandId },
    select: {
      id: true, status: true, clientDuePaused: true,
      sale: { select: { opportunity: { select: { contractLines: { select: { serviceId: true, extra: true, proposedDays: true, serviceDate: true } } } } } },
    },
  });
  if (!demand) throw new CrmFlowError("Demanda não encontrada.");
  if (finished.has(demand.status)) throw new CrmFlowError("A entrega já foi registrada.");
  const lines = demand.sale?.opportunity.contractLines || [];
  const serviceIds = lines.flatMap(line => !line.extra && line.serviceId ? [line.serviceId] : []);
  const selectable = serviceIds.length
    ? await prisma.service.findFirst({ where: { id: { in: serviceIds }, hasSelection: true }, select: { id: true } })
    : null;
  if (!selectable) throw new CrmFlowError("Este prazo só pausa enquanto o cliente escolhe as fotos do ensaio.");
  if (!lines.some(line => !line.extra && line.serviceDate && line.proposedDays != null)) throw new CrmFlowError("Informe a data do serviço e o prazo proposto antes.");
  return demand;
}

export async function pauseClientDeadline(user: SessionUser, demandId: string) {
  if (user.role !== "GESTOR_GARRO") throw new CrmFlowError("Somente a Gestora registra o envio da seleção.");
  const demand = await selectableDemand(demandId);
  await prisma.demand.update({ where: { id: demand.id }, data: { clientDuePaused: true } });
  await prisma.auditLog.create({ data: { userId: user.id, action: "CLIENT_DUE_PAUSED", entityType: "Demand", entityId: demand.id } });
}

export async function confirmSelectionReturn(user: SessionUser, demandId: string, returnDate: string) {
  if (user.role !== "GESTOR_GARRO") throw new CrmFlowError("Somente a Gestora confirma a volta da seleção.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(returnDate)) throw new CrmFlowError("Informe a data em que a seleção voltou.");
  const demand = await selectableDemand(demandId);
  if (!demand.clientDuePaused) throw new CrmFlowError("O prazo só é recalculado quando a seleção volta.");
  await prisma.$transaction(async tx => {
    const delivery = await applySelectionReturn(tx, demand.id, returnDate);
    if (!delivery) throw new CrmFlowError("Informe a data do serviço e o prazo proposto antes.");
    await tx.demand.update({
      where: { id: demand.id },
      data: { clientDuePaused: false, ...(demand.status === "NOVA" ? { status: "PLANEJAMENTO" } : {}) },
    });
    await tx.auditLog.create({ data: {
      userId: user.id, action: "SELECTION_RETURNED", entityType: "Demand", entityId: demand.id, details: { returnDate, delivery },
    } });
  });
}
