import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionUser } from "@/lib/auth";

const { tx, transaction } = vi.hoisted(() => {
  const tx = {
    $queryRaw: vi.fn(),
    customer: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    opportunity: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    auditLog: { create: vi.fn() },
    crmInteraction: { create: vi.fn() },
    scheduleEvent: { create: vi.fn(), updateMany: vi.fn() },
  };
  return { tx, transaction: vi.fn() };
});
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: transaction } }));
vi.mock("@/lib/integration-feed", () => ({ publishSaleClosed: vi.fn() }));
import { executeCrmCommand } from "./crm-service";

const ana: SessionUser = { id: "ana", name: "Ana", email: "ana@example.test", role: "ATENDENTE" };

beforeEach(() => {
  vi.resetAllMocks();
  transaction.mockImplementation(async (work: (client: typeof tx) => Promise<unknown>) => work(tx));
});

describe("Ana não herda o Kanban da Malu", () => {
  it("recusa mover, alterar ou registrar ação no card da outra atendente", async () => {
    tx.opportunity.findUnique.mockResolvedValue({
      id: "card", responsibleId: "malu", stage: "LEAD", outcome: "ABERTA", customer: { name: "Cliente da Malu" }, sale: null,
    });
    await expect(executeCrmCommand(ana, { kind: "move", id: "card", stage: "Tentativa de contato" })).rejects.toThrow("não encontrada");
    await expect(executeCrmCommand(ana, { kind: "value", id: "card", value: 100 })).rejects.toThrow("não encontrada");
    await expect(executeCrmCommand(ana, {
      kind: "contact", id: "card", summary: "Tentativa de ver o atendimento", waitingOn: "cliente", nextAction: "", nextAt: "",
    })).rejects.toThrow("não encontrada");
    expect(tx.opportunity.update).not.toHaveBeenCalled();
    expect(tx.crmInteraction.create).not.toHaveBeenCalled();
  });

  it("recusa criar oportunidade no contato da outra atendente", async () => {
    tx.customer.findUnique.mockResolvedValue({ createdById: "malu", opportunities: [{ responsibleId: "malu" }] });
    await expect(executeCrmCommand(ana, { kind: "createOpportunity", customerId: "cliente-malu", service: "Ensaio" })).rejects.toThrow("não encontrado");
    expect(tx.opportunity.create).not.toHaveBeenCalled();
  });
});
