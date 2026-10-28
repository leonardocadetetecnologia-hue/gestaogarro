import type { Deliverable, Demand, ProductionStatus, TaskStatus } from "@/lib/data";
import type { DemandMediaType } from "@/lib/demand-media-type";

export const productionKindOptions = ["Foto", "Vídeo", "Plano EXPANSÃO"] as const;
export type ProductionKind = (typeof productionKindOptions)[number];
export type ProductionSplit = "projeto" | "entregavel";

function plain(value: string) {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export function kindsInText(value: string): ProductionKind[] {
  const text = plain(value);
  const kinds: ProductionKind[] = [];
  if (/\bfotos?\b/.test(text)) kinds.push("Foto");
  if (/\bvideos?\b/.test(text)) kinds.push("Vídeo");
  if (/expansao/.test(text)) kinds.push("Plano EXPANSÃO");
  return kinds;
}

const materialByMediaType: Record<DemandMediaType, ProductionKind[]> = {
  VIDEO: ["Vídeo"],
  FOTO: ["Foto"],
  FOTO_E_VIDEO: ["Foto", "Vídeo"],
};

function demandText(demand: Pick<Demand, "title" | "service">) {
  return `${demand.title} ${demand.service ?? ""}`;
}

function textMaterial(value: string) {
  return kindsInText(value).filter((kind) => kind !== "Plano EXPANSÃO");
}

function withPlan(material: readonly ProductionKind[], ...sources: string[]): ProductionKind[] {
  const plan = sources.some((source) => kindsInText(source).includes("Plano EXPANSÃO"));
  return [...new Set<ProductionKind>([...material, ...(plan ? (["Plano EXPANSÃO"] as const) : [])])];
}

// O nome do entregável vence o tipo gravado. Sem foto/vídeo no nome, o tipo vence o título. Sem tipo, vale o nome.
export function deliverableKinds(
  task: Pick<Deliverable, "title">,
  demand: Pick<Demand, "title" | "service" | "mediaType">,
): ProductionKind[] {
  const explicit = textMaterial(task.title);
  const fromType = demand.mediaType ? materialByMediaType[demand.mediaType] : undefined;
  const material = explicit.length ? explicit : fromType ?? textMaterial(demandText(demand));
  return withPlan(material, task.title, demandText(demand));
}

export function demandMatchesKind(
  demand: Pick<Demand, "title" | "service" | "mediaType">,
  tasks: Pick<Deliverable, "title">[],
  kind: "Todos" | ProductionKind,
) {
  if (kind === "Todos") return true;
  if (!tasks.length) {
    const material = demand.mediaType ? materialByMediaType[demand.mediaType] : textMaterial(demandText(demand));
    return withPlan(material, demandText(demand)).includes(kind);
  }
  return tasks.some((task) => deliverableKinds(task, demand).includes(kind));
}

const columnByTask: Record<TaskStatus, ProductionStatus> = {
  "A iniciar": "Nova demanda",
  "Em edição": "Em produção",
  "Em revisão": "Em revisão",
  Correção: "Correção",
  Aprovado: "Aprovada",
};

export function deliverableColumn(
  task: Pick<Deliverable, "status" | "clientDeliveredAt">,
  demand: Pick<Demand, "status">,
): ProductionStatus {
  if (task.clientDeliveredAt || (task.status === "Aprovado" && demand.status === "Entregue")) return "Entregue";
  return columnByTask[task.status];
}

export type ProductionCard =
  | { split: "projeto"; id: string; column: ProductionStatus; demand: Demand; tasks: Deliverable[] }
  | { split: "entregavel"; id: string; column: ProductionStatus; demand: Demand; task: Deliverable };

function matchesQuery(parts: string[], query: string) {
  const needle = plain(query.trim());
  if (!needle) return true;
  return parts.some((part) => plain(part).includes(needle));
}

export function saoPauloMonth(iso?: string) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit" }).format(date);
}

export function currentProductionMonth(now = new Date()) {
  return saoPauloMonth(now.toISOString());
}

export function deliveryMoment(demand: Pick<Demand, "status" | "createdAt">, tasks: Pick<Deliverable, "clientDeliveredAt">[]) {
  const stamps = tasks.map((task) => task.clientDeliveredAt).filter((value): value is string => Boolean(value)).sort();
  if (stamps.length) return stamps[stamps.length - 1];
  return demand.status === "Entregue" ? demand.createdAt : "";
}

export type DeliveredRecord = {
  id: string;
  title: string;
  customerId: string;
  customerName: string;
  month: string;
  year: string;
  deliveredAt: string;
  done: string;
};

export function deliveredRecords(
  demands: Demand[],
  deliverables: Deliverable[],
  customers: { id: string; name: string }[],
): DeliveredRecord[] {
  return demands
    .filter((demand) => demand.status === "Entregue")
    .map((demand) => {
      const tasks = deliverables.filter((task) => task.demandId === demand.id);
      const deliveredAt = deliveryMoment(demand, tasks);
      const month = saoPauloMonth(deliveredAt);
      const done = tasks.map((task) => task.title).filter(Boolean).join(", ") || demand.title;
      return {
        id: demand.id,
        title: demand.title,
        customerId: demand.customerId,
        customerName: customers.find((item) => item.id === demand.customerId)?.name || "Cliente não informado",
        month,
        year: month.slice(0, 4),
        deliveredAt,
        done,
      };
    })
    .sort((left, right) => right.deliveredAt.localeCompare(left.deliveredAt));
}

export function productionCards(input: {
  demands: Demand[];
  deliverables: Deliverable[];
  customers: { id: string; name: string }[];
  split: ProductionSplit;
  kind: "Todos" | ProductionKind;
  editorId: string;
  query: string;
  month?: string;
}): ProductionCard[] {
  const customerName = (id: string) => input.customers.find((item) => item.id === id)?.name ?? "";
  const cards: ProductionCard[] = [];
  for (const demand of input.demands) {
    const tasks = input.deliverables.filter((task) => task.demandId === demand.id);
    const customer = customerName(demand.customerId);
    if (input.split === "projeto") {
      const editorOk = input.editorId === "Todos" || tasks.some((task) => task.editorId === input.editorId);
      const kindOk = demandMatchesKind(demand, tasks, input.kind);
      const queryOk = matchesQuery([customer, demand.title, demand.service ?? "", ...tasks.map((task) => task.title)], input.query);
      const monthOk = !input.month || demand.status !== "Entregue" || saoPauloMonth(deliveryMoment(demand, tasks)) === input.month;
      if (editorOk && kindOk && queryOk && monthOk) cards.push({ split: "projeto", id: demand.id, column: demand.status, demand, tasks });
      continue;
    }
    for (const task of tasks) {
      const editorOk = input.editorId === "Todos" || task.editorId === input.editorId;
      const kindOk = input.kind === "Todos" || deliverableKinds(task, demand).includes(input.kind);
      const queryOk = matchesQuery([customer, demand.title, demand.service ?? "", task.title], input.query);
      const column = deliverableColumn(task, demand);
      const monthOk = !input.month || column !== "Entregue" || saoPauloMonth(task.clientDeliveredAt || deliveryMoment(demand, tasks)) === input.month;
      if (!editorOk || !kindOk || !queryOk || !monthOk) continue;
      cards.push({ split: "entregavel", id: task.id, column, demand, task });
    }
  }
  return cards;
}
