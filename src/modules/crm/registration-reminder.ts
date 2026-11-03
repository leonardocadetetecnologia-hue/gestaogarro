import type { Prisma, PrismaClient } from "@prisma/client";
import { dateKey } from "@/modules/agenda/business-days";
import { contractChecklist, isPlanCapture, optionalDateLineIds } from "./contract-checklist";

type Db = Prisma.TransactionClient | PrismaClient;

export async function refreshContractReminder(db: Db, opportunityId: string) {
  const row = await db.opportunity.findUnique({
    where: { id: opportunityId },
    select: {
      id: true, stage: true, responsibleId: true, contractSigned: true, checklistWaivedAt: true,
      responsible: { select: { role: true } },
      customer: {
        select: {
          name: true, personType: true, street: true, addressCity: true, state: true,
          birthdays: { select: { name: true, birthDate: true } },
        },
      },
      contractLines: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, serviceId: true, serviceName: true, variationName: true, extra: true, serviceDate: true, proposedDays: true, sortOrder: true },
      },
      sale: { select: { demand: { select: { id: true } } } },
    },
  });
  if (!row) return;
  const serviceIds = row.contractLines.flatMap(line => line.serviceId ? [line.serviceId] : []);
  const services = serviceIds.length
    ? await db.service.findMany({ where: { id: { in: serviceIds } }, select: { id: true, variations: { select: { id: true }, take: 1 } } })
    : [];
  const lines = row.contractLines.map(line => ({
    ...line,
    serviceDate: line.serviceDate ? dateKey(line.serviceDate) : "",
  }));
  const check = contractChecklist({
    contractSigned: row.contractSigned,
    waived: Boolean(row.checklistWaivedAt),
    lines,
    customer: {
      ...row.customer,
      personType: row.customer.personType || "",
      birthdays: row.customer.birthdays.map(birthday => ({ name: birthday.name, birthDate: dateKey(birthday.birthDate) })),
    },
    variationRequired: new Set(services.filter(service => service.variations.length).map(service => service.id)),
  });
  const href = row.responsible.role === "GESTOR_GARRO" ? `/painel/crm?o=${row.id}` : `/painel?o=${row.id}`;
  const onContract = row.stage === "CONTRATO" && !row.sale?.demand;
  await upsertReminder(db, {
    userId: row.responsibleId, type: "CADASTRO_PENDENTE", href,
    active: onContract && check.pending.length > 0,
    title: "Completar cadastro",
    message: `Completar cadastro — ${row.customer.name}: falta ${check.pending.map(item => item.label).join(", ")}`,
  });
  const undefinedCaptures = [...optionalDateLineIds(lines)].filter(id => lines.some(line => line.id === id && !line.serviceDate && isPlanCapture(line.serviceName))).length;
  await upsertReminder(db, {
    userId: row.responsibleId, type: "CAPTACAO_A_DEFINIR", href,
    active: undefinedCaptures > 0,
    title: "Captações a definir",
    message: `Captações a definir — ${row.customer.name}: falta a data de ${undefinedCaptures} ${undefinedCaptures === 1 ? "captação" : "captações"}`,
  });
}

async function upsertReminder(db: Db, reminder: {
  userId: string; type: string; href: string; active: boolean; title: string; message: string;
}) {
  const existing = await db.notification.findFirst({
    where: { userId: reminder.userId, type: reminder.type, href: reminder.href },
    select: { id: true, message: true },
  });
  if (!reminder.active) {
    if (existing) await db.notification.delete({ where: { id: existing.id } });
    return;
  }
  if (!existing) {
    await db.notification.create({ data: { userId: reminder.userId, type: reminder.type, title: reminder.title, message: reminder.message, href: reminder.href } });
    return;
  }
  if (existing.message !== reminder.message) {
    await db.notification.update({ where: { id: existing.id }, data: { message: reminder.message, readAt: null } });
  }
}
