import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/store", () => ({
  useGarro: () => ({
    state: {
      demands: [{ status: "Entregue" }, { status: "Em produção" }, { status: "Em produção" }],
      opportunities: [{ stage: "Lead" }, { stage: "Bolo" }],
      kanbanLabels: { Bolo: "Quase lá" },
    },
  }),
}));

import { ManagerPies } from "./manager-pies";

describe("pizzas da visão geral", () => {
  it("mostra demandas e comercial com cores diferentes", () => {
    const html = renderToStaticMarkup(createElement(ManagerPies));
    expect(html).toContain("Demandas por etapa");
    expect(html).toContain("Comercial por etapa");
    expect(html).toContain(">Entregue<");
    expect(html).toContain(">Quase lá<");
    expect(html).not.toContain(">Nova demanda<");
    expect(html.match(/fill="#/g)?.length).toBeGreaterThan(1);
  });
});
