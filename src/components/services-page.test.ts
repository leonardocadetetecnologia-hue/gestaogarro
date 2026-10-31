import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { CatalogService, State } from "@/lib/data";

const session = { role: "GESTOR_GARRO" };
const service: CatalogService = {
  id: "exp", name: "Plano EXP", category: "PLANOS", description: "Assinatura de captação.",
  referencePrice: null, priceType: "FECHADO", deliveryDays: null, hasSelection: false, selectionDays: null,
  recurrence: "TRES_MESES", recurrenceDate: "", standardCost: 800, variations: [{ name: "2h · Só vídeo", referencePrice: 1400 }],
  status: "ATIVO", used: false, pending: true,
};
const event: CatalogService = {
  ...service, id: "basico", name: "Básico", category: "EVENTOS", description: "Fotos ou vídeos.",
  referencePrice: 420, priceType: "POR_HORA", standardCost: 90, variations: [], pending: false,
};
const state: State = {
  customers: [], opportunities: [], editors: [], demands: [], deliverables: [], schedule: [], alerts: [],
  services: [service, event],
  serviceProposals: [{
    id: "prop", serviceId: "exp", serviceName: "Plano EXP", action: "EDITAR", actionLabel: "Edição",
    authorId: "ana", authorName: "Ana", createdAt: "2026-10-30T18:00:00.000Z",
    changes: [{ field: "Nome", before: "Plano EXP", after: "Plano Expansão" }],
  }],
};
vi.mock("@/lib/store", () => ({ useGarro: () => ({
  state, role: session.role, busy: false,
  saveService: vi.fn(), archiveService: vi.fn(), restoreService: vi.fn(), removeService: vi.fn(), reviewServiceProposal: vi.fn(),
}) }));
import { ServicesPage } from "./services-page";

describe("página de serviços", () => {
  it("mostra custo e autorização para a Gestora", () => {
    session.role = "GESTOR_GARRO";
    const html = renderToStaticMarkup(createElement(ServicesPage));
    expect(html).toContain("Novo serviço");
    expect(html).toContain(">Custo<");
    expect(html).toContain("Alteração pendente");
    expect(html).toContain("Autorizar");
    expect(html).toContain("Plano Expansão");
    expect(html).toContain("−10%");
    expect(html).toContain(">PDF<");
  });

  it("esconde o custo da atendente e troca a edição por proposta", () => {
    session.role = "ATENDENTE";
    const html = renderToStaticMarkup(createElement(ServicesPage));
    expect(html).toContain("Propor serviço");
    expect(html).toContain("Propor alteração");
    expect(html).not.toContain(">Custo<");
    expect(html).not.toContain("R$ 800,00");
    expect(html).not.toContain("Autorizar");
    expect(html).toContain("Aguardando a Gestora");
  });

  it("nega a página ao editor", () => {
    session.role = "EDITOR";
    const html = renderToStaticMarkup(createElement(ServicesPage));
    expect(html).toContain("Os serviços são do comercial.");
  });
});
