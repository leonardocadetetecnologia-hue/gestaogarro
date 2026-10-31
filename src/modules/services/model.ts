export const serviceCategories = ["ENSAIOS", "CAPTACAO", "EVENTOS", "PLANOS", "CAMPANHAS", "ESCALAVEIS", "SERVICO_EXTRA"] as const;
export const servicePriceTypes = ["FECHADO", "POR_HORA", "MENSAL"] as const;
export const serviceRecurrences = ["UMA_VEZ", "TRES_MESES", "SEIS_MESES", "UM_ANO", "DATA"] as const;
export const serviceProposalActions = ["CRIAR", "EDITAR", "ARQUIVAR", "DESARQUIVAR", "EXCLUIR"] as const;

export type ServiceCategory = (typeof serviceCategories)[number];
export type ServicePriceType = (typeof servicePriceTypes)[number];
export type ServiceRecurrence = (typeof serviceRecurrences)[number];
export type ServiceProposalAction = (typeof serviceProposalActions)[number];

export type ServiceVariationInput = { name: string; referencePrice: number | null };
export type ServiceSnapshot = {
  name: string;
  category: ServiceCategory;
  description: string;
  referencePrice: number | null;
  priceType: ServicePriceType;
  deliveryDays: number | null;
  hasSelection: boolean;
  selectionDays: number | null;
  recurrence: ServiceRecurrence;
  recurrenceDate: string;
  standardCost: number | null;
  variations: ServiceVariationInput[];
};

export const categoryLabel: Record<ServiceCategory, string> = {
  ENSAIOS: "Ensaios",
  CAPTACAO: "Captação",
  EVENTOS: "Eventos",
  PLANOS: "Planos",
  CAMPANHAS: "Campanhas",
  ESCALAVEIS: "Escaláveis",
  SERVICO_EXTRA: "Serviço Extra",
};

export const priceTypeLabel: Record<ServicePriceType, string> = {
  FECHADO: "Valor fechado",
  POR_HORA: "Por hora",
  MENSAL: "Mensal",
};

export const recurrenceLabel: Record<ServiceRecurrence, string> = {
  UMA_VEZ: "1x",
  TRES_MESES: "3 meses",
  SEIS_MESES: "6 meses",
  UM_ANO: "1 ano",
  DATA: "Data",
};

export const proposalActionLabel: Record<ServiceProposalAction, string> = {
  CRIAR: "Novo serviço",
  EDITAR: "Edição",
  ARQUIVAR: "Arquivar",
  DESARQUIVAR: "Desarquivar",
  EXCLUIR: "Excluir",
};

export const eventHourDiscount = [
  { duration: "2h", discount: "Preço cheio" },
  { duration: "3–4h", discount: "−10%" },
  { duration: "5–6h", discount: "−15%" },
  { duration: "7h ou mais", discount: "−20%" },
] as const;

export function moneyLabel(value: number | null, hourly = false) {
  if (value == null) return "A definir";
  const text = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  return hourly ? `${text}/h` : text;
}

export function deliveryLabel(days: number | null) {
  if (days == null) return "Não definido";
  if (days === 0) return "No dia";
  return `${days} ${days === 1 ? "dia útil" : "dias úteis"}`;
}

export function variationLabel(items: ServiceVariationInput[], hourly = false) {
  if (!items.length) return "Sem variações";
  return items.map((item) => `${item.name} · ${moneyLabel(item.referencePrice, hourly)}`).join("; ");
}
