import { z } from "zod";
import { CrmFlowError } from "@/modules/crm/send-to-production";
import {
  categoryLabel, deliveryLabel, moneyLabel, priceTypeLabel, recurrenceLabel, variationLabel,
  serviceCategories, servicePriceTypes, serviceRecurrences,
  type ServiceSnapshot,
} from "./model";

const money = z.number().min(0, "O valor não pode ser negativo.").nullable();
const days = z.number().int().min(0, "O prazo não pode ser negativo.").max(365, "O prazo pode ter no máximo 365 dias.").nullable();

export const serviceInputSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do serviço.").max(160),
  category: z.enum(serviceCategories),
  description: z.string().trim().max(4000),
  referencePrice: money,
  priceType: z.enum(servicePriceTypes),
  deliveryDays: days,
  hasSelection: z.boolean(),
  selectionDays: days,
  recurrence: z.enum(serviceRecurrences),
  recurrenceDate: z.string().trim().max(10),
  standardCost: money,
  variations: z.array(z.object({
    name: z.string().trim().min(1, "Informe o nome da variação.").max(120),
    referencePrice: money,
  })).max(30, "São permitidas até 30 variações."),
});

export function normalizeServiceInput(raw: unknown, includeCost: boolean): ServiceSnapshot {
  const parsed = serviceInputSchema.safeParse(raw);
  if (!parsed.success) throw new CrmFlowError(parsed.error.issues[0].message);
  const input = parsed.data;
  const extra = input.category === "SERVICO_EXTRA";
  const plan = input.category === "PLANOS";
  const names = new Set<string>();
  for (const variation of input.variations) {
    const key = variation.name.toLocaleLowerCase("pt-BR");
    if (names.has(key)) throw new CrmFlowError("Cada variação precisa de um nome diferente.");
    names.add(key);
  }
  if (plan && input.recurrence === "DATA" && !/^\d{4}-\d{2}-\d{2}$/.test(input.recurrenceDate)) {
    throw new CrmFlowError("Informe a data da recorrência.");
  }
  return {
    name: input.name,
    category: input.category,
    description: input.description,
    referencePrice: extra ? null : input.referencePrice,
    priceType: input.priceType,
    deliveryDays: input.deliveryDays,
    hasSelection: input.hasSelection,
    selectionDays: input.hasSelection ? input.selectionDays ?? 7 : null,
    recurrence: plan ? input.recurrence : "UMA_VEZ",
    recurrenceDate: plan && input.recurrence === "DATA" ? input.recurrenceDate : "",
    standardCost: includeCost ? input.standardCost : null,
    variations: input.variations.map((item) => ({ name: item.name, referencePrice: extra ? null : item.referencePrice })),
  };
}

export type ServiceChange = { field: string; before: string; after: string };

function line(field: string, before: string, after: string, changes: ServiceChange[]) {
  if (before !== after) changes.push({ field, before, after });
}

export function serviceChanges(before: ServiceSnapshot | null, after: ServiceSnapshot, hideCost = false): ServiceChange[] {
  const changes: ServiceChange[] = [];
  const hourly = after.priceType === "POR_HORA";
  const previousHourly = before?.priceType === "POR_HORA";
  line("Nome", before?.name || "—", after.name, changes);
  line("Categoria", before ? categoryLabel[before.category] : "—", categoryLabel[after.category], changes);
  line("Descrição", before?.description || "—", after.description || "—", changes);
  line("Preço de referência", moneyLabel(before?.referencePrice ?? null, previousHourly), moneyLabel(after.referencePrice, hourly), changes);
  line("Tipo de preço", before ? priceTypeLabel[before.priceType] : "—", priceTypeLabel[after.priceType], changes);
  line("Prazo de entrega", deliveryLabel(before?.deliveryDays ?? null), deliveryLabel(after.deliveryDays), changes);
  line("Seleção pelo cliente", before?.hasSelection ? "Sim" : "Não", after.hasSelection ? "Sim" : "Não", changes);
  line("Prazo da seleção", before?.selectionDays == null ? "—" : `${before.selectionDays} dias`, after.selectionDays == null ? "—" : `${after.selectionDays} dias`, changes);
  line("Recorrência", before ? recurrenceLabel[before.recurrence] : "—", recurrenceLabel[after.recurrence], changes);
  line("Data da recorrência", before?.recurrenceDate || "—", after.recurrenceDate || "—", changes);
  if (!hideCost) line("Custo padrão", moneyLabel(before?.standardCost ?? null), moneyLabel(after.standardCost), changes);
  line("Variações", variationLabel(before?.variations || [], previousHourly), variationLabel(after.variations, hourly), changes);
  return changes;
}
