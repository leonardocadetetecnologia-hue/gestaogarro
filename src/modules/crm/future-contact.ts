export const FUTURE_CONTACT_ACTION = "Contato futuro";

function saoPauloDay(now: Date) {
  const [year, month, day] = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now).split("-").map(Number);
  return { year, month, day };
}

export function todayKey(now = new Date()) {
  const { year, month, day } = saoPauloDay(now);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function futureContactAt(days: number, now = new Date()) {
  const { year, month, day } = saoPauloDay(now);
  const target = new Date(Date.UTC(year, month - 1, day + days));
  const iso = target.toISOString().slice(0, 10);
  return new Date(`${iso}T09:00:00-03:00`);
}

export function futureContactFromDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const value = new Date(`${date}T09:00:00-03:00`);
  return Number.isNaN(value.getTime()) ? null : value;
}

export function isContactDayAllowed(date: Date, now = new Date()) {
  const start = new Date(`${todayKey(now)}T00:00:00-03:00`);
  const limit = futureContactAt(365 * 5, now);
  return date.getTime() >= start.getTime() && date.getTime() <= limit.getTime();
}
