import { describe, expect, it } from "vitest";
import { strategyLines } from "./kanban-strategy";

const cards = [
  { service: "Ensaio PESSOAL", estimated: 1000, proposal: null, closed: null },
  { service: "Ensaio REPOSICIONAMENTO", estimated: 500, proposal: 800, closed: null },
  { service: "Cobertura de evento", estimated: 2000, proposal: 2000, closed: 2500 },
  { service: "Captação de vídeo", estimated: null, proposal: 400, closed: null },
  { service: "Workshop", estimated: null, proposal: null, closed: null },
];

describe("visão estratégica do kanban", () => {
  it("separa, em uma coluna, estimado, proposta e fechado", () => {
    const lines = strategyLines(cards, "valores");
    expect(lines.find(line => line.label === "Estimado")).toEqual({ label: "Estimado", count: 1, total: 1000 });
    expect(lines.find(line => line.label === "Proposta")).toEqual({ label: "Proposta", count: 2, total: 1200 });
    expect(lines.find(line => line.label === "Fechado")).toEqual({ label: "Fechado", count: 1, total: 2500 });
    expect(lines.find(line => line.label === "Sem valor")).toEqual({ label: "Sem valor", count: 1, total: 0 });
  });

  it("soma o valor em jogo de cada categoria na coluna", () => {
    const lines = strategyLines(cards, "categorias");
    expect(lines.find(line => line.label === "Ensaio")).toEqual({ label: "Ensaio", count: 2, total: 1800 });
    expect(lines.find(line => line.label === "Evento")).toEqual({ label: "Evento", count: 1, total: 2500 });
    expect(lines.find(line => line.label === "Captação")).toEqual({ label: "Captação", count: 1, total: 400 });
    expect(lines.find(line => line.label === "Plano EXPANSÃO")).toEqual({ label: "Plano EXPANSÃO", count: 0, total: 0 });
    expect(lines.find(line => line.label === "Outros")).toEqual({ label: "Outros", count: 1, total: 0 });
  });
});
