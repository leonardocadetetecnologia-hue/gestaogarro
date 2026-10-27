import { describe, expect, it } from "vitest";
import { futureContactAt, futureContactFromDate, isContactDayAllowed, todayKey } from "./future-contact";

describe("data de contato futuro", () => {
  const now = new Date("2026-10-27T21:00:00.000Z");

  it("soma dias no calendário de Brasília e marca 9h", () => {
    expect(todayKey(now)).toBe("2026-10-27");
    expect(futureContactAt(30, now).toISOString()).toBe("2026-11-26T12:00:00.000Z");
    expect(futureContactAt(60, now).toISOString()).toBe("2026-12-26T12:00:00.000Z");
  });

  it("aceita outra data a partir de hoje e recusa o passado", () => {
    const chosen = futureContactFromDate("2026-11-02");
    expect(chosen?.toISOString()).toBe("2026-11-02T12:00:00.000Z");
    expect(isContactDayAllowed(chosen!, now)).toBe(true);
    expect(isContactDayAllowed(futureContactFromDate("2026-10-26")!, now)).toBe(false);
    expect(futureContactFromDate("26/10/2026")).toBeNull();
  });
});
