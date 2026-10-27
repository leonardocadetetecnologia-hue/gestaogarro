import type { Prisma } from "@prisma/client";
import type { SessionUser } from "@/lib/auth";

type OwnedCustomer = {
  createdById: string | null;
  opportunities: { responsibleId: string }[];
};

export function opportunityScope(user: SessionUser): Prisma.OpportunityWhereInput {
  return user.role === "ATENDENTE" ? { responsibleId: user.id } : {};
}

export function customerScope(user: SessionUser): Prisma.CustomerWhereInput {
  if (user.role !== "ATENDENTE") return {};
  return {
    OR: [
      { createdById: user.id },
      { opportunities: { some: { responsibleId: user.id } } },
    ],
  };
}

export function saleScope(user: SessionUser): Prisma.SaleWhereInput {
  return user.role === "ATENDENTE" ? { opportunity: { responsibleId: user.id } } : {};
}

export function canAccessOpportunity(user: SessionUser, responsibleId: string) {
  return user.role !== "ATENDENTE" || responsibleId === user.id;
}

export function attendantOwnsCustomer(user: SessionUser, customer: OwnedCustomer) {
  if (user.role !== "ATENDENTE") return true;
  return customer.createdById === user.id || customer.opportunities.some((item) => item.responsibleId === user.id);
}
