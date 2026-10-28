import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DeliverableStatusBar, deliverableStatusSummary } from "./deliverable-status";

describe("barra de status dos entregáveis", () => {
  it("resume só as etapas que existem no projeto", () => {
    expect(deliverableStatusSummary([
      { status: "A iniciar" },
      { status: "Em edição" },
      { status: "Aprovado" },
      { status: "Aprovado" },
    ]).map(item => item.label)).toEqual(["1 a iniciar", "1 em edição", "2 aprovados"]);
  });

  it("desenha a barra com a leitura das quantidades", () => {
    const html = renderToStaticMarkup(createElement(DeliverableStatusBar, { tasks: [{ status: "Correção" }, { status: "Em revisão" }] }));
    expect(html).toContain('aria-label="2 entregáveis: 1 em revisão, 1 correção"');
    expect(html).toContain("deliverable-status-bar");
    expect(html).toContain("deliverable-status-review");
    expect(html).toContain("deliverable-status-fix");
  });

  it("não desenha a barra quando o projeto não tem entregáveis", () => {
    expect(renderToStaticMarkup(createElement(DeliverableStatusBar, { tasks: [] }))).toBe("");
  });
});
