import { describe, expect, it } from "vitest";
import { agendaDayKey, agendaOriginLink, calendarDays, nextCalendarFocus } from "./agenda";
import type { ScheduleItem } from "./data";

describe("agenda", () => {
  it("agrupa pela data de São Paulo mesmo perto da meia-noite UTC", () => {
    expect(agendaDayKey("2026-10-15T01:00:00Z")).toBe("2026-10-14");
  });
  it("monta a semana de segunda a domingo, atravessando o mês", () => {
    const days = calendarDays("2026-11-01", "semana");
    expect(days).toHaveLength(7); expect(days[0]).toBe("2026-10-26"); expect(days[6]).toBe("2026-11-01");
  });
  it("preserva fevereiro bissexto e não pula mês ao navegar a partir do dia 31", () => {
    expect(calendarDays("2028-02-15", "mes")).toContain("2028-02-29");
    expect(nextCalendarFocus("2026-01-31", "mes", 1)).toBe("2026-02-01");
  });
  it("abre o registro real de origem em vez de um evento sem vínculo", () => {
    const event: ScheduleItem = { id: "event", title: "Retornar", category: "Comercial", userId: "user", at: "2026-11-01T12:00:00Z" };
    expect(agendaOriginLink({ ...event, opportunityId: "opportunity" })?.href).toBe("/painel/crm?o=opportunity");
    expect(agendaOriginLink({ ...event, demandId: "demand" })?.href).toBe("/painel/demanda?id=demand");
    expect(agendaOriginLink(event)).toBeNull();
  });
});
