import type { OpportunityStage } from "@prisma/client";
import type { AttendantActivity } from "@/lib/data";
import { STAGE_LABELS } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

const WINDOW_MS = 90 * 24 * 60 * 60 * 1000;
const LIMIT = 800;

const ACTIONS: Record<string, { kind: AttendantActivity["kind"]; title: string }> = {
  LOGIN: { kind: "acesso", title: "Entrou" },
  LOGOUT: { kind: "acesso", title: "Saiu" },
  LOGIN_FAILED: { kind: "acesso", title: "Entrada recusada" },
  LOGIN_ROLE_MISMATCH: { kind: "acesso", title: "Perfil diferente na entrada" },
  OPPORTUNITY_MOVED: { kind: "movimentacao", title: "Moveu o card" },
  OPPORTUNITY_LOST: { kind: "movimentacao", title: "Fechou sem sucesso" },
  OPPORTUNITY_RETURNED_TO_LEAD: { kind: "movimentacao", title: "O card voltou para Lead" },
  SALE_CLOSED: { kind: "movimentacao", title: "Fechou com sucesso" },
  SALE_SENT_TO_PRODUCTION: { kind: "movimentacao", title: "Enviou para produção" },
  ATTENDANT_TASK_COMPLETED: { kind: "movimentacao", title: "Concluiu a função" },
  CUSTOMER_CREATED: { kind: "inclusao", title: "Incluiu um contato" },
  OPPORTUNITY_CREATED: { kind: "inclusao", title: "Incluiu uma oportunidade" },
  CRM_INTERACTION: { kind: "inclusao", title: "Registrou um contato" },
  CRM_LEGACY_IMPORTED: { kind: "inclusao", title: "Incluiu lead importado" },
  CRM_CONTEMPORANEO_IMPORTED: { kind: "inclusao", title: "Incluiu lead do Contemporâneo" },
  PERSONAL_TASK_CREATED: { kind: "inclusao", title: "Criou compromisso pessoal" },
  CUSTOMER_UPDATED: { kind: "alteracao", title: "Alterou o cadastro" },
  OPPORTUNITY_VALUE_UPDATED: { kind: "alteracao", title: "Alterou o valor" },
  FUTURE_CONTACT_UPDATED: { kind: "alteracao", title: "Alterou o contato futuro" },
  ATTENDANT_TASK_DELETED: { kind: "alteracao", title: "Excluiu um compromisso" },
};

type RawLog = {
  id: string;
  userId: string | null;
  action: string;
  details: unknown;
  createdAt: Date;
  attendantName: string;
  contact?: string;
};

function stageName(value: unknown) {
  if (typeof value !== "string" || !value) return "";
  return value in STAGE_LABELS ? STAGE_LABELS[value as OpportunityStage] : value;
}

function detailOf(action: string, details: unknown, contact: string) {
  const record = details && typeof details === "object" ? details as Record<string, unknown> : {};
  const from = stageName(record.from);
  const to = stageName(record.stage);
  if (action === "OPPORTUNITY_MOVED" || action === "OPPORTUNITY_LOST" || action === "OPPORTUNITY_RETURNED_TO_LEAD") {
    const path = from && to ? `De ${from} para ${to}` : to ? `Para ${to}` : from ? `Saiu de ${from}` : "";
    return [contact, path].filter(Boolean).join(" · ");
  }
  if (action === "OPPORTUNITY_VALUE_UPDATED") {
    const next = record.newValue == null || record.newValue === "" ? "sem valor" : String(record.newValue);
    return [contact, `Valor ${next}`].filter(Boolean).join(" · ");
  }
  return contact;
}

export function toMonitorEvents(logs: RawLog[]): AttendantActivity[] {
  return logs.flatMap((log) => {
    if (!log.userId) return [];
    const known = ACTIONS[log.action] ?? { kind: "alteracao" as const, title: "Outro registro" };
    return [{
      id: log.id,
      at: log.createdAt.toISOString(),
      attendantId: log.userId,
      attendantName: log.attendantName,
      kind: known.kind,
      title: known.title,
      detail: detailOf(log.action, log.details, log.contact || ""),
      contact: log.contact || "",
    }];
  });
}

export function monitorSummary(events: AttendantActivity[]) {
  const rows = new Map<string, {
    id: string; name: string; logins: number; logouts: number; moves: number; inclusions: number; edits: number; lastLogin: string; lastLogout: string;
  }>();
  for (const event of events) {
    const row = rows.get(event.attendantId) ?? {
      id: event.attendantId, name: event.attendantName, logins: 0, logouts: 0, moves: 0, inclusions: 0, edits: 0, lastLogin: "", lastLogout: "",
    };
    if (event.title === "Entrou") {
      row.logins += 1;
      if (!row.lastLogin) row.lastLogin = event.at;
    } else if (event.title === "Saiu") {
      row.logouts += 1;
      if (!row.lastLogout) row.lastLogout = event.at;
    } else if (event.kind === "movimentacao") row.moves += 1;
    else if (event.kind === "inclusao") row.inclusions += 1;
    else if (event.kind === "alteracao") row.edits += 1;
    rows.set(event.attendantId, row);
  }
  return [...rows.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export async function loadAttendantMonitor(): Promise<AttendantActivity[]> {
  const since = new Date(Date.now() - WINDOW_MS);
  const attendants = await prisma.user.findMany({ where: { role: "ATENDENTE" }, select: { id: true, name: true } });
  if (!attendants.length) return [];
  const names = new Map(attendants.map((person) => [person.id, person.name]));
  const logs = await prisma.auditLog.findMany({
    where: { userId: { in: [...names.keys()] }, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: LIMIT,
    select: { id: true, userId: true, action: true, entityType: true, entityId: true, details: true, createdAt: true },
  });
  const opportunityIds = [...new Set(logs.filter((log) => log.entityType === "Opportunity").map((log) => log.entityId))];
  const customerIds = [...new Set(logs.filter((log) => log.entityType === "Customer").map((log) => log.entityId))];
  const [opportunities, customers] = await Promise.all([
    opportunityIds.length ? prisma.opportunity.findMany({ where: { id: { in: opportunityIds } }, select: { id: true, customer: { select: { name: true } } } }) : [],
    customerIds.length ? prisma.customer.findMany({ where: { id: { in: customerIds } }, select: { id: true, name: true } }) : [],
  ]);
  const contacts = new Map<string, string>([
    ...opportunities.map((item) => [item.id, item.customer.name] as const),
    ...customers.map((item) => [item.id, item.name] as const),
  ]);
  return toMonitorEvents(logs.map((log) => ({
    id: log.id,
    userId: log.userId,
    action: log.action,
    details: log.details,
    createdAt: log.createdAt,
    attendantName: names.get(log.userId || "") || "Atendente",
    contact: contacts.get(log.entityId) || "",
  })));
}
