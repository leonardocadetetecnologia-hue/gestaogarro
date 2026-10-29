import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { State } from "@/lib/data";

const { context } = vi.hoisted(() => ({
  context: { role: "GESTOR_GARRO", state: { customers: [], opportunities: [], demands: [], deliverables: [], editors: [], schedule: [], alerts: [] } as State },
}));
vi.mock("@/lib/store", () => ({ useGarro: () => context }));
import { AttendantMonitor } from "./attendant-monitor";

describe("menu monitoramento", () => {
  it("mostra entrada, saída e o movimento da atendente para a Gestora", () => {
    context.role = "GESTOR_GARRO";
    context.state = {
      ...context.state,
      activity: [
        { id: "in", at: "2026-10-29T12:00:00.000Z", attendantId: "ana", attendantName: "Ana", kind: "acesso", title: "Entrou", detail: "", contact: "" },
        { id: "out", at: "2026-10-29T21:00:00.000Z", attendantId: "ana", attendantName: "Ana", kind: "acesso", title: "Saiu", detail: "", contact: "" },
        { id: "move", at: "2026-10-29T15:00:00.000Z", attendantId: "ana", attendantName: "Ana", kind: "movimentacao", title: "Moveu o card", detail: "Nefrostar · De Lead para Tentativa de contato", contact: "Nefrostar" },
      ],
    };
    const html = renderToStaticMarkup(createElement(AttendantMonitor));
    expect(html).toContain("Monitoramento");
    expect(html).toContain("Ana");
    expect(html).toContain("Entrou");
    expect(html).toContain("Saiu");
    expect(html).toContain("Nefrostar · De Lead para Tentativa de contato");
  });

  it("não revela o acompanhamento para outro perfil", () => {
    context.role = "ATENDENTE";
    const html = renderToStaticMarkup(createElement(AttendantMonitor));
    expect(html).toContain("somente para a Gestora");
    expect(html).not.toContain("Nefrostar");
  });
});
