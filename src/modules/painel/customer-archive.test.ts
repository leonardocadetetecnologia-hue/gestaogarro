import { describe, expect, it } from "vitest";
import type { State } from "@/lib/data";
import { buildArchive, matchesServiceGroup } from "./customer-archive";

const state = {
  customers: [{ id: "ana", kind: "CLIENTE", name: "Ana Cliente", phone: "31999999999", email: "ana@example.test", origin: "Instagram", company: "", city: "", service: "Ensaio", notes: "Prefere manhã", createdAt: "2026-10-01T12:00:00.000Z", attendantName: "Malu" }],
  opportunities: [{
    id: "card", customerId: "ana", service: "Ensaio", responsibleName: "Malu", stage: "Fechado sem sucesso", value: null, priority: "Média",
    lastActivity: "2026-10-20T12:00:00.000Z", waitingOn: "nenhum", nextAction: "", lossReason: "Preço alto", lostAt: "2026-10-20T12:00:00.000Z",
    history: [
      { at: "2026-10-02T12:00:00.000Z", description: "Ligou e pediu orçamento.", author: "Malu" },
      { at: "2026-10-20T12:00:00.000Z", description: "Fechado sem sucesso: Preço alto", author: "Malu" },
    ],
  }],
  demands: [{ id: "demand", customerId: "ana", title: "Ensaio de outubro", description: "", status: "Entregue", clientDue: "2026-10-25T12:00:00.000Z", briefing: "", links: "", createdAt: "2026-10-21T12:00:00.000Z", messages: [] }],
  deliverables: [{ id: "task", demandId: "demand", title: "Fotos principais", editorId: "editor", status: "Aprovado", editorDue: "", reviewDue: "", clientDue: "", progress: 100, clientDeliveredAt: "2026-10-25T15:00:00.000Z" }],
  editors: [], schedule: [], alerts: [],
} as State;

describe("banco de dados da Gestora", () => {
  it("monta o caminho do contato até a entrega", () => {
    const [contact] = buildArchive(state);
    expect(contact.situation).toBe("Entregue");
    expect(contact.events.map(event => event.detail)).toEqual([
      "Cliente cadastrado na Garro.",
      "Ligou e pediu orçamento.",
      "Fechado sem sucesso: Preço alto",
      "Ensaio de outubro · Entregue",
      "Fotos principais entregue ao cliente.",
    ]);
    expect(contact.events[1].author).toBe("Malu");
    expect(contact.events[0].label).toBe("Cadastro");
  });

  it("agrupa o serviço em evento, ensaio, captação ou plano EXPANSÃO", () => {
    expect(matchesServiceGroup(["Ensaio PESSOAL"], "Ensaio")).toBe(true);
    expect(matchesServiceGroup(["Cobertura de evento"], "Evento")).toBe(true);
    expect(matchesServiceGroup(["Captação de vídeo"], "Captação")).toBe(true);
    expect(matchesServiceGroup(["Plano EXPANSÃO"], "Plano EXPANSÃO")).toBe(true);
    expect(matchesServiceGroup(["Workshop"], "Ensaio")).toBe(false);
    expect(matchesServiceGroup(["Ensaio REPOSICIONAMENTO", "Cobertura de evento"], "Evento")).toBe(true);
    expect(matchesServiceGroup(["Workshop"], "Todos")).toBe(true);
  });
});
