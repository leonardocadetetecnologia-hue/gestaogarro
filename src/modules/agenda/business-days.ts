const dayKey = /^\d{4}-\d{2}-\d{2}$/;

export function dateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function isBusinessDay(key: string, holidays: ReadonlySet<string>) {
  const [year, month, day] = key.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return weekday !== 0 && weekday !== 6 && !holidays.has(key);
}

function nextDay(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

export function addBusinessDays(start: string, days: number, holidays: ReadonlySet<string>) {
  if (!dayKey.test(start)) throw new Error("Informe a data do serviço.");
  if (!Number.isInteger(days) || days < 0 || days > 3650) throw new Error("Informe o prazo em dias úteis.");
  if (days === 0) return start;
  let cursor = start;
  let left = days;
  while (left > 0) {
    cursor = nextDay(cursor);
    if (isBusinessDay(cursor, holidays)) left -= 1;
  }
  return cursor;
}

export function endOfSaoPauloDay(key: string) {
  return new Date(`${key}T23:59:00-03:00`);
}

export function saoPauloDateTime(key: string, time = "") {
  const hour = /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? time : "09:00";
  return new Date(`${key}T${hour}:00-03:00`);
}
