export function dateInputSaoPaulo(value: string | Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(p => p.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

export function deadlineParts(value?: string) {
  if (!value) return { date: "", time: "" };
  const full = dateInputSaoPaulo(value);
  const [date, time] = full.split("T");
  if (!date || !time) return { date: "", time: "" };
  return { date, time: time === "23:59" ? "" : time };
}

export function composeDeadline(date: string, time: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const clock = time.trim();
  const chosen = /^\d{2}:\d{2}$/.test(clock) ? clock : "23:59";
  const [hour, minute] = chosen.split(":").map(Number);
  if (hour > 23 || minute > 59) return null;
  const parsed = new Date(`${date}T${chosen}:00-03:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
