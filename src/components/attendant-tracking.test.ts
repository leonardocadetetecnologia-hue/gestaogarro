import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { State } from "@/lib/data";

const session = { role: "ATENDENTE" };
const state: State = {
  customers: [], opportunities: [], editors: [], schedule: [], alerts: [],
  demands: [{
    id: "ensaio", customerId: "dani", customerName: "Danielle Portella", title: "Ensaio reposicionamento",
    description: "briefing interno", status: "Em produção", clientDue: "2026-11-10T02:59:00.000Z",
    briefing: "briefing interno", links: "https://interno.example", createdAt: "2026-10-20T12:00:00.000Z", messages: [],
  }],
  deliverables: [
    { id: "video", demandId: "ensaio", title: "Vídeo principal", editorId: "editor", status: "Em edição", editorDue: "2026-11-02T02:59:00.000Z", reviewDue: "2026-11-04T02:59:00.000Z", clientDue: "2026-11-10T02:59:00.000Z", progress: 20 },
    { id: "fotos", demandId: "ensaio", title: "Seleção de fotos", editorId: "editor", status: "A iniciar", editorDue: "2026-11-03T02:59:00.000Z", reviewDue: "", clientDue: "", progress: 0 },
  ],
};
vi.mock("@/lib/store", () => ({ useGarro: () => ({ state, role: session.role }) }));
import { AttendantTracking } from "./attendant-tracking";

describe("acompanhamento da atendente", () => {
  it("mostra cliente, demanda, entregável e prazo, sem ação de edição", () => {
    session.role = "ATENDENTE";
    const html = renderToStaticMarkup(createElement(AttendantTracking));
    expect(html).toContain("Danielle Portella");
    expect(html).toContain("Ensaio reposicionamento");
    expect(html).toContain("Vídeo principal");
    expect(html).toContain("Em edição");
    expect(html).toContain("Em produção");
    expect(html).toContain("Somente visualização");
    expect(html).not.toContain(">Nova demanda</button>");
    expect(html).not.toContain("Atribuir");
    expect(html).not.toContain("briefing interno");
    expect(html).not.toContain("https://interno.example");
  });

  it("nega a página fora do perfil de atendente", () => {
    session.role = "EDITOR";
    const html = renderToStaticMarkup(createElement(AttendantTracking));
    expect(html).toContain("O acompanhamento é da atendente.");
  });
});