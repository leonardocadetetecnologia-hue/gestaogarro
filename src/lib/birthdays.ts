import type { Role, ScheduleItem } from "@/lib/data";

export const BIRTHDAY_WINDOW_DAYS = 30;

export type BirthdayContact = {
  id: string;
  name: string;
  kind?: "LEAD" | "CLIENTE";
  birthDate?: string;
  attendantId?: string;
  attendantName?: string;
};

export function readBirthDate(value: string): { date: Date | null } | { error: string } {
  const trimmed = value.trim();
  if (!trimmed) return { date: null };
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) return { error: "Informe a data de nascimento no formato AAAA-MM-DD." };
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1900) return { error: "A data de nascimento precisa ser a partir de 1900." };
  const date = new Date(Date.UTC(year, month - 1, day));
  const valid = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  if (!valid) return { error: "Data de nascimento inválida." };
  const today = saoPauloDay(new Date());
  if (daysBetween(today, { year, month, day }) > 0) return { error: "A data de nascimento não pode ser no futuro." };
  return { date };
}

export function formatBirthDate(value?: string) {
  if (!value) return "Não informada";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return "Não informada";
  return `${day}/${month}/${year}`;
}

export function birthDateKey(value: Date) {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function nextBirthday(birthDate: string, now = new Date()) {
  const parsed = readBirthDate(birthDate);
  if ("error" in parsed || !parsed.date) return null;
  const month = parsed.date.getUTCMonth() + 1;
  const day = parsed.date.getUTCDate();
  const today = saoPauloDay(now);
  let occurrence = birthdayInYear(today.year, month, day);
  if (daysBetween(today, occurrence) < 0) occurrence = birthdayInYear(today.year + 1, month, day);
  return { at: atNine(occurrence), days: daysBetween(today, occurrence), day: occurrence.day, month: occurrence.month };
}

export function upcomingClientBirthdays(contacts: BirthdayContact[], now = new Date()) {
  return contacts.flatMap(contact => {
    if (contact.kind !== "CLIENTE" || !contact.birthDate) return [];
    const next = nextBirthday(contact.birthDate, now);
    if (!next || next.days > BIRTHDAY_WINDOW_DAYS) return [];
    return [{ ...contact, ...next }];
  }).sort((a, b) => a.days - b.days || a.name.localeCompare(b.name, "pt-BR"));
}

export function birthdayReminders(contacts: BirthdayContact[], role: Role, now = new Date()): ScheduleItem[] {
  if (role === "EDITOR") return [];
  return contacts.flatMap(contact => {
    if (!contact.birthDate) return [];
    const next = nextBirthday(contact.birthDate, now);
    if (!next) return [];
    return [{
      id: `birthday-${contact.id}-${next.at.getUTCFullYear()}`,
      title: `Aniversário — ${contact.name}`,
      category: "Cliente" as const,
      userId: contact.attendantId || "",
      at: next.at.toISOString(),
      customerId: contact.id,
      customerName: contact.name,
      responsibleName: contact.attendantName,
      responsibleRole: "ATENDENTE" as const,
      origin: "Agenda" as const,
      typeLabel: "Aniversário",
      context: "Lembrete de aniversário.",
      status: "Pendente" as const,
      done: false,
    }];
  });
}

export function birthdayWhen(days: number) {
  if (days === 0) return "Hoje";
  if (days === 1) return "Amanhã";
  return `Em ${days} dias`;
}

type Day = { year: number; month: number; day: number };

function saoPauloDay(now: Date): Day {
  const [year, month, day] = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now).split("-").map(Number);
  return { year, month, day };
}

function leap(year: number) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function birthdayInYear(year: number, month: number, day: number): Day {
  if (month === 2 && day === 29 && !leap(year)) return { year, month: 2, day: 28 };
  return { year, month, day };
}

function daysBetween(from: Day, to: Day) {
  const start = Date.UTC(from.year, from.month - 1, from.day);
  const end = Date.UTC(to.year, to.month - 1, to.day);
  return Math.round((end - start) / 86400000);
}

function atNine(day: Day) {
  const month = String(day.month).padStart(2, "0");
  const date = String(day.day).padStart(2, "0");
  return new Date(`${day.year}-${month}-${date}T09:00:00-03:00`);
}
