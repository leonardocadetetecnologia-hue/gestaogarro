import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Opportunity, State } from "@/lib/data";
import { stages } from "@/lib/data";

const { context } = vi.hoisted(() => ({
  context: {
    state: { customers: [], opportunities: [], demands: [], deliverables: [], editors: [], schedule: [], alerts: [], assignees: [{ id: "malu", name: "Malu", role: "ATENDENTE" }, { id: "garro", name: "Gestora Garro", role: "GESTOR_GARRO" }] } as State,
    busy: false, error: "",
    moveOpportunity: vi.fn(), loseOpportunity: vi.fn(), saveFutureContact: vi.fn(), saveKanbanLabels: vi.fn(),
  },
}));
vi.mock("@/lib/store", () => ({ useGarro: () => context }));
import { KanbanLabelEditor } from "./kanban-labels";
import { ReturnContactModal } from "./return-contact";

const opportunity = { id: "card", customerId: "customer", responsibleId: "malu", stage: "Lead", value: null, priority: "Média", lastActivity: "2026-10-27T12:00:00.000Z", waitingOn: "nenhum", nextAction: "", history: [] } as Opportunity;

describe("pergunta de retorno", () => {
  it("pergunta o contato futuro em Sem interesse", () => {
    const html = renderToStaticMarkup(createElement(ReturnContactModal, { opportunity, kind: "sem-interesse", onClose: vi.fn() }));
    expect(html).toContain("Deverá entrar em contato no futuro?");
    expect(html).not.toContain("Motivo");
  });

  it("pede o motivo da perda e a data de reativação só quando houver novo contato", () => {
    const html = renderToStaticMarkup(createElement(ReturnContactModal, { opportunity, kind: "perdido", onClose: vi.fn() }));
    expect(html).toContain("Motivo");
    expect(html).toContain("Preço");
    expect(html).toContain("Adiou / sem orçamento agora");
    expect(html).toContain("Entrar em contato novamente?");
    expect(html).not.toContain("Reativar em");
    expect(html).not.toContain("Tempo de retorno");
    expect(html).not.toContain("Responsável pelo retorno");
  });

  it("mostra os nomes atuais para a Gestora editar", () => {
    const html = renderToStaticMarkup(createElement(KanbanLabelEditor));
    expect(html).toContain("Edição de kanban");
    for (const stage of stages) expect(html).toContain(stage);
  });
});
