import { describe, expect, it } from "vitest";
import { birthdayReminders, birthdayWhen, nextBirthday, readBirthDate, upcomingClientBirthdays } from "./birthdays";

const now = new Date("2026-10-27T15:00:00.000Z");

describe("data de nascimento", () => {
  it("aceita uma data passada e recusa o futuro ou um dia inexistente", () => {
    expect(readBirthDate("")).toEqual({ date: null });
    expect(readBirthDate("1990-05-03")).toEqual({ date: new Date("1990-05-03T00:00:00.000Z") });
    expect(readBirthDate("2099-01-01")).toEqual({ error: "A data de nascimento não pode ser no futuro." });
    expect(readBirthDate("1990-02-31")).toEqual({ error: "Data de nascimento inválida." });
  });

  it("calcula o próximo aniversário, inclusive 29 de fevereiro fora do ano bissexto", () => {
    expect(nextBirthday("1990-11-06", now)?.days).toBe(10);
    expect(nextBirthday("1990-10-27", now)?.days).toBe(0);
    expect(nextBirthday("1990-10-26", now)?.days).toBe(364);
    expect(nextBirthday("2000-02-29", new Date("2026-02-01T15:00:00.000Z"))?.at.toISOString()).toBe("2026-02-28T12:00:00.000Z");
  });

  it("lista só clientes ativos nos próximos 30 dias", () => {
    const rows = upcomingClientBirthdays([
      { id: "ana", name: "Ana", kind: "CLIENTE", birthDate: "1988-11-06" },
      { id: "bia", name: "Bia", kind: "CLIENTE", birthDate: "1988-12-20" },
      { id: "leo", name: "Leo", kind: "LEAD", birthDate: "1988-10-28" },
      { id: "sem", name: "Sem data", kind: "CLIENTE" },
    ], now);
    expect(rows.map(item => item.name)).toEqual(["Ana"]);
    expect(birthdayWhen(rows[0].days)).toBe("Em 10 dias");
    expect(birthdayWhen(0)).toBe("Hoje");
  });

  it("cria o lembrete da agenda para o comercial e omite o editor", () => {
    const contacts = [{ id: "ana", name: "Ana Costa", kind: "CLIENTE" as const, birthDate: "1988-10-27", attendantId: "malu", attendantName: "Malu" }];
    const [event] = birthdayReminders(contacts, "ATENDENTE", now);
    expect(event.title).toBe("Aniversário — Ana Costa");
    expect(event.typeLabel).toBe("Aniversário");
    expect(event.userId).toBe("malu");
    expect(event.at).toBe("2026-10-27T12:00:00.000Z");
    expect(birthdayReminders(contacts, "EDITOR", now)).toEqual([]);
  });
});
