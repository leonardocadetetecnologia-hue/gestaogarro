import type { SessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

const completedDemand = ["ENTREGUE", "CONCLUIDO"] as const;
const completedDeliverable = new Set(["ENTREGUE", "CONCLUIDO"]);

export class StatementError extends Error {
  constructor(message: string, readonly status = 403) {
    super(message);
  }
}

export type StatementGroup = "cliente" | "servico";

export type StatementFilters = {
  customerId: string;
  service: string;
  group: StatementGroup;
};

export type StatementActivity = {
  id: string;
  customerId: string;
  customerName: string;
  service: string;
  title: string;
  description: string;
  deliveredAt: string;
};

export type StatementSection = {
  label: string;
  activities: StatementActivity[];
};

export type CompletedDemandInput = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  updatedAt: Date;
  customer: { id: string; name: string };
  service: string | null;
  deliverables: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    clientDeliveredAt: Date | null;
  }[];
};

export function assertStatementAccess(user: Pick<SessionUser, "role">) {
  if (!can(user.role, "reports")) throw new StatementError("Este perfil não consulta o extrato de entregas.");
}

export function parseStatementFilters(params: URLSearchParams): StatementFilters {
  const customerId = params.get("customerId")?.trim() || "";
  const service = params.get("service")?.trim() || "";
  const group: StatementGroup = params.get("group") === "servico" ? "servico" : "cliente";
  if (customerId && !/^[a-zA-Z0-9_-]{1,80}$/.test(customerId)) throw new StatementError("Cliente inválido.", 400);
  if (service.length > 120) throw new StatementError("Tipo de entrega inválido.", 400);
  return { customerId, service, group };
}

export function formatDeliveredAt(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
}

function narrative(value: string | null | undefined) {
  const text = (value || "").replace(/\r\n/g, "\n").trim();
  if (!text) return "Sem descrição complementar.";
  return text.length > 4000 ? `${text.slice(0, 4000)}…` : text;
}

export function activitiesFromDemand(demand: CompletedDemandInput): StatementActivity[] {
  if (!completedDemand.includes(demand.status as (typeof completedDemand)[number])) return [];
  const service = demand.service?.trim() || demand.title.trim() || "Serviço não informado";
  const delivered = demand.deliverables.filter(item => completedDeliverable.has(item.status));
  if (!delivered.length) {
    return [{
      id: demand.id,
      customerId: demand.customer.id,
      customerName: demand.customer.name,
      service,
      title: demand.title,
      description: narrative(demand.description),
      deliveredAt: demand.updatedAt.toISOString(),
    }];
  }
  return delivered.map(item => ({
    id: item.id,
    customerId: demand.customer.id,
    customerName: demand.customer.name,
    service,
    title: item.title,
    description: narrative(item.description || demand.description),
    deliveredAt: (item.clientDeliveredAt ?? demand.updatedAt).toISOString(),
  }));
}

function byName(left: string, right: string) {
  return left.localeCompare(right, "pt-BR");
}

export function exampleDemands(): CompletedDemandInput[] {
  return [
    {
      id: "modelo-ensaio",
      title: "Ensaio de apresentação",
      description: "Captação e edição do ensaio.",
      status: "ENTREGUE",
      updatedAt: new Date("2026-09-12T21:40:00.000Z"),
      customer: { id: "modelo-cliente-a", name: "Cliente exemplo A" },
      service: "Ensaio PESSOAL",
      deliverables: [
        {
          id: "modelo-video",
          title: "Vídeo principal",
          description: "Edição do vídeo de apresentação, com os cortes do ensaio e a trilha combinada.",
          status: "ENTREGUE",
          clientDeliveredAt: new Date("2026-09-12T21:40:00.000Z"),
        },
        {
          id: "modelo-fotos",
          title: "Seleção de fotos",
          description: "Tratamento e entrega de 20 fotos escolhidas do ensaio.",
          status: "ENTREGUE",
          clientDeliveredAt: new Date("2026-09-14T18:10:00.000Z"),
        },
      ],
    },
    {
      id: "modelo-evento",
      title: "Cobertura da celebração",
      description: "Filmagem do evento.",
      status: "CONCLUIDO",
      updatedAt: new Date("2026-10-03T21:05:00.000Z"),
      customer: { id: "modelo-cliente-b", name: "Cliente exemplo B" },
      service: "Cobertura de evento",
      deliverables: [
        {
          id: "modelo-filme",
          title: "Filme do evento",
          description: "Cobertura em vídeo do início ao encerramento, com um destaque de um minuto.",
          status: "CONCLUIDO",
          clientDeliveredAt: new Date("2026-10-03T21:05:00.000Z"),
        },
      ],
    },
  ];
}

export function statementOrExample(demands: CompletedDemandInput[], filters: StatementFilters) {
  const real = buildStatement(demands, filters);
  if (real.customers.length === 0 && real.services.length === 0) {
    return { ...buildStatement(exampleDemands(), filters), example: true };
  }
  return { ...real, example: false };
}

export function buildStatement(demands: CompletedDemandInput[], filters: StatementFilters) {
  const all = demands.flatMap(activitiesFromDemand);
  const customers = [...new Map(all.map(item => [item.customerId, { id: item.customerId, name: item.customerName }])).values()]
    .sort((left, right) => byName(left.name, right.name));
  const services = [...new Set(all.map(item => item.service))].sort(byName);
  const filtered = all.filter(item =>
    (!filters.customerId || item.customerId === filters.customerId) &&
    (!filters.service || item.service === filters.service),
  );
  const grouped = new Map<string, StatementActivity[]>();
  for (const item of filtered) {
    const label = filters.group === "servico" ? item.service : item.customerName;
    const bucket = grouped.get(label) || [];
    bucket.push(item);
    grouped.set(label, bucket);
  }
  const sections: StatementSection[] = [...grouped.entries()]
    .sort(([left], [right]) => byName(left, right))
    .map(([label, activities]) => ({
      label,
      activities: activities.sort((left, right) => right.deliveredAt.localeCompare(left.deliveredAt)),
    }));
  return { customers, services, sections, total: filtered.length, group: filters.group };
}

export async function loadDeliveryStatement(user: Pick<SessionUser, "role">, filters: StatementFilters) {
  assertStatementAccess(user);
  const demands = await prisma.demand.findMany({
    where: { status: { in: [...completedDemand] } },
    orderBy: { updatedAt: "desc" },
    include: {
      customer: { select: { id: true, name: true } },
      sale: { select: { opportunity: { select: { service: true } } } },
      deliverables: {
        select: { id: true, title: true, description: true, status: true, clientDeliveredAt: true },
      },
    },
  });
  return statementOrExample(demands.map(demand => ({
    id: demand.id,
    title: demand.title,
    description: demand.description,
    status: demand.status,
    updatedAt: demand.updatedAt,
    customer: demand.customer,
    service: demand.sale?.opportunity.service ?? null,
    deliverables: demand.deliverables,
  })), filters);
}
