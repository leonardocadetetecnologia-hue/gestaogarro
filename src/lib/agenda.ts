import { dateInputSaoPaulo } from "./date-input";
import type { ScheduleItem } from "./data";

export type AgendaMode = "dia" | "semana" | "mes" | "lista";
export const agendaDayKey = (value: string | Date) => dateInputSaoPaulo(value).slice(0, 10);
const dayDate = (key: string) => new Date(`${key}T12:00:00.000Z`);
const keyOfDate = (date: Date) => date.toISOString().slice(0, 10);

export function calendarDays(focus: string, mode: AgendaMode) {
  const start = dayDate(focus);
  if (mode === "mes") start.setUTCDate(1);
  if (mode === "mes" || mode === "semana") start.setUTCDate(start.getUTCDate() - (start.getUTCDay() + 6) % 7);
  return Array.from({ length: mode === "mes" ? 42 : mode === "semana" ? 7 : 1 }, (_, index) => {
    const date = new Date(start); date.setUTCDate(start.getUTCDate() + index);
    return keyOfDate(date);
  });
}
export function nextCalendarFocus(focus: string, mode: AgendaMode, step: number) {
  const date = dayDate(focus);
  if (mode === "mes") { date.setUTCDate(1); date.setUTCMonth(date.getUTCMonth() + step); }
  else date.setUTCDate(date.getUTCDate() + step * (mode === "semana" ? 7 : 1));
  return keyOfDate(date);
}
export function agendaOriginLink(event: ScheduleItem) {
  if (event.demandId) return { href: `/painel/demanda?id=${encodeURIComponent(event.demandId)}`, label: "Abrir demanda de produção" };
  if (event.opportunityId) return { href: `/painel/crm?o=${encodeURIComponent(event.opportunityId)}`, label: "Abrir atendimento no CRM" };
  return null;
}
