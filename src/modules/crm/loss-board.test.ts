import { describe, expect, it } from "vitest";
import { lossStaysOnBoard } from "./loss-board";

describe("fechado sem sucesso no fim do mês", () => {
  const lostAt = "2026-10-05T15:00:00.000Z";

  it("permanece na coluna até a véspera do último dia", () => {
    expect(lossStaysOnBoard(lostAt, new Date("2026-10-30T15:00:00.000Z"))).toBe(true);
    expect(lossStaysOnBoard(lostAt, new Date("2026-10-31T02:30:00.000Z"))).toBe(true);
  });

  it("sai da coluna no último dia, no horário de Brasília", () => {
    expect(lossStaysOnBoard(lostAt, new Date("2026-10-31T03:00:00.000Z"))).toBe(false);
    expect(lossStaysOnBoard(lostAt, new Date("2026-11-01T15:00:00.000Z"))).toBe(false);
  });
});
