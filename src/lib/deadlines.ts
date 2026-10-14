export type Attention = "ok" | "atencao" | "urgente" | "atrasado";
export type Risk = "BAIXO" | "MEDIO" | "ALTO" | "CRITICO";

const ATTENTION_RANK: Record<Attention, number> = {
  ok: 0,
  atencao: 1,
  urgente: 2,
  atrasado: 3,
};

export function formatDuration(ms: number) {
  const totalMinutes = Math.max(0, Math.floor(Math.abs(ms) / 60000));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}min`;
}

export function formatSaoPaulo(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function parseSaoPaulo(input: string | null | undefined) {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  const normalized = trimmed.length === 16 ? `${trimmed}:00-03:00` : `${trimmed}-03:00`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function remainingLabel(due: Date | null, done: Date | null, now = new Date()) {
  if (done) return `Entregue em ${formatSaoPaulo(done)}`;
  if (!due) return "Sem prazo";
  const delta = due.getTime() - now.getTime();
  if (delta < 0) return `Atrasado há ${formatDuration(delta)}`;
  return `${formatSaoPaulo(due)} — faltam ${formatDuration(delta)}`;
}

export function crmAttention(input: {
  waitingSince: Date | null;
  nextActionAt: Date | null;
  lastActivityAt: Date | null;
  yellowHours: number;
  orangeHours: number;
  redHours: number;
  now?: Date;
}): Attention {
  const now = input.now ?? new Date();
  let level: Attention = "ok";
  if (input.nextActionAt && input.nextActionAt.getTime() < now.getTime()) {
    level = "atrasado";
  }
  const anchor = input.waitingSince ?? input.lastActivityAt;
  if (anchor) {
    const hours = (now.getTime() - anchor.getTime()) / 36e5;
    let fromWait: Attention = "ok";
    if (hours >= input.redHours) fromWait = "atrasado";
    else if (hours >= input.orangeHours) fromWait = "urgente";
    else if (hours >= input.yellowHours) fromWait = "atencao";
    if (ATTENTION_RANK[fromWait] > ATTENTION_RANK[level]) level = fromWait;
  }
  return level;
}

const APPROVED = new Set(["APROVADO", "ENTREGUE", "CONCLUIDO"]);

export function deliveryRisk(input: {
  status: string;
  editorDueAt: Date | null;
  reviewDueAt: Date | null;
  clientDueAt: Date | null;
  editorDeliveredAt: Date | null;
  managerApprovedAt: Date | null;
  now?: Date;
}): Risk {
  const now = input.now ?? new Date();
  if (APPROVED.has(input.status) && input.managerApprovedAt) return "BAIXO";
  const hoursUntil = (date: Date | null) => (date ? (date.getTime() - now.getTime()) / 36e5 : null);
  const clientH = hoursUntil(input.clientDueAt);
  const editorH = hoursUntil(input.editorDueAt);
  const reviewH = hoursUntil(input.reviewDueAt);
  if (clientH != null && clientH < 0 && !input.managerApprovedAt) return "CRITICO";
  if (input.status === "CORRECAO" && clientH != null && clientH < 48) return "CRITICO";
  if (editorH != null && editorH < 0 && !input.editorDeliveredAt) return "ALTO";
  if (reviewH != null && reviewH < 0 && !input.managerApprovedAt) return "ALTO";
  if (clientH != null && clientH < 48 && !input.managerApprovedAt) return "ALTO";
  if (
    (editorH != null && editorH < 72) ||
    (clientH != null && clientH < 120) ||
    input.status === "CORRECAO"
  ) {
    return "MEDIO";
  }
  return "BAIXO";
}
