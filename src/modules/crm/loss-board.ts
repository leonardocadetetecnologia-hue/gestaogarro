function saoPauloParts(date: Date) {
  const [year, month, day] = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(date).split("-").map(Number);
  return { year, month, day };
}

function lastDayOfMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function lossStaysOnBoard(lostAt?: string, now = new Date()) {
  if (!lostAt) return true;
  const lostDate = new Date(lostAt);
  if (Number.isNaN(lostDate.getTime())) return true;
  const lost = saoPauloParts(lostDate);
  const today = saoPauloParts(now);
  if (today.year > lost.year || (today.year === lost.year && today.month > lost.month)) return false;
  if (today.year < lost.year || today.month < lost.month) return true;
  return today.day < lastDayOfMonth(lost.year, lost.month);
}
