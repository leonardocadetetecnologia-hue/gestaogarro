export const checklistLabels = {
  signed: "Contrato assinado",
  personal: "Informações pessoais",
  services: "Serviço e variação",
  serviceDate: "Data do serviço",
  proposedDays: "Prazo proposto",
} as const;

export type ChecklistId = keyof typeof checklistLabels;

export type ChecklistLine = {
  id?: string;
  serviceId?: string | null;
  serviceName: string;
  variationName?: string;
  extra?: boolean;
  serviceDate?: string | null;
  proposedDays?: number | null;
  sortOrder?: number;
};

export type ChecklistCustomer = {
  personType?: string | null;
  street?: string | null;
  addressCity?: string | null;
  state?: string | null;
  birthdays?: { name: string; birthDate: string }[];
};

export type ChecklistItem = {
  id: ChecklistId;
  label: string;
  anchor: string;
  blocksSend: boolean;
};

const anchors: Record<ChecklistId, string> = {
  signed: "pendencia-signed",
  personal: "pendencia-personal",
  services: "pendencia-services",
  serviceDate: "pendencia-serviceDate",
  proposedDays: "pendencia-proposedDays",
};

export const sendBlockedMessage = "Preencha a data do serviço e o prazo para enviar à produção";

export function isPlanCapture(name: string) {
  return /plano\s*exp/i.test(name.normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
}

export function optionalDateLineIds(lines: ChecklistLine[]) {
  const captures = lines
    .filter(line => !line.extra && isPlanCapture(line.serviceName))
    .slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  return new Set(captures.slice(1).flatMap(line => line.id ? [line.id] : []));
}

export function contractChecklist(input: {
  contractSigned?: boolean | null;
  waived?: boolean;
  lines: ChecklistLine[];
  customer: ChecklistCustomer;
  variationRequired?: ReadonlySet<string>;
}) {
  const lines = input.lines;
  const optional = optionalDateLineIds(lines);
  const missingIds: ChecklistId[] = [];
  if (input.contractSigned !== true) missingIds.push("signed");
  if (!personalReady(input.customer)) missingIds.push("personal");
  if (!servicesReady(lines, input.variationRequired || new Set())) missingIds.push("services");
  if (lines.length === 0 || lines.some(line => !line.serviceDate && (!line.id || !optional.has(line.id)))) missingIds.push("serviceDate");
  if (lines.length === 0 || lines.some(line => !Number.isInteger(line.proposedDays) || (line.proposedDays ?? -1) < 0)) missingIds.push("proposedDays");
  const missing = missingIds.map(item);
  const ignored = input.waived ? missing.filter(entry => !entry.blocksSend) : [];
  const pending = missing.filter(entry => entry.blocksSend || !input.waived);
  const blocking = pending.filter(entry => entry.blocksSend);
  return { missing, pending, ignored, blocking, canSend: blocking.length === 0 };
}

export function checklistSummary(pending: ChecklistItem[]) {
  if (!pending.length) return "";
  const noun = pending.length === 1 ? "item" : "itens";
  return `Faltam ${pending.length} ${noun}: ${pending.map(entry => entry.label).join(" · ")}`;
}

function item(id: ChecklistId): ChecklistItem {
  return {
    id,
    label: checklistLabels[id],
    anchor: anchors[id],
    blocksSend: id === "serviceDate" || id === "proposedDays",
  };
}

function personalReady(customer: ChecklistCustomer) {
  const birthday = (customer.birthdays || []).some(entry => entry.name.trim().length >= 2 && /^\d{4}-\d{2}-\d{2}$/.test(entry.birthDate));
  return (customer.personType === "PESSOA_FISICA" || customer.personType === "EMPRESA")
    && (customer.street || "").trim().length >= 2
    && (customer.addressCity || "").trim().length >= 2
    && (customer.state || "").trim().length === 2
    && birthday;
}

function servicesReady(lines: ChecklistLine[], variationRequired: ReadonlySet<string>) {
  const main = lines.filter(line => !line.extra && line.serviceId);
  if (!main.length) return false;
  return main.every(line => !line.serviceId || !variationRequired.has(line.serviceId) || Boolean(line.variationName?.trim()));
}
