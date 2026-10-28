import { describe, expect, it } from "vitest";
import type { Deliverable, Demand } from "@/lib/data";
import { deliverableColumn, deliverableKinds, deliveredRecords, demandMatchesKind, productionCards } from "./production-board";

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

  it("usa o tipo gravado e deixa o nome só quando o entregável diz o outro material", () => {
    const videoJob = demand({ title: "FOTOS", service: "Ensaio", mediaType: "VIDEO" });
    expect(deliverableKinds(task({ title: "Seleção" }), videoJob)).toEqual(["Vídeo"]);
    expect(deliverableKinds(task({ title: "Fotos" }), videoJob)).toEqual(["Foto"]);
    expect(deliverableKinds(task({ title: "Captação de foto e vídeo" }), videoJob)).toEqual(["Foto", "Vídeo"]);
    expect(deliverableKinds(task({ title: "Reel" }), demand({ title: "Institucional", mediaType: "FOTO_E_VIDEO" }))).toEqual(["Foto", "Vídeo"]);
    expect(deliverableKinds(task({ title: "Fotos" }), demand({ title: "Institucional", mediaType: "FOTO_E_VIDEO" }))).toEqual(["Foto"]);
    const plan = demand({ title: "Mensal", service: "Plano EXPANSÃO", mediaType: "FOTO" });
    expect(deliverableKinds(task({ title: "Seleção" }), plan)).toEqual(["Foto", "Plano EXPANSÃO"]);
    expect(deliverableKinds(task({ title: "Vídeo do mês" }), plan)).toEqual(["Vídeo", "Plano EXPANSÃO"]);
    expect(deliverableKinds(task({ title: "Curso" }), demand({ title: "Mentoria", service: "Curso e mentoria para fotógrafos", mediaType: "FOTO" }))).toEqual(["Foto"]);
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

  it("filtra pelo tipo da demanda e mantém foto explícita dentro de um vídeo", () => {
    const typed = demand({ id: "job", title: "Casamento", mediaType: "VIDEO" });
    const reel = task({ id: "reel", demandId: "job", title: "Reel", status: "Em edição" });
    const photos = task({ id: "fotos-item", demandId: "job", title: "Fotos", status: "A iniciar", editorId: "" });
    const cards = (kind: "Foto" | "Vídeo") => productionCards({
      ...base, demands: [typed], deliverables: [reel, photos], split: "entregavel", kind,
    }).map((card) => card.id);
    expect(cards("Vídeo")).toEqual(["reel"]);
    expect(cards("Foto")).toEqual(["fotos-item"]);
    expect(productionCards({ ...base, demands: [typed], deliverables: [reel], split: "projeto", kind: "Vídeo" }).map((card) => card.id)).toEqual(["job"]);
    expect(productionCards({ ...base, demands: [typed], deliverables: [reel], split: "projeto", kind: "Foto" })).toEqual([]);
    expect(productionCards({
      ...base, demands: [demand({ id: "ambos", title: "Institucional", mediaType: "FOTO_E_VIDEO" })],
      deliverables: [task({ id: "reel-ambos", demandId: "ambos", title: "Reel" })], split: "projeto", kind: "Foto",
    }).map((card) => card.id)).toEqual(["ambos"]);
    const photoOnly = demand({ title: "Vídeo institucional", mediaType: "FOTO" });
    expect(demandMatchesKind(photoOnly, [], "Foto")).toBe(true);
    expect(demandMatchesKind(photoOnly, [], "Vídeo")).toBe(false);
    expect(demandMatchesKind(demand({ title: "Plano EXPANSÃO", mediaType: "FOTO" }), [], "Plano EXPANSÃO")).toBe(true);
    expect(demandMatchesKind(demand({ title: "Plano EXPANSÃO", mediaType: "FOTO" }), [], "Vídeo")).toBe(false);
  });

  it("mantém no quadro só a entrega do mês escolhido e guarda o restante no histórico", () => {
    const older = demand({ id: "setembro", status: "Entregue", createdAt: "2026-09-02T15:00:00.000Z" });
    const current = demand({ id: "outubro", title: "Analu", status: "Entregue", createdAt: "2026-10-02T15:00:00.000Z" });
    const active = demand();
    const cards = productionCards({
      ...base,
      demands: [active, older, current],
      deliverables: [
        task(),
        task({ id: "setembro-item", demandId: "setembro", status: "Aprovado", clientDeliveredAt: "2026-09-20T18:00:00.000Z" }),
        task({ id: "outubro-item", demandId: "outubro", title: "Revelação", status: "Aprovado", clientDeliveredAt: "2026-10-18T18:00:00.000Z" }),
      ],
      split: "projeto",
      month: "2026-10",
    });
    expect(cards.map((card) => card.id)).toEqual(["ensaio", "outubro"]);
    const history = deliveredRecords(
      [older, current],
      [
        task({ id: "setembro-item", demandId: "setembro", title: "ESSENCE", status: "Aprovado", clientDeliveredAt: "2026-09-20T18:00:00.000Z" }),
        task({ id: "outubro-item", demandId: "outubro", title: "Revelação", status: "Aprovado", clientDeliveredAt: "2026-10-18T18:00:00.000Z" }),
      ],
      base.customers,
    );
    expect(history.map((row) => [row.id, row.month, row.done])).toEqual([
      ["outubro", "2026-10", "Revelação"],
      ["setembro", "2026-09", "ESSENCE"],
    ]);
  });

  it("respeita editor, cliente e acento na busca", () => {
    expect(productionCards({ ...input, split: "entregavel", editorId: "editor" }).map((card) => card.id)).toEqual(["video"]);
    expect(productionCards({ ...input, split: "projeto", query: "joicy" }).map((card) => card.id)).toEqual(["fotos-job"]);
    expect(productionCards({ ...input, split: "entregavel", query: "vídeo x" }).map((card) => card.id)).toEqual(["video"]);
  });
});
