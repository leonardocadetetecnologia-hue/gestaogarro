import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionUser } from "@/lib/auth";

const capture = vi.hoisted(() => ({ publishProductionRequested: vi.fn(), publishSaleClosed: vi.fn() }));
const { tx, transaction } = vi.hoisted(() => {
  const tx = {
    $queryRaw: vi.fn(), opportunity: { findUnique: vi.fn(), update: vi.fn() }, customer: { update: vi.fn(), findUnique: vi.fn() },
    sale: { create: vi.fn() }, demand: { create: vi.fn(), findUnique: vi.fn().mockResolvedValue(null), update: vi.fn() }, user: { findMany: vi.fn() },
    crmInteraction: { create: vi.fn() }, auditLog: { create: vi.fn() },
    contractLine: { findMany: vi.fn() }, agendaHoliday: { findMany: vi.fn() },
    scheduleEvent: { deleteMany: vi.fn(), findFirst: vi.fn().mockResolvedValue(null), create: vi.fn(), update: vi.fn() },
    deliverable: { updateMany: vi.fn() }, service: { findMany: vi.fn().mockResolvedValue([]) },
    notification: { createMany: vi.fn(), findFirst: vi.fn().mockResolvedValue(null), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
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
  const datedLine = {
    id: "line", serviceId: "srv", serviceName: "Ensaio", variationName: "Foto", extra: false, sortOrder: 1,
    serviceDate: new Date("2026-11-03T12:00:00.000Z"), proposedDays: 0, captureTime: null, capturePlace: null,
  };
  tx.opportunity.findUnique.mockResolvedValue({
    id: "opportunity", customerId: "customer", responsibleId: "attendant", stage: "CONTRATO", outcome: "GANHA",
    sale: null, contractSigned: true, checklistWaivedAt: null, contractLines: [datedLine], responsible: { role: "ATENDENTE" },
    customer: { name: "Cliente", personType: "PESSOA_FISICA", street: "Rua da Garro", addressCity: "Belo Horizonte", state: "MG", birthdays: [] },
  });
  tx.contractLine.findMany.mockResolvedValue([datedLine]);
  tx.user.findMany.mockResolvedValue([{ id: "manager" }]);
  tx.sale.create.mockResolvedValue({ id: "sale" });
  tx.demand.create.mockResolvedValue({ id: "demand" });
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
    tx.opportunity.findUnique.mockResolvedValue({
      id: "opportunity", customerId: "customer", responsibleId: "attendant", stage: "CONTRATO", outcome: "GANHA",
      sale: { demand: { id: "existing" }, value: { equals: () => true } }, contractSigned: true, checklistWaivedAt: null,
      contractLines: [], responsible: { role: "ATENDENTE" },
      customer: { name: "Cliente", personType: "PESSOA_FISICA", street: "Rua da Garro", addressCity: "Belo Horizonte", state: "MG", birthdays: [] },
    });
    await sendToProduction(user, input);
    tx.customer.findUnique.mockResolvedValue({ id: "customer", kind: "CLIENTE", name: "Cliente" });
    tx.demand.create.mockResolvedValue({ id: "direct" });
    await createDirectDemand({ ...user, role: "GESTOR_GARRO" }, { customerId: "customer", title: "Vídeo", description: "Peça direta", mediaType: "FOTO", due: input.due, deliverables: ["Corte"] });
    expect(capture.publishProductionRequested).not.toHaveBeenCalled();
    expect(capture.publishSaleClosed).not.toHaveBeenCalled();
  });
});
