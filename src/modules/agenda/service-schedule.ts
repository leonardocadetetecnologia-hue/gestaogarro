import type { Prisma } from "@prisma/client";
import { addBusinessDays, dateKey, endOfSaoPauloDay, saoPauloDateTime } from "./business-days";

type ScheduledLine = {
  id: string;
  serviceName: string;
  serviceDate: Date | null;
  captureTime: string | null;
  capturePlace: string | null;
  proposedDays: number | null;
};

type OpportunitySchedule = {
  id: string;
  responsibleId: string;
  customerName: string;
  demandId?: string | null;
};

export async function holidayKeys(tx: Prisma.TransactionClient) {
  const rows = await tx.agendaHoliday.findMany({ select: { day: true } });
  return new Set(rows.map(row => dateKey(row.day)));
}

export async function syncServiceSchedule(tx: Prisma.TransactionClient, opportunity: OpportunitySchedule, lines: ScheduledLine[], anchor = "") {
  const holidays = await holidayKeys(tx);
  const dated = lines.flatMap(line => {
    if (!line.serviceDate || line.proposedDays == null) return [];
    const serviceDate = dateKey(line.serviceDate);
    return [{ ...line, serviceDate, delivery: addBusinessDays(anchor || serviceDate, line.proposedDays, holidays) }];
  });
  const undated = lines.filter(line => !line.serviceDate || line.proposedDays == null).map(line => line.id);
  if (undated.length) {
    await tx.scheduleEvent.deleteMany({ where: { contractLineId: { in: undated }, type: { in: ["CAPTACAO", "ENTREGA_CLIENTE"] } } });
  }
  await tx.scheduleEvent.deleteMany({
    where: {
      opportunityId: opportunity.id,
      type: { in: ["CAPTACAO", "ENTREGA_CLIENTE"] },
      contractLineId: dated.length ? { notIn: dated.map(line => line.id) } : { not: null },
    },
  });
  if (dated.length) {
    await tx.scheduleEvent.deleteMany({
      where: { opportunityId: opportunity.id, type: "ENTREGA_CLIENTE", contractLineId: null, status: "PENDENTE" },
    });
  }
  for (const line of dated) {
    await saveEvent(tx, opportunity, {
      contractLineId: line.id, type: "CAPTACAO",
      title: `Captação — ${opportunity.customerName} · ${line.serviceName}`,
      dueAt: saoPauloDateTime(line.serviceDate, line.captureTime || ""),
      place: line.capturePlace,
    });
    await saveEvent(tx, opportunity, {
      contractLineId: line.id, type: "ENTREGA_CLIENTE",
      title: `ENTREGA FINAL — ${line.serviceName}`,
      dueAt: endOfSaoPauloDay(line.delivery),
      place: null,
    });
  }
  const latest = dated.reduce((max, line) => line.delivery > max ? line.delivery : max, "");
  if (opportunity.demandId && latest) {
    const due = endOfSaoPauloDay(latest);
    await tx.demand.update({ where: { id: opportunity.demandId }, data: {
      clientDueAt: due, clientDueManual: false, ...(anchor ? { clientDuePaused: false } : {}),
    } });
    await tx.deliverable.updateMany({ where: { demandId: opportunity.demandId }, data: { clientDueAt: due } });
  }
  return latest;
}

export async function applySelectionReturn(tx: Prisma.TransactionClient, demandId: string, returnDate: string) {
  const demand = await tx.demand.findUnique({
    where: { id: demandId },
    select: {
      id: true,
      sale: { select: { opportunity: { select: {
        id: true, responsibleId: true, customer: { select: { name: true } }, contractLines: true,
      } } } },
    },
  });
  const opportunity = demand?.sale?.opportunity;
  if (!opportunity) return "";
  return syncServiceSchedule(tx, {
    id: opportunity.id, responsibleId: opportunity.responsibleId, customerName: opportunity.customer.name, demandId: demand.id,
  }, opportunity.contractLines, returnDate);
}

async function saveEvent(tx: Prisma.TransactionClient, opportunity: OpportunitySchedule, event: {
  contractLineId: string; type: "CAPTACAO" | "ENTREGA_CLIENTE"; title: string; dueAt: Date; place: string | null;
}) {
  const data = {
    title: event.title, dueAt: event.dueAt, place: event.place || null,
    userId: opportunity.responsibleId, opportunityId: opportunity.id, demandId: opportunity.demandId || null,
  };
  const existing = await tx.scheduleEvent.findFirst({
    where: { contractLineId: event.contractLineId, type: event.type, status: "PENDENTE" },
    select: { id: true },
  });
  if (existing) {
    await tx.scheduleEvent.update({ where: { id: existing.id }, data });
    return;
  }
  await tx.scheduleEvent.create({ data: { ...data, contractLineId: event.contractLineId, type: event.type } });
}
