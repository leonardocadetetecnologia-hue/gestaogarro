import type { State } from "@/lib/data";

export type ArchiveEvent = { at: string; label: string; detail: string; author?: string };
export type ArchiveContact = {
  id: string;
  name: string;
  kind: "Lead" | "Cliente";
  origin: string;
  phone: string;
  email: string;
  company: string;
  notes: string;
  attendants: string[];
  services: string[];
  situation: string;
  lastAt: string;
  deliveries: number;
  events: ArchiveEvent[];
};

const openStages = new Set(["Lead", "Tentativa de contato", "Em tratativa", "Sem interesse", "Reunião agendada", "Reunião realizada", "Bolo"]);

function labelFor(description: string) {
  if (/sem sucesso|sem interesse|contato futuro|voltou para lead|retorno/i.test(description)) return "Retorno";
  if (/etapa alterada|fechado com sucesso|oportunidade/i.test(description)) return "Etapa";
  return "Contato";
}

export function buildArchive(state: State): ArchiveContact[] {
  return state.customers.map(customer => {
    const opportunities = state.opportunities.filter(item => item.customerId === customer.id);
    const demands = state.demands.filter(item => item.customerId === customer.id);
    const demandIds = new Set(demands.map(item => item.id));
    const tasks = state.deliverables.filter(item => demandIds.has(item.demandId));
    const events: ArchiveEvent[] = [];
    if (customer.createdAt) events.push({ at: customer.createdAt, label: "Cadastro", detail: customer.kind === "CLIENTE" ? "Cliente cadastrado na Garro." : "Lead cadastrado na Garro." });
    for (const opportunity of opportunities) {
      const service = opportunity.service || customer.service || "Oportunidade";
      if (opportunity.history.length === 0) events.push({ at: opportunity.lastActivity, label: opportunity.stage, detail: service, author: opportunity.responsibleName });
      for (const item of opportunity.history) events.push({ at: item.at, label: labelFor(item.description), detail: item.description, author: item.author });
      if (opportunity.lossReason && !opportunity.history.some(item => item.description.includes(opportunity.lossReason!))) {
        events.push({ at: opportunity.lostAt || opportunity.lastActivity, label: "Retorno", detail: `Motivo: ${opportunity.lossReason}`, author: opportunity.responsibleName });
      }
    }
    for (const demand of demands) events.push({ at: demand.createdAt, label: "Produção", detail: `${demand.title} · ${demand.status}` });
    for (const task of tasks) {
      const demand = demands.find(item => item.id === task.demandId);
      if (task.editorDeliveredAt) events.push({ at: task.editorDeliveredAt, label: "Edição", detail: `${task.title} entregue pelo editor.` });
      if (task.managerApprovedAt) events.push({ at: task.managerApprovedAt, label: "Aprovação", detail: `${task.title} aprovado.` });
      if (task.clientDeliveredAt || demand?.status === "Entregue") events.push({ at: task.clientDeliveredAt || demand?.clientDue || demand?.createdAt || "", label: "Entrega", detail: `${task.title} entregue ao cliente.` });
    }
    const dated = events.filter(item => item.at).sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
    const latest = [...opportunities].sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime())[0];
    const delivered = demands.some(item => item.status === "Entregue") || tasks.some(item => item.clientDeliveredAt);
    const situation = delivered ? "Entregue" : latest?.stage || demands[0]?.status || "Cadastro";
    const attendants = [...new Set(opportunities.map(item => item.responsibleName).filter((name): name is string => Boolean(name)))];
    const services = [...new Set([customer.service, ...opportunities.map(item => item.service || "")].filter(Boolean))];
    const kind: ArchiveContact["kind"] = customer.kind === "CLIENTE" ? "Cliente" : "Lead";
    return {
      id: customer.id, name: customer.name, kind, origin: customer.origin || "Outro",
      phone: customer.phone, email: customer.email, company: customer.company, notes: customer.notes, attendants, services, situation,
      lastAt: dated.at(-1)?.at || latest?.lastActivity || customer.createdAt || "",
      deliveries: demands.filter(item => item.status === "Entregue").length,
      events: dated,
    };
  }).sort((a, b) => new Date(b.lastAt || 0).getTime() - new Date(a.lastAt || 0).getTime());
}

export const serviceGroups = [
  { label: "Evento", pattern: /evento/i },
  { label: "Ensaio", pattern: /ensaio/i },
  { label: "Captação", pattern: /capta/i },
  { label: "Plano EXPANSÃO", pattern: /expans[aã]o/i },
] as const;

export function matchesServiceGroup(services: string[], group: string) {
  if (!group || group === "Todos") return true;
  const rule = serviceGroups.find(item => item.label === group);
  if (!rule) return false;
  return services.some(service => rule.pattern.test(service));
}

export function archiveMatches(contact: ArchiveContact, filter: string) {
  if (filter === "Leads") return contact.kind === "Lead";
  if (filter === "Clientes") return contact.kind === "Cliente";
  if (filter === "Com entrega") return contact.deliveries > 0 || contact.situation === "Entregue";
  if (filter === "No funil") return openStages.has(contact.situation);
  if (filter === "Fechado sem sucesso" || filter === "Fechado com sucesso") return contact.situation === filter;
  return true;
}
