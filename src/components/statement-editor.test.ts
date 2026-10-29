import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { StatementActivity } from "@/modules/reports/delivery-statement";

vi.mock("./garro-brand", () => ({ GarroBrand: () => createElement("span", null, "Garro") }));
import { StatementEditor } from "./statement-editor";

const activity: StatementActivity = {
  id: "item", demandId: "demand", customerId: "ana", customerName: "Ana Lima",
  service: "Ensaio", title: "Revelação", description: "Seleção entregue.", deliveredAt: "2026-10-18T18:00:00.000Z", number: 1,
};

describe("janela de ajuste do relatório", () => {
  it("abre a edição antes do PDF, com data, sem data e observação", () => {
    const html = renderToStaticMarkup(createElement(StatementEditor, { activities: [activity], onClose: vi.fn() }));
    expect(html).toContain('aria-label="Ajustar o relatório"');
    expect(html).toContain(">Um relatório só</button>");
    expect(html).toContain(">Um para cada entrega</button>");
    expect(html).toContain("Nome do cliente");
    expect(html).toContain("value=\"Ana Lima\"");
    expect(html).toContain("Descrição");
    expect(html).toContain("Data de entrega");
    expect(html).toContain("value=\"2026-10-18\"");
    expect(html).not.toContain("Informação");
    expect(html).not.toContain("Formato do período");
    expect(html).not.toContain("1. Revelação");
    expect(html).not.toContain(">Revelação<");
    expect(html).not.toContain("O que a Garro entregou");
    expect(html).not.toContain("Inserir observação");
    expect(html).not.toContain("Incluir este item");
    expect(html).toContain(">Gerar prévia</button>");
    expect(html).toContain(">Gerar PDF</button>");
    expect(html).toContain("disabled=\"\"");
    expect(html).not.toContain("Prévia do relatório");
  });
});