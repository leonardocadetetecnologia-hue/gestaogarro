import { describe, expect, it, vi } from "vitest";

const { tx, transaction } = vi.hoisted(() => {
  const tx = {
    customer: { findUnique: vi.fn(), create: vi.fn() },
    demand: { create: vi.fn() },
    auditLog: { create: vi.fn() },
  };
  return { tx, transaction: vi.fn(async (work: (client: typeof tx) => Promise<unknown>) => work(tx)) };
});
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: transaction } }));
import { createDirectDemand, directDemandSchema } from "./create-demand";

const input = { title: "Vídeo", description: "Briefing aprovado", due: "2026-11-01T18:00:00Z", deliverables: ["Reel"], mediaType: "VIDEO" as const };
const gestora = { id: "u", name: "Gestora", email: "gestora@example.test", role: "GESTOR_GARRO" as const };

describe("demanda direta", () => {
  it("exige escolher um cliente ou cadastrar um novo", () => {
    expect(directDemandSchema.safeParse(input).success).toBe(false);
    expect(directDemandSchema.safeParse({ ...input, customerId: "c", newCustomer: { name: "Maria", email: "", phone: "" } }).success).toBe(false);
    expect(directDemandSchema.safeParse({ ...input, customerId: "c" }).success).toBe(true);
    expect(directDemandSchema.safeParse({ ...input, newCustomer: { name: "Maria", email: "", phone: "" } }).success).toBe(true);
  });
  it("exige briefing, prazo válido e entregáveis", () => {
    for (const invalid of [{ description: "" }, { due: "amanhã" }, { deliverables: [] }]) expect(directDemandSchema.safeParse({ ...input, customerId: "c", ...invalid }).success).toBe(false);
  });
  it("exige vídeo, foto ou foto e vídeo e não assume um tipo", () => {
    const missing = directDemandSchema.safeParse({ ...input, customerId: "c", mediaType: undefined });
    expect(missing.success).toBe(false);
    if (!missing.success) expect(missing.error.issues[0].message).toMatch(/tipo/i);
    expect(directDemandSchema.safeParse({ ...input, customerId: "c", mediaType: "" }).success).toBe(false);
    expect(directDemandSchema.safeParse({ ...input, customerId: "c", mediaType: "EVENTO" }).success).toBe(false);
    for (const chosen of ["VIDEO", "FOTO", "FOTO_E_VIDEO"] as const) {
      expect(directDemandSchema.safeParse({ ...input, customerId: "c", mediaType: chosen }).success).toBe(true);
    }
  });
  it("grava o tipo escolhido mesmo quando o título sugere outro material", async () => {
    tx.customer.findUnique.mockResolvedValue({ id: "c", kind: "CLIENTE", name: "Ana" });
    tx.demand.create.mockResolvedValue({ id: "demand" });
    await expect(createDirectDemand(gestora, { ...input, customerId: "c", mediaType: "FOTO" })).resolves.toBe("demand");
    expect(tx.demand.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ title: "Vídeo", mediaType: "FOTO" }),
    }));
  });
  it.each(["ATENDENTE", "EDITOR"] as const)("bloqueia criação pelo perfil %s", async role => {
    await expect(createDirectDemand({ id: "u", name: "Usuário", email: "u@example.test", role }, input)).rejects.toThrow("Somente a Gestora");
  });
});
