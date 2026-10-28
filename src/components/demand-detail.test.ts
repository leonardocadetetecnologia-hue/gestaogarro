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
    expect(html).toContain("Link de Entrega");
    expect(html).toContain('aria-label="Incluir outro link de entrega"');
    expect(html).toContain("Salvar links");
    expect(html).not.toContain("Exportar PDF");
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
    expect(html).toContain("Nenhum link de entrega informado.");
    expect(html).not.toContain("Incluir outro link de entrega");
    expect(html).not.toContain("Salvar links");
    expect(html).not.toContain("Exportar PDF");
  });

  it("abre dois links quando a demanda é foto e vídeo e numera pela criação", () => {
    context.state.demands[0] = { ...demand, mediaType: "FOTO_E_VIDEO", deliveryLinks: [] };
    context.state.deliverables = [
      { id: "task-1", demandId: "iandra", title: "Segundo corte", number: 2, createdAt: "2026-10-28T12:00:00.000Z", editorId: "manager", status: "Aprovado", editorDue: "", reviewDue: "", clientDue: "", progress: 100 },
      { id: "task-8", demandId: "iandra", title: "Primeiro corte", number: 1, createdAt: "2026-10-27T12:00:00.000Z", editorId: "manager", status: "A iniciar", editorDue: "", reviewDue: "", clientDue: "", progress: 0 },
    ];
    const html = renderToStaticMarkup(createElement(DemandDetail, { id: "iandra" }));
    expect(html).toContain('aria-label="Link de entrega 1"');
    expect(html).toContain('aria-label="Link de entrega 2"');
    expect(html).toContain('placeholder="Link das fotos"');
    expect(html).toContain('placeholder="Link dos vídeos"');
    const first = html.indexOf('class="task-number">1<');
    const title = html.indexOf("Primeiro corte");
    const second = html.indexOf('class="task-number">2<');
    expect(first).toBeGreaterThan(-1);
    expect(first).toBeLessThan(title);
    expect(title).toBeLessThan(second);
    expect(second).toBeLessThan(html.indexOf("Segundo corte"));
  });

  it("mostra o link salvo para o editor copiar e o PDF só na demanda entregue", () => {
    context.role = "EDITOR";
    context.activeEditorId = "manager";
    context.state.demands[0] = { ...demand, deliveryLinks: ["https://entrega.example/fotos"] };
    const editorHtml = renderToStaticMarkup(createElement(DemandDetail, { id: "iandra" }));
    expect(editorHtml).toContain("https://entrega.example/fotos");
    expect(editorHtml).toContain(">Copiar</button>");
    expect(editorHtml).toContain('href="https://entrega.example/fotos"');
    expect(editorHtml).not.toContain("Incluir outro link de entrega");
    expect(editorHtml).not.toContain("Exportar PDF");

    context.role = "GESTOR_GARRO";
    context.state.demands[0] = { ...demand, status: "Entregue" };
    const doneHtml = renderToStaticMarkup(createElement(DemandDetail, { id: "iandra" }));
    expect(doneHtml).toContain("Exportar PDF");
    expect(doneHtml).toContain('aria-label="Mês do relatório"');
    expect(doneHtml).toContain('aria-label="Tipo de período do relatório"');
    expect(doneHtml).not.toContain('aria-label="Início do período"');
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
