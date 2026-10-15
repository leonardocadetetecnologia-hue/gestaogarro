import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
import { createDirectDemand, directDemandSchema } from "./create-demand";
const input = { title: "Vídeo", description: "Briefing aprovado", due: "2026-11-01T18:00:00Z", deliverables: ["Reel"] };
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
  it.each(["ATENDENTE", "EDITOR"] as const)("bloqueia criação pelo perfil %s", async role => {
    await expect(createDirectDemand({ id: "u", name: "Usuário", email: "u@example.test", role }, input)).rejects.toThrow("Somente a Gestora");
  });
});
