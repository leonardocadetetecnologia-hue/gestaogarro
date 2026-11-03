import type { Prisma } from "@prisma/client";
import { addBusinessDays, dateKey, endOfSaoPauloDay, saoPauloDateTime } from "./business-days";

type ScheduledLine = {
  id: string;
  serviceId?: string | null;
  serviceName: string;
  extra?: boolean;
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

export type DeliveryInput = {
  serviceDate: string;
  proposedDays: number | null;
  extra?: boolean;
  serviceId?: string | null;
};

export function projectDeliveryDate(lines: DeliveryInput[], holidays: ReadonlySet<string>, anchor = "", selectionIds: ReadonlySet<string> = new Set()) {
  const shiftAll = Boolean(anchor) && selectionIds.size === 0;
  const keys = lines.flatMap(line => {
    if (!line.serviceDate || line.proposedDays == null) return [];
    const selected = Boolean(anchor) && !line.extra && (shiftAll || (line.serviceId != null && selectionIds.has(line.serviceId)));
    return [addBusinessDays(selected ? anchor : line.serviceDate, line.proposedDays, holidays)];
  });
  return keys.reduce((max, key) => key > max ? key : max, "");
}

export function serviceScheduleChanged(
  previous: { id: string; serviceDate: Date | null; proposedDays: number | null }[],
  next: { id: string; serviceDate: string; proposedDays: number | null }[],
) {
  if (previous.length !== next.length) return true;
  const byId = new Map(previous.map(row => [row.id, row]));
  return next.some(line => {
    const prev = byId.get(line.id);
    if (!prev) return true;
    const prevDate = prev.serviceDate ? dateKey(prev.serviceDate) : "";
    const nextDate = line.serviceDate || "";
    const nextDays = nextDate ? line.proposedDays : null;
    return prevDate !== nextDate || prev.proposedDays !== nextDays;
  });
}

export async function holidayKeys(tx: Prisma.TransactionClient) {
  const rows = await tx.agendaHoliday.findMany({ select: { day: true } });
  return new Set(rows.map(row => dateKey(row.day)));
}

export async function syncServiceSchedule(
  tx: Prisma.TransactionClient,
  opportunity: OpportunitySchedule,
  lines: ScheduledLine[],
  anchor = "",
  options?: { keepDelivery?: boolean },
) {
  const keepDelivery = options?.keepDelivery === true && !anchor;
  const holidays = await holidayKeys(tx);
  const selection = await selectionIds(tx, lines, anchor);
  const latest = projectDeliveryDate(lines.map(line => ({
    serviceDate: line.serviceDate ? dateKey(line.serviceDate) : "",
    proposedDays: line.proposedDays,
    extra: line.extra,
    serviceId: line.serviceId,
  })), holidays, anchor, selection);
  const dated = lines.filter(line => line.serviceDate && line.proposedDays != null);
  const undated = lines.filter(line => !line.serviceDate || line.proposedDays == null).map(line => line.id);
  if (undated.length) {
    await tx.scheduleEvent.deleteMany({ where: { contractLineId: { in: undated }, type: { in: ["CAPTACAO", "ENTREGA_CLIENTE"] } } });
  }
  await tx.scheduleEvent.deleteMany({
    where: {
      opportunityId: opportunity.id,
      type: "CAPTACAO",
      contractLineId: dated.length ? { notIn: dated.map(line => line.id) } : { not: null },
    },
  });
  await tx.scheduleEvent.deleteMany({
    where: { opportunityId: opportunity.id, type: "ENTREGA_CLIENTE", status: "PENDENTE", contractLineId: { not: null } },
  });
  for (const line of dated) {
    const serviceDate = dateKey(line.serviceDate as Date);
    await saveCapture(tx, opportunity, {
      contractLineId: line.id,
      title: `Captação — ${opportunity.customerName} · ${line.serviceName}`,
      dueAt: saoPauloDateTime(serviceDate, line.captureTime || ""),
      place: line.capturePlace,
    });
  }
  const current = opportunity.demandId
    ? await tx.demand.findUnique({ where: { id: opportunity.demandId }, select: { clientDueAt: true } })
    : null;
  const due = keepDelivery && current?.clientDueAt ? current.clientDueAt : latest ? endOfSaoPauloDay(latest) : null;
  if (due) await saveProjectDelivery(tx, opportunity, due);
  else await tx.scheduleEvent.deleteMany({
    where: { opportunityId: opportunity.id, type: "ENTREGA_CLIENTE", status: "PENDENTE", contractLineId: null, title: { startsWith: "ENTREGA FINAL" } },
  });
  const writeDemand = Boolean(opportunity.demandId) && (!keepDelivery || !current?.clientDueAt);
  if (writeDemand && opportunity.demandId) {
    await tx.demand.update({ where: { id: opportunity.demandId }, data: due ? {
      clientDueAt: due, clientDueManual: false, ...(anchor ? { clientDuePaused: false } : {}),
    } : { clientDueAt: null, clientDueManual: false, clientDuePaused: false } });
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

async function selectionIds(tx: Prisma.TransactionClient, lines: ScheduledLine[], anchor: string) {
  if (!anchor) return new Set<string>();
  const ids = [...new Set(lines.flatMap(line => !line.extra && line.serviceId ? [line.serviceId] : []))];
  if (!ids.length) return new Set<string>();
  const rows = await tx.service.findMany({ where: { id: { in: ids }, hasSelection: true }, select: { id: true } });
  return new Set(rows.map(row => row.id));
}

async function saveCapture(tx: Prisma.TransactionClient, opportunity: OpportunitySchedule, event: {
  contractLineId: string; title: string; dueAt: Date; place: string | null;
}) {
  const data = {
    title: event.title, dueAt: event.dueAt, place: event.place || null,
    userId: opportunity.responsibleId, opportunityId: opportunity.id, demandId: opportunity.demandId || null,
  };
  const existing = await tx.scheduleEvent.findFirst({
    where: { contractLineId: event.contractLineId, type: "CAPTACAO", status: "PENDENTE" },
    select: { id: true },
  });
  if (existing) {
    await tx.scheduleEvent.update({ where: { id: existing.id }, data });
    return;
  }
  await tx.scheduleEvent.create({ data: { ...data, contractLineId: event.contractLineId, type: "CAPTACAO" } });
}

async function saveProjectDelivery(tx: Prisma.TransactionClient, opportunity: OpportunitySchedule, dueAt: Date) {
  const data = {
    title: `ENTREGA FINAL — ${opportunity.customerName}`, dueAt, place: null,
    userId: opportunity.responsibleId, opportunityId: opportunity.id, demandId: opportunity.demandId || null,
  };
  const existing = await tx.scheduleEvent.findFirst({
    where: { opportunityId: opportunity.id, type: "ENTREGA_CLIENTE", contractLineId: null, status: "PENDENTE" },
    select: { id: true },
  });
  if (existing) {
    await tx.scheduleEvent.update({ where: { id: existing.id }, data });
    return;
  }
  await tx.scheduleEvent.create({ data: { ...data, contractLineId: null, type: "ENTREGA_CLIENTE" } });
}
