import { describe, expect, it } from "vitest";
import { pieParts, piePath } from "./pie";

describe("gráfico de pizza", () => {
  it("ignora fatia vazia e reparte o círculo", () => {
    const parts = pieParts([
      { label: "Entregue", value: 1 },
      { label: "Nova", value: 0 },
      { label: "Produção", value: 3 },
    ]);
    expect(parts.map((part) => part.label)).toEqual(["Entregue", "Produção"]);
    expect(parts[0].share).toBeCloseTo(0.25);
    expect(parts[1].end).toBeCloseTo(1);
    expect(parts[0].color).not.toBe(parts[1].color);
    expect(piePath(0, 1)).toBe("");
    expect(piePath(0, 0.25)).toContain("A 1 1 0 0 1");
  });
});
