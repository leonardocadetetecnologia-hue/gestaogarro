import { describe, expect, it } from "vitest";
import { compareDeliverables, creationRank } from "./deliverable-order";

describe("ordem de criação dos entregáveis", () => {
  it("numera pela data e desempatar pelo id", () => {
    const ranked = creationRank([
      { id: "b", createdAt: new Date("2026-10-02T00:00:00.000Z") },
      { id: "a", createdAt: new Date("2026-10-01T00:00:00.000Z") },
      { id: "c", createdAt: new Date("2026-10-02T00:00:00.000Z") },
    ]);
    expect(ranked.map(({ number, item }) => [number, item.id])).toEqual([[1, "a"], [2, "b"], [3, "c"]]);
  });

  it("mantém a ordem recebida quando ainda não há data", () => {
    const ranked = creationRank([{ id: "z" }, { id: "a" }]);
    expect(ranked.map(({ number, item }) => [number, item.id])).toEqual([[1, "z"], [2, "a"]]);
  });

  it("ordena a lista pelo número estável, não pelo identificador", () => {
    const items = [
      { id: "task-1", number: 2, createdAt: "2026-10-28T12:00:00.000Z" },
      { id: "task-8", number: 1, createdAt: "2026-10-27T12:00:00.000Z" },
    ];
    expect([...items].sort(compareDeliverables).map(item => item.id)).toEqual(["task-8", "task-1"]);
  });
});
