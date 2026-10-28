import { serviceGroups } from "@/modules/painel/customer-archive";

export const valueKinds = ["Estimado", "Proposta", "Fechado", "Sem valor"] as const;
export type ValueKind = (typeof valueKinds)[number];
export type StrategyView = "operacao" | "valores" | "categorias";

export type StrategyCard = {
  service?: string;
  estimated?: number | null;
  proposal?: number | null;
  closed?: number | null;
};

export type StrategyLine = { label: string; total: number; count: number };

export function moneyOf(card: StrategyCard): { kind: ValueKind; amount: number | null } {
  if (card.closed != null) return { kind: "Fechado", amount: card.closed };
  if (card.proposal != null) return { kind: "Proposta", amount: card.proposal };
  if (card.estimated != null) return { kind: "Estimado", amount: card.estimated };
  return { kind: "Sem valor", amount: null };
}

export function categoryOf(service = "") {
  return serviceGroups.find(item => item.pattern.test(service))?.label ?? "Outros";
}

export function strategyLines(cards: StrategyCard[], view: Exclude<StrategyView, "operacao">): StrategyLine[] {
  const labels = view === "valores" ? valueKinds : [...serviceGroups.map(item => item.label), "Outros"];
  return labels.map(label => {
    const rows = cards.filter(card => view === "valores" ? moneyOf(card).kind === label : categoryOf(card.service) === label);
    return {
      label,
      count: rows.length,
      total: rows.reduce((sum, card) => sum + (moneyOf(card).amount ?? 0), 0),
    };
  });
}
