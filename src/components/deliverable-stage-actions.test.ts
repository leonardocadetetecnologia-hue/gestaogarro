import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DeliverableStageActions } from "./deliverable-stage-actions";

describe("ações da esteira", () => {
  it("no aprovado oferece correção e a volta para revisão", () => {
    const onStatus = vi.fn();
    const html = renderToStaticMarkup(createElement(DeliverableStageActions, { status: "Aprovado", onStatus }));
    expect(html).toContain(">Solicitar correção</button>");
    expect(html).toContain(">Voltar para revisão</button>");
    expect(html).not.toContain(">Aprovar</button>");
  });
});
