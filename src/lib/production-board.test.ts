import { describe, expect, it } from "vitest";
import type { Deliverable, Demand } from "@/lib/data";
import { deliverableColumn, deliverableKinds, productionCards } from "./production-board";

const demand = (patch: Partial<Demand> = {}): Demand => ({
  id: "ensaio", customerId: "dani", title: "Ensaio REPOSICIONAMENTO", description: "", status: "Em produção",
  clientDue: "2026-11-10T02:59:00.000Z", briefing: "", links: "", createdAt: "2026-10-20T12:00:00.000Z", messages: [], ...patch,
});

const task = (patch: Partial<Deliverable> = {}): Deliverable => ({
  id: "video", demandId: "ensaio", title: "Vídeo X", editorId: "editor", status: "Em edição",
  editorDue: "2026-10-20T12:00:00.000Z", reviewDue: "", clientDue: "", progress: 20, ...patch,
});

const base = {
  customers: [{ id: "dani", name: "Danielle Portella" }, { id: "joicy", name: "Joicy Kelly de Souza" }],
  editorId: "Todos",
  query: "",
  kind: "Todos" as const,
};

describe("tipo do material", () => {
  const project = demand();

  it("lê foto e vídeo no nome do entregável e não trata fotógrafo como foto", () => {
    expect(deliverableKinds(task({ title: "FOTOS" }), project)).toEqual(["Foto"]);
    expect(deliverableKinds(task({ title: "Vídeo Y" }), project)).toEqual(["Vídeo"]);
    expect(deliverableKinds(task({ title: "Captação de foto e vídeo" }), project)).toEqual(["Foto", "Vídeo"]);
    expect(deliverableKinds(task({ title: "Curso para fotógrafos" }), demand({ title: "Mentoria", service: "Curso e mentoria para fotógrafos" }))).toEqual([]);
    expect(deliverableKinds(task({ title: "Videomaker" }), demand({ title: "Institucional", service: "" }))).toEqual([]);
  });

  it("herda o tipo do projeto quando o entregável não diz foto nem vídeo", () => {
    expect(deliverableKinds(task({ title: "Seleção" }), demand({ title: "FOTOS" }))).toEqual(["Foto"]);
    expect(deliverableKinds(task({ title: "Reel" }), demand({ title: "Captação de vídeo" }))).toEqual(["Vídeo"]);
    expect(deliverableKinds(task({ title: "Fotos" }), demand({ title: "Captação de vídeo" }))).toEqual(["Foto"]);
  });

  it("mantém o plano mesmo quando o material tem tipo próprio", () => {
    const plan = demand({ title: "Pacote mensal", service: "Plano EXPANSÃO" });
    expect(deliverableKinds(task({ title: "Vídeo X" }), plan)).toEqual(["Vídeo", "Plano EXPANSÃO"]);
    expect(deliverableKinds(task({ title: "Fotos" }), plan)).toEqual(["Foto", "Plano EXPANSÃO"]);
  });
});

describe("coluna do entregável", () => {
  it("coloca cada material na etapa dele, e o já entregue ao cliente em Entregue", () => {
    const project = demand({ status: "Em produção" });
    expect(deliverableColumn(task({ status: "A iniciar" }), project)).toBe("Nova demanda");
    expect(deliverableColumn(task({ status: "Em edição" }), project)).toBe("Em produção");
    expect(deliverableColumn(task({ status: "Em revisão" }), project)).toBe("Em revisão");
    expect(deliverableColumn(task({ status: "Correção" }), project)).toBe("Correção");
    expect(deliverableColumn(task({ status: "Aprovado" }), project)).toBe("Aprovada");
    expect(deliverableColumn(task({ status: "Aprovado", clientDeliveredAt: "2026-10-25T15:00:00.000Z" }), project)).toBe("Entregue");
    expect(deliverableColumn(task({ status: "Aprovado" }), demand({ status: "Entregue" }))).toBe("Entregue");
    expect(deliverableColumn(task({ status: "Em edição" }), demand({ status: "Entregue" }))).toBe("Em produção");
  });
});

describe("cartões do quadro", () => {
  const video = task();
  const photos = task({ id: "fotos", title: "Fotos", status: "A iniciar", editorId: "outra", progress: 0 });
  const input = {
    ...base,
    demands: [demand(), demand({ id: "fotos-job", customerId: "joicy", title: "FOTOS", status: "Nova demanda", service: "Ensaio PESSOAL" })],
    deliverables: [video, photos, task({ id: "joicy", demandId: "fotos-job", title: "Seleção", status: "A iniciar", editorId: "" })],
  };

  it("no projeto mantém um cartão na coluna da demanda", () => {
    const cards = productionCards({ ...input, split: "projeto" });
    expect(cards.map((card) => [card.id, card.column])).toEqual([["ensaio", "Em produção"], ["fotos-job", "Nova demanda"]]);
  });

  it("no entregável separa foto e vídeo em colunas diferentes", () => {
    const cards = productionCards({ ...input, split: "entregavel" });
    expect(cards.map((card) => card.split === "entregavel" ? [card.task.title, card.column] : [])).toEqual([
      ["Vídeo X", "Em produção"],
      ["Fotos", "Nova demanda"],
      ["Seleção", "Nova demanda"],
    ]);
  });

  it("filtra o tipo sem misturar o outro material do mesmo cliente", () => {
    const photosOnly = productionCards({ ...input, split: "entregavel", kind: "Foto" });
    expect(photosOnly.map((card) => card.id)).toEqual(["fotos", "joicy"]);
    const videosOnly = productionCards({ ...input, split: "entregavel", kind: "Vídeo" });
    expect(videosOnly.map((card) => card.id)).toEqual(["video"]);
    const plan = productionCards({
      ...input,
      demands: [demand({ service: "Plano EXPANSÃO" })],
      deliverables: [video, photos],
      split: "projeto",
      kind: "Plano EXPANSÃO",
    });
    expect(plan.map((card) => card.id)).toEqual(["ensaio"]);
  });

  it("respeita editor, cliente e acento na busca", () => {
    expect(productionCards({ ...input, split: "entregavel", editorId: "editor" }).map((card) => card.id)).toEqual(["video"]);
    expect(productionCards({ ...input, split: "projeto", query: "joicy" }).map((card) => card.id)).toEqual(["fotos-job"]);
    expect(productionCards({ ...input, split: "entregavel", query: "vídeo x" }).map((card) => card.id)).toEqual(["video"]);
  });
});
