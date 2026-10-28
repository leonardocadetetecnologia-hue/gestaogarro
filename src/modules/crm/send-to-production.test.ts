import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionUser } from "@/lib/auth";

const { tx, transaction } = vi.hoisted(() => {
  const tx = {
    $queryRaw: vi.fn(), opportunity: { findUnique: vi.fn(), update: vi.fn() },
    customer: { update: vi.fn() }, sale: { create: vi.fn() }, demand: { create: vi.fn() }, user: { findMany: vi.fn() },
    crmInteraction: { create: vi.fn() }, auditLog: { create: vi.fn() }, notification: { createMany: vi.fn() },
  };
  return { tx, transaction: vi.fn() };
});
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: transaction } }));
import { productionSubmissionSchema, sendToProduction } from "./send-to-production";

const user: SessionUser = { id: "attendant", name: "Atendente", email: "attendant@example.test", role: "ATENDENTE" };
const input = {
  opportunityId: "opportunity", title: "Vídeo institucional", description: "Briefing validado pelo cliente",
  amount: "14000.50", due: "2026-11-01T18:00:00.000Z", deliverables: ["Vídeo principal", "Reel"], mediaType: "VIDEO" as const,
};
const opportunity = { id: "opportunity", customerId: "customer", responsibleId: "attendant", stage: "FECHADO", outcome: "GANHA", sale: null, customer: { name: "Cliente" } };

beforeEach(() => {
  delete process.env.GARRO_EVENT_CAPTURE_MODE;
  vi.resetAllMocks();
  transaction.mockImplementation(async (work: (client: typeof tx) => Promise<unknown>) => work(tx));
  tx.opportunity.findUnique.mockResolvedValue(opportunity);
  tx.user.findMany.mockResolvedValue([{ id: "manager" }]);
  tx.sale.create.mockResolvedValue({ id: "sale" });
  tx.demand.create.mockResolvedValue({ id: "demand" });
});

describe("envio do CRM para produção", () => {
  it("grava venda, demanda, entregáveis, prazo e notificação na mesma transação", async () => {
    await expect(sendToProduction(user, input)).resolves.toEqual({ demandId: "demand", alreadySent: false });
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(tx.opportunity.findUnique.mock.invocationCallOrder[0]);
    const saleData = tx.sale.create.mock.calls[0][0].data;
    expect(saleData.value.toString()).toBe("14000.5");
    expect(tx.demand.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "NOVA", saleId: "sale", mediaType: "VIDEO", deliverables: { create: [
        { title: "Vídeo principal", clientDueAt: new Date(input.due), status: "AGUARDANDO_EDITOR" },
        { title: "Reel", clientDueAt: new Date(input.due), status: "AGUARDANDO_EDITOR" },
      ] } }),
    }));
    expect(tx.notification.createMany.mock.calls[0][0].data[0].userId).toBe("manager");
    expect(tx.auditLog.create).toHaveBeenCalledOnce();
  });
  it("não cria outra demanda se o envio já foi confirmado", async () => {
    tx.opportunity.findUnique.mockResolvedValue({ ...opportunity, sale: { demand: { id: "existing" } } });
    await expect(sendToProduction(user, input)).resolves.toEqual({ demandId: "existing", alreadySent: true });
    expect(tx.sale.create).not.toHaveBeenCalled();
    expect(tx.demand.create).not.toHaveBeenCalled();
    expect(tx.notification.createMany).not.toHaveBeenCalled();
  });
  it("não envia a oportunidade de outra atendente", async () => {
    tx.opportunity.findUnique.mockResolvedValue({ ...opportunity, responsibleId: "malu" });
    await expect(sendToProduction(user, input)).rejects.toThrow("não encontrada");
    expect(tx.sale.create).not.toHaveBeenCalled();
    expect(tx.demand.create).not.toHaveBeenCalled();
  });
  it("bloqueia o editor antes de consultar ou escrever no banco", async () => {
    await expect(sendToProduction({ ...user, role: "EDITOR" }, input)).rejects.toThrow("Este perfil");
    expect(transaction).not.toHaveBeenCalled();
  });
  it("exige a esteira Fechado com sucesso", async () => {
    tx.opportunity.findUnique.mockResolvedValue({ ...opportunity, stage: "FOLLOW_UP", outcome: "ABERTA" });
    await expect(sendToProduction(user, input)).rejects.toThrow("Fechado com sucesso");
    expect(tx.sale.create).not.toHaveBeenCalled();
  });
  it("não permite enviar uma oportunidade perdida", async () => {
    tx.opportunity.findUnique.mockResolvedValue({ ...opportunity, stage: "PERDIDO", outcome: "PERDIDA" });
    await expect(sendToProduction(user, input)).rejects.toThrow("Fechado com sucesso");
    expect(tx.demand.create).not.toHaveBeenCalled();
  });
  it("mantém o valor da venda que já existe", async () => {
    tx.opportunity.findUnique.mockResolvedValue({ ...opportunity, sale: { id: "existing-sale", demand: null, value: { equals: () => false } } });
    await expect(sendToProduction(user, input)).rejects.toThrow("valor da venda já registrada");
    expect(tx.demand.create).not.toHaveBeenCalled();
  });
  it.each(["0", "-1", "14.001", "NaN", "Infinity"])("rejeita o valor inválido %s antes de alterar dados", async amount => {
    await expect(sendToProduction(user, { ...input, amount })).rejects.toThrow();
    expect(transaction).not.toHaveBeenCalled();
  });
  it("exige prazo e ao menos um entregável", () => {
    expect(productionSubmissionSchema.safeParse({ ...input, due: "", deliverables: [] }).success).toBe(false);
  });
  it("pede o tipo e não grava vídeo, foto ou ambos sem escolha", async () => {
    await expect(sendToProduction(user, { ...input, mediaType: undefined })).rejects.toThrow(/tipo/i);
    await expect(sendToProduction(user, { ...input, mediaType: "" })).rejects.toThrow(/tipo/i);
    await expect(sendToProduction(user, { ...input, mediaType: "EVENTO" })).rejects.toThrow(/tipo/i);
    expect(transaction).not.toHaveBeenCalled();
    for (const chosen of ["VIDEO", "FOTO", "FOTO_E_VIDEO"] as const) {
      expect(productionSubmissionSchema.safeParse({ ...input, mediaType: chosen }).success).toBe(true);
    }
  });
});
