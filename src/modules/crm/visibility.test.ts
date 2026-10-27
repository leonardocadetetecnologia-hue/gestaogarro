import { describe, expect, it } from "vitest";
import type { SessionUser } from "@/lib/auth";
import { attendantOwnsCustomer, canAccessOpportunity, customerScope, opportunityScope } from "./visibility";

const malu: SessionUser = { id: "malu", name: "Malu", email: "malu@example.test", role: "ATENDENTE" };
const ana: SessionUser = { id: "ana", name: "Ana", email: "ana@example.test", role: "ATENDENTE" };
const gestora: SessionUser = { id: "gestora", name: "Gestora", email: "gestora@example.test", role: "GESTOR_GARRO" };
const maluCustomer = { createdById: "malu", opportunities: [{ responsibleId: "malu" }] };

describe("separação entre atendentes", () => {
  it("limita o Kanban da atendente às oportunidades dela e libera o da Gestora", () => {
    expect(opportunityScope(malu)).toEqual({ responsibleId: "malu" });
    expect(opportunityScope(gestora)).toEqual({});
    expect(customerScope(ana)).toEqual({
      OR: [{ createdById: "ana" }, { opportunities: { some: { responsibleId: "ana" } } }],
    });
  });

  it("não entrega à Ana o contato nem a oportunidade da Malu", () => {
    expect(canAccessOpportunity(ana, "malu")).toBe(false);
    expect(canAccessOpportunity(malu, "malu")).toBe(true);
    expect(canAccessOpportunity(gestora, "malu")).toBe(true);
    expect(attendantOwnsCustomer(ana, maluCustomer)).toBe(false);
    expect(attendantOwnsCustomer(malu, maluCustomer)).toBe(true);
    expect(attendantOwnsCustomer(ana, { createdById: null, opportunities: [] })).toBe(false);
  });
});
