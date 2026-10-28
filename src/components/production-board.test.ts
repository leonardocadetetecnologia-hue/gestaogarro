import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { State } from "@/lib/data";

const session = { role: "EDITOR" };
const state: State = {
  customers: [{ id: "dani", kind: "CLIENTE", name: "Danielle Portella", phone: "", email: "", company: "", origin: "", notes: "", city: "", service: "" }],
  opportunities: [], editors: [{ id: "editor", name: "Lia", email: "lia@garro.test", active: true }], schedule: [], alerts: [],
  demands: [{ id: "ensaio", customerId: "dani", title: "Ensaio REPOSICIONAMENTO", service: "Ensaio REPOSICIONAMENTO", description: "", status: "Em produção", clientDue: "2026-11-10T02:59:00.000Z", briefing: "", links: "", createdAt: "2026-10-20T12:00:00.000Z", messages: [] }],
  deliverables: [
    { id: "video", demandId: "ensaio", title: "Vídeo X", editorId: "editor", status: "Em edição", editorDue: "2026-10-20T12:00:00.000Z", reviewDue: "", clientDue: "", progress: 20 },
    { id: "fotos", demandId: "ensaio", title: "Fotos", editorId: "", status: "A iniciar", editorDue: "", reviewDue: "", clientDue: "", progress: 0 },
  ],
};

vi.mock("@/lib/store", () => ({ useGarro: () => ({ state, role: session.role }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
import { ProductionBoard } from "./production-board";

function columnChunk(html: string, status: string) {
  const start = html.indexOf(`<strong>${status}</strong>`);
  const next = html.indexOf('<section class="production-column"', start + 1);
  return html.slice(start, next === -1 ? undefined : next);
}

describe("quadro de produção", () => {
  it("oferece tipo e separação e, por projeto, mantém foto e vídeo no mesmo cartão", () => {
    const html = renderToStaticMarkup(createElement(ProductionBoard));
    expect(html).toContain('aria-label="Separar por"');
    expect(html).toContain(">Projeto</button>");
    expect(html).toContain(">Entregável</button>");
    expect(html).toContain('aria-label="Filtrar mês"');
    expect(html).toContain('aria-label="Filtrar tipo"');
    expect(html).not.toContain(">Entregues</button>");
    expect(html).toContain(">Foto</option>");
    expect(html).toContain(">Vídeo</option>");
    expect(html).toContain(">Plano EXPANSÃO</option>");
    expect(html).toContain("Ensaio REPOSICIONAMENTO");
    expect(html).not.toContain("Vídeo X");
    expect(html).toContain("2 entregáveis");
    expect(html).not.toContain("Foto e vídeo");
    expect(columnChunk(html, "Em produção")).toContain("Ensaio REPOSICIONAMENTO");
    expect(columnChunk(html, "Nova demanda")).not.toContain("Ensaio REPOSICIONAMENTO");
  });

  it("mostra o histórico de entregues só para a gestora", () => {
    session.role = "GESTOR_GARRO";
    try {
      const html = renderToStaticMarkup(createElement(ProductionBoard));
      expect(html).toContain(">Entregues</button>");
      expect(html).toContain('aria-label="Filtrar mês"');
    } finally {
      session.role = "EDITOR";
    }
  });

  it("por entregável coloca cada material na coluna da etapa dele", () => {
    const html = renderToStaticMarkup(createElement(ProductionBoard, { initialSplit: "entregavel" }));
    expect(columnChunk(html, "Em produção")).toContain("Vídeo X");
    expect(columnChunk(html, "Em produção")).not.toContain(">Fotos<");
    expect(columnChunk(html, "Nova demanda")).toContain(">Fotos<");
    expect(columnChunk(html, "Nova demanda")).toContain("Ensaio REPOSICIONAMENTO");
  });

  it("mostra o tipo no cartão e na lista só quando a demanda tem tipo", () => {
    state.demands[0].mediaType = "FOTO_E_VIDEO";
    try {
      const kanban = renderToStaticMarkup(createElement(ProductionBoard));
      expect(kanban).toContain("2 entregáveis · Foto e vídeo");
      const list = renderToStaticMarkup(createElement(ProductionBoard, { initialView: "lista" }));
      expect(list).toContain("Danielle Portella · 2 entregáveis · Foto e vídeo");
      const item = renderToStaticMarkup(createElement(ProductionBoard, { initialSplit: "entregavel", initialView: "lista" }));
      expect(item).toContain("Ensaio REPOSICIONAMENTO · Foto e vídeo");
    } finally {
      delete state.demands[0].mediaType;
    }
  });
});
