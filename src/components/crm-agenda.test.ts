import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { State } from "@/lib/data";

const { context, query } = vi.hoisted(() => ({
  context: {
    state: { customers: [], opportunities: [], demands: [], deliverables: [], editors: [], schedule: [], alerts: [] } as State,
    role: "GESTOR_GARRO", activeEditorId: "manager", busy: false, error: "", closeSale: vi.fn(), moveOpportunity: vi.fn(),
  },
  query: { get: vi.fn() },
}));
vi.mock("@/lib/store", () => ({ useGarro: () => context }));
vi.mock("next/navigation", () => ({ useSearchParams: () => query }));
import { ClosingModal, CommercialKanban } from "./CRM";
import { AgendaView } from "./Agenda";
import { TaskAssignment } from "./task-assignment";

beforeEach(() => {
  context.role = "GESTOR_GARRO"; context.activeEditorId = "manager"; context.busy = false; context.error = ""; query.get.mockReturnValue(null);
  context.state = {
    customers: [{ id: "customer", name: "Cliente de teste", phone: "", email: "", company: "", origin: "Site", notes: "", city: "", service: "Vídeo" }],
    opportunities: [{ id: "opportunity", customerId: "customer", stage: "Fechado com sucesso", value: 14000.5, priority: "Média", lastActivity: "2026-10-14T15:00:00Z", waitingOn: "nenhum", nextAction: "", history: [] }],
    demands: [], deliverables: [], editors: [], schedule: [], alerts: [],
  };
});

describe("ação de envio no Kanban", () => {
  it("oferece Enviar para produção em Fechado com sucesso sem demanda", () => {
    const html = renderToStaticMarkup(createElement(CommercialKanban));
    expect(html).toContain("Enviar para produção"); expect(html).toContain("14.000,50");
    expect(html).toContain("Reunião agendada"); expect(html).not.toContain("Novo contato");
  });
  it("mostra o envio concluído e remove a ação que duplicaria a demanda", () => {
    context.state.opportunities[0].demandId = "demand";
    const html = renderToStaticMarkup(createElement(CommercialKanban));
    expect(html).toContain("Enviado para produção"); expect(html).not.toContain("Enviar para produção");
  });
  it("não permite envio a partir de uma etapa intermediária", () => {
    context.state.opportunities[0].stage = "Follow-up";
    expect(renderToStaticMarkup(createElement(CommercialKanban))).not.toContain("Enviar para produção");
  });
  it("exibe confirmação, briefing, prazo e entregáveis antes do envio", () => {
    const html = renderToStaticMarkup(createElement(ClosingModal, { opportunity: context.state.opportunities[0], onClose: vi.fn() }));
    expect(html).toContain("Confirmar envio para produção"); expect(html).toContain("Briefing e detalhes da produção");
    expect(html).toContain("horário de Brasília"); expect(html).toContain("Entregáveis (um por linha)");
    context.busy = true;
    expect(renderToStaticMarkup(createElement(ClosingModal, { opportunity: context.state.opportunities[0], onClose: vi.fn() }))).toContain("Enviando…");
  });
});

describe("agenda por perfil e origem", () => {
  const event = { id: "event", title: "Revisar entrega", category: "Revisão" as const, userId: "manager", at: "2026-10-14T15:00:00Z", origin: "Produção" as const, responsibleName: "Gestora de teste", responsibleRole: "GESTOR_GARRO" as const, demandId: "demand" };
  it("mostra o perfil e o nome do responsável no compromisso", () => {
    context.state.schedule = [{ ...event, at: new Date().toISOString() }];
    const html = renderToStaticMarkup(createElement(AgendaView));
    expect(html).toContain("Agenda Global"); expect(html).toContain("Gestora · Gestora de teste"); expect(html).toContain("Produção");
    expect(html).toContain("Ver detalhes: Revisar entrega");
  });
  it("restringe a agenda da atendente aos seus compromissos", () => {
    context.role = "ATENDENTE"; context.activeEditorId = "attendant";
    context.state.schedule = [{ ...event, at: new Date().toISOString() }];
    const html = renderToStaticMarkup(createElement(AgendaView));
    expect(html).toContain("Agenda Comercial"); expect(html).not.toContain("Agenda Global"); expect(html).not.toContain("Revisar entrega");
    context.activeEditorId = "manager";
  });
});

it("oferece a própria Gestora como responsável pela edição com confirmação e prazo", () => {
  context.state.editors = [{ id: "manager", name: "Gestora de teste", email: "manager@example.test", active: true, role: "GESTOR_GARRO" }];
  const html = renderToStaticMarkup(createElement(TaskAssignment, { task: { id: "task", demandId: "demand", title: "Vídeo", editorId: "", status: "A iniciar", editorDue: "", reviewDue: "", clientDue: "", progress: 0 } }));
  expect(html).toContain("eu · Gestora"); expect(html).toContain("Salvar atribuição e prazos"); expect(html).toContain("Prazo da edição (Brasília)");
});
