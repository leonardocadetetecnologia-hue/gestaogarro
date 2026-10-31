import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionUser } from "@/lib/auth";

const capture = vi.hoisted(() => ({ publishProductionRequested: vi.fn(), publishSaleClosed: vi.fn() }));
const { tx, transaction } = vi.hoisted(() => {
  const tx = {
    $queryRaw: vi.fn(), opportunity: { findUnique: vi.fn(), update: vi.fn() }, customer: { update: vi.fn(), findUnique: vi.fn() },
    sale: { create: vi.fn() }, demand: { create: vi.fn() }, user: { findMany: vi.fn() },
    crmInteraction: { create: vi.fn() }, auditLog: { create: vi.fn() }, notification: { createMany: vi.fn() },
    contractLine: { findMany: vi.fn() }, agendaHoliday: { findMany: vi.fn() },
  };
  return { tx, transaction: vi.fn(async (work: (client: typeof tx) => Promise<unknown>) => work(tx)) };
});
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: transaction } }));
vi.mock("@/lib/integration-feed", () => capture);
import { createDirectDemand } from "@/modules/production/create-demand";
import { sendToProduction } from "./send-to-production";

const user: SessionUser = { id: "attendant", name: "Atendente", email: "attendant@example.test", role: "ATENDENTE" };
const input = {
  opportunityId: "opportunity", title: "Vídeo institucional", description: "Briefing validado pelo cliente",
  amount: "14000.50", due: "2026-11-01T18:00:00.000Z", deliverables: ["Vídeo principal"], mediaType: "VIDEO" as const,
};

beforeEach(() => {
  vi.clearAllMocks();
  tx.opportunity.findUnique.mockResolvedValue({ id: "opportunity", customerId: "customer", responsibleId: "attendant", stage: "CONTRATO", outcome: "GANHA", sale: null, customer: { name: "Cliente" } });
  tx.user.findMany.mockResolvedValue([{ id: "manager" }]);
  tx.sale.create.mockResolvedValue({ id: "sale" });
  tx.demand.create.mockResolvedValue({ id: "demand" });
  tx.contractLine.findMany.mockResolvedValue([]);
  tx.agendaHoliday.findMany.mockResolvedValue([]);
});

describe("gatilho de produção", () => {
  it("pede captura só quando a demanda é criada", async () => {
    await sendToProduction(user, input);
    expect(capture.publishProductionRequested).toHaveBeenCalledOnce();
    expect(capture.publishProductionRequested.mock.calls[0][0].demandId).toBe("demand");
    expect(transaction.mock.invocationCallOrder[0]).toBeLessThan(capture.publishProductionRequested.mock.invocationCallOrder[0]);
  });

  it("não pede captura quando o envio já existe nem na demanda direta da Gestora", async () => {
    tx.opportunity.findUnique.mockResolvedValue({ id: "opportunity", customerId: "customer", responsibleId: "attendant", stage: "CONTRATO", outcome: "GANHA", sale: { demand: { id: "existing" }, value: { equals: () => true } }, customer: { name: "Cliente" } });
    await sendToProduction(user, input);
    tx.customer.findUnique.mockResolvedValue({ id: "customer", kind: "CLIENTE", name: "Cliente" });
    tx.demand.create.mockResolvedValue({ id: "direct" });
    await createDirectDemand({ ...user, role: "GESTOR_GARRO" }, { customerId: "customer", title: "Vídeo", description: "Peça direta", mediaType: "FOTO", due: input.due, deliverables: ["Corte"] });
    expect(capture.publishProductionRequested).not.toHaveBeenCalled();
    expect(capture.publishSaleClosed).not.toHaveBeenCalled();
  });
});
