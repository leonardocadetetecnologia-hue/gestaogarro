import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { State } from "@/lib/data";

const { context } = vi.hoisted(() => ({
  context: { role: "GESTOR_GARRO", state: { customers: [], opportunities: [], demands: [], deliverables: [], editors: [], schedule: [], alerts: [] } as State },
}));
vi.mock("@/lib/store", () => ({ useGarro: () => context }));
import { CustomerArchive } from "./customer-archive";

describe("menu banco de dados", () => {
  it("mostra o histórico para a Gestora", () => {
    context.role = "GESTOR_GARRO";
    context.state = {
      ...context.state,
      customers: [{ id: "ana", kind: "LEAD", name: "Ana Cliente", phone: "31999999999", email: "", origin: "Instagram", company: "", city: "", service: "", notes: "" }],
      opportunities: [{ id: "card", customerId: "ana", responsibleName: "Malu", stage: "Sem interesse", value: null, priority: "Média", lastActivity: "2026-10-20T12:00:00.000Z", waitingOn: "nenhum", nextAction: "", history: [{ at: "2026-10-20T12:00:00.000Z", description: "Sem interesse. Sem contato futuro.", author: "Malu" }] }],
    };
    const html = renderToStaticMarkup(createElement(CustomerArchive));
    expect(html).toContain("Banco de dados");
    expect(html).toContain("Ana Cliente");
    expect(html).toContain("Instagram");
    expect(html).toContain('aria-label="Filtrar serviço"');
    expect(html).toContain(">Evento</option>");
    expect(html).toContain(">Ensaio</option>");
    expect(html).toContain(">Captação</option>");
    expect(html).toContain(">Plano EXPANSÃO</option>");
  });

  it("não revela a base para outro perfil", () => {
    context.role = "ATENDENTE";
    const html = renderToStaticMarkup(createElement(CustomerArchive));
    expect(html).toContain("somente para a Gestora");
    expect(html).not.toContain("Ana Cliente");
  });
});
