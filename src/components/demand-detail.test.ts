import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { State } from "@/lib/data";

const { context, push } = vi.hoisted(() => ({
  context: {
    state: { customers: [], opportunities: [], demands: [], deliverables: [], editors: [], schedule: [], alerts: [] } as State,
    role: "GESTOR_GARRO", activeEditorId: "manager", busy: false, error: "",
    createDemand: vi.fn(), sendMessage: vi.fn(), setTaskStatus: vi.fn(), markDelivered: vi.fn(), assignEditor: vi.fn(), updateTaskDue: vi.fn(),
  },
  push: vi.fn(),
}));
vi.mock("@/lib/store", () => ({ useGarro: () => context }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
import { DemandDetail, EditorHome } from "./Production";

const demand = { id: "iandra", customerId: "customer", title: "IANDRA", description: "Briefing", status: "Nova demanda" as const, clientDue: "2026-11-03T17:58:00.000Z", briefing: "Ainda vou colocar", links: "", createdAt: "2026-10-27T17:59:00.000Z", messages: [] };

beforeEach(() => {
  context.role = "GESTOR_GARRO";
  context.state = {
    customers: [{ id: "customer", kind: "CLIENTE", name: "Iandra Vilaça", phone: "", email: "", company: "", origin: "Site", notes: "", city: "", service: "" }],
    opportunities: [], editors: [], schedule: [], alerts: [],
    demands: [
      demand,
      { ...demand, id: "outra", title: "Segunda demanda", createdAt: "2026-10-28T17:59:00.000Z" },
    ],
    deliverables: [
      { id: "task-8", demandId: "iandra", title: "8- VINI COM ELE MESMO", editorId: "manager", status: "A iniciar", editorDue: "", reviewDue: "", clientDue: "", progress: 0 },
      { id: "task-1", demandId: "iandra", title: "1- NEW TECH", editorId: "manager", status: "Aprovado", editorDue: "", reviewDue: "", clientDue: "", progress: 100 },
    ],
  };
});

describe("nova demanda dentro do projeto", () => {
  it("oferece o botão e deixa as demandas do cliente recolhidas", () => {
    const html = renderToStaticMarkup(createElement(DemandDetail, { id: "iandra" }));
    expect(html).toContain("Nova demanda</button>");
    expect(html).toContain(">Editar</button>");
    expect(html).toContain(">Novo</button>");
    expect(html).toContain(">Atribuir vários</button>");
    expect(html).toContain('aria-label="HD"');
    expect(html).toContain('aria-label="Drive"');
    expect(html).toContain("1- NEW TECH");
    expect(html).toContain(">Aprovado</span>");
    expect(html).not.toContain("Salvar atribuição e prazos");
    expect(html).not.toContain("datetime-local");
    expect(html.indexOf("1- NEW TECH")).toBeLessThan(html.indexOf("8- VINI COM ELE MESMO"));
    expect(html).toContain("Demandas de Iandra Vilaça");
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain("IANDRA");
    expect(html).not.toContain("Segunda demanda");
    expect(html).not.toContain('aria-current="true"');
  });

  it("não oferece o botão ao editor", () => {
    context.role = "EDITOR";
    context.activeEditorId = "manager";
    const html = renderToStaticMarkup(createElement(DemandDetail, { id: "iandra" }));
    expect(html).not.toContain("Nova demanda</button>");
    expect(html).not.toContain(">Novo</button>");
    expect(html).not.toContain(">Atribuir vários</button>");
    expect(html).not.toContain(">Editar</button>");
    expect(html).not.toContain("Demandas de Iandra Vilaça");
  });
});

describe("trabalhos atribuídos da Gestora", () => {
  it("mostra o cliente em cada trabalho e oferece filtro pelos clientes atribuídos", () => {
    context.activeEditorId = "manager";
    context.state.customers.push({ id: "outro", kind: "CLIENTE", name: "Ana Costa", phone: "", email: "", company: "", origin: "Site", notes: "", city: "", service: "" });
    context.state.demands.push({ ...demand, id: "ana", customerId: "outro", title: "Campanha Ana" });
    context.state.deliverables.push({ id: "task-ana", demandId: "ana", title: "Reel da Ana", editorId: "manager", status: "Em edição", editorDue: "", reviewDue: "", clientDue: "", progress: 20 });
    const html = renderToStaticMarkup(createElement(EditorHome));
    expect(html).toContain("Iandra Vilaça");
    expect(html).toContain("Ana Costa");
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain("Reel da Ana");
    expect(html).not.toContain("8- VINI COM ELE MESMO");
    expect(html).toContain('aria-label="Filtrar etapa"');
    expect(html).toContain("Todas as etapas");
    expect(html).toContain(">Em edição</option>");
    expect(html).toContain(">Aprovado</option>");
    expect(html).toContain(">Atrasado</option>");
    expect(html).toContain(">Concluído</option>");
    expect(html).toContain('aria-label="Filtrar cliente"');
    expect(html).toContain("Todos os clientes");
    expect(html.indexOf(">Ana Costa</option>")).toBeLessThan(html.indexOf(">Iandra Vilaça</option>"));
  });
});
