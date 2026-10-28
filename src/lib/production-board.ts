import type { Deliverable, Demand, ProductionStatus, TaskStatus } from "@/lib/data";

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

export function deliverableKinds(
  task: Pick<Deliverable, "title">,
  demand: Pick<Demand, "title" | "service">,
): ProductionKind[] {
  const own = kindsInText(task.title);
  const parent = kindsInText(`${demand.title} ${demand.service ?? ""}`);
  const material = own.filter((kind) => kind !== "Plano EXPANSÃO");
  const inherited = material.length ? material : parent.filter((kind) => kind !== "Plano EXPANSÃO");
  const plan = own.includes("Plano EXPANSÃO") || parent.includes("Plano EXPANSÃO") ? (["Plano EXPANSÃO"] as const) : [];
  return [...new Set<ProductionKind>([...inherited, ...plan])];
}

export function demandMatchesKind(
  demand: Pick<Demand, "title" | "service">,
  tasks: Pick<Deliverable, "title">[],
  kind: "Todos" | ProductionKind,
) {
  if (kind === "Todos") return true;
  if (!tasks.length) return kindsInText(`${demand.title} ${demand.service ?? ""}`).includes(kind);
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

export function productionCards(input: {
  demands: Demand[];
  deliverables: Deliverable[];
  customers: { id: string; name: string }[];
  split: ProductionSplit;
  kind: "Todos" | ProductionKind;
  editorId: string;
  query: string;
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
      if (editorOk && kindOk && queryOk) cards.push({ split: "projeto", id: demand.id, column: demand.status, demand, tasks });
      continue;
    }
    for (const task of tasks) {
      const editorOk = input.editorId === "Todos" || task.editorId === input.editorId;
      const kindOk = input.kind === "Todos" || deliverableKinds(task, demand).includes(input.kind);
      const queryOk = matchesQuery([customer, demand.title, demand.service ?? "", task.title], input.query);
      if (!editorOk || !kindOk || !queryOk) continue;
      cards.push({ split: "entregavel", id: task.id, column: deliverableColumn(task, demand), demand, task });
    }
  }
  return cards;
}
