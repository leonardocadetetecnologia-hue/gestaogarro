import { describe, expect, it } from "vitest";
import { composeDeadline, deadlineParts } from "./date-input";

describe("prazo de edição", () => {
  it("exige a data e trata o horário vazio como o fim do dia", () => {
    expect(composeDeadline("", "")).toBeNull();
    expect(composeDeadline("2026-10-26", "")?.toISOString()).toBe("2026-10-27T02:59:00.000Z");
    expect(composeDeadline("2026-10-26", "15:20")?.toISOString()).toBe("2026-10-26T18:20:00.000Z");
  });

  it("esconde o horário quando o prazo salvo é só o dia", () => {
    expect(deadlineParts("2026-10-27T02:59:00.000Z")).toEqual({ date: "2026-10-26", time: "" });
    expect(deadlineParts("2026-10-26T18:20:00.000Z")).toEqual({ date: "2026-10-26", time: "15:20" });
  });
});
