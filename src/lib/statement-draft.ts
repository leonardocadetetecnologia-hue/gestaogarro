import { formatPeriodDay, saoPauloDay, type StatementActivity } from "@/modules/reports/delivery-statement";

export type ReportMode = "junto" | "cada";

export type DraftLine = {
  id: string;
  include: boolean;
  number?: number;
  showNumber: boolean;
  title: string;
  showTitle: boolean;
  description: string;
  showDescription: boolean;
  service: string;
  showService: boolean;
};

export type DraftNote = {
  id: string;
  text: string;
};

export type DraftDelivery = {
  demandId: string;
  include: boolean;
  label: string;
  customerName: string;
  showCustomer: boolean;
  date: string;
  omitDate: boolean;
  lines: DraftLine[];
  notes: DraftNote[];
};

export type ReportLine = {
  id: string;
  heading: string;
  description: string;
  service: string;
};

export type ReportPart = {
  key: string;
  customer: string;
  date: string;
  lines: ReportLine[];
  note: string;
};

export type ReportDocument = {
  key: string;
  title: string;
  period: string;
  parts: ReportPart[];
};

export function formatReportPeriod(kind: "texto" | "datas", text: string, from: string, to: string) {
  if (kind === "texto") return text.trim();
  const start = from ? formatPeriodDay(from) : "";
  const end = to ? formatPeriodDay(to) : "";
  if (start && end) return `${start} a ${end}`;
  return start || end;
}

export function draftsFromActivities(activities: StatementActivity[]): DraftDelivery[] {
  const order: string[] = [];
  const map = new Map<string, DraftDelivery>();
  for (const activity of activities) {
    let draft = map.get(activity.demandId);
    if (!draft) {
      draft = {
        demandId: activity.demandId,
        include: true,
        label: activity.title,
        customerName: activity.customerName,
        showCustomer: true,
        date: "",
        omitDate: false,
        lines: [],
        notes: [],
      };
      map.set(activity.demandId, draft);
      order.push(activity.demandId);
    }
    const day = activity.deliveredAt ? saoPauloDay(activity.deliveredAt) : "";
    if (day && day > draft.date) draft.date = day;
    const title = activity.title.trim();
    const description = activity.description.trim();
    const service = activity.service.trim();
    if (!title && (!description || description === "Sem descrição complementar.") && !service) continue;
    if (!draft.label.trim()) draft.label = title || service || draft.customerName;
    draft.lines.push({
      id: activity.id,
      include: true,
      number: activity.number,
      showNumber: activity.number != null,
      title,
      showTitle: true,
      description: description === "Sem descrição complementar." ? "" : description,
      showDescription: Boolean(description) && description !== "Sem descrição complementar.",
      service,
      showService: Boolean(service),
    });
  }
  return order.map((id) => map.get(id)!);
}

function lineOf(line: DraftLine): ReportLine | null {
  if (!line.include) return null;
  const heading = line.showTitle ? line.title.trim() : "";
  const description = line.showDescription ? line.description.trim() : "";
  if (!heading && !description) return null;
  return { id: line.id, heading, description, service: "" };
}

function partOf(draft: DraftDelivery): ReportPart | null {
  const lines = draft.lines.map(lineOf).filter((line): line is ReportLine => line != null);
  const customer = draft.showCustomer ? draft.customerName.trim() : "";
  const date = !draft.omitDate && draft.date ? formatPeriodDay(draft.date) : "";
  const note = draft.notes.map((item) => item.text.trim()).filter(Boolean).join("\n\n");
  if (!customer && !date && !lines.length && !note) return null;
  return { key: draft.demandId, customer, date, lines, note };
}

export function reportDocuments(drafts: DraftDelivery[], mode: ReportMode, period = ""): ReportDocument[] {
  const chosen = drafts.filter((draft) => draft.include);
  if (mode === "cada") {
    return chosen.flatMap((draft) => {
      const part = partOf(draft);
      if (!part) return [];
      const title = draft.lines.find((line) => line.showTitle && line.title.trim())?.title.trim() || draft.label || "Entrega";
      return [{ key: draft.demandId, title, period, parts: [part] }];
    });
  }
  const parts = chosen.flatMap((draft) => {
    const part = partOf(draft);
    return part ? [part] : [];
  });
  return parts.length ? [{ key: "junto", title: "Relatório de entrega", period, parts }] : [];
}
