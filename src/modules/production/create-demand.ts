import { z } from "zod";
import type { SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CrmFlowError, productionSubmissionSchema } from "@/modules/crm/send-to-production";

export const directDemandSchema = productionSubmissionSchema.omit({ opportunityId: true, amount: true }).extend({
  customerId: z.string().min(1).max(80).optional(),
  newCustomer: z.object({ name: z.string().trim().min(2).max(200), email: z.string().trim().email().or(z.literal("")), phone: z.string().trim().max(40) }).optional(),
}).refine(v => Boolean(v.customerId) !== Boolean(v.newCustomer), "Escolha um cliente ou cadastre um novo.");
export type DirectDemandInput = z.infer<typeof directDemandSchema>;

export async function createDirectDemand(user: SessionUser, raw: unknown) {
  if (user.role !== "GESTOR_GARRO") throw new CrmFlowError("Somente a Gestora pode criar demandas diretamente.");
  const result = directDemandSchema.safeParse(raw);
  if (!result.success) throw new CrmFlowError(result.error.issues[0].message);
  const input = result.data;
  return prisma.$transaction(async tx => {
    const customer = input.newCustomer
      ? await tx.customer.create({ data: { ...input.newCustomer, kind: "CLIENTE" } })
      : await tx.customer.findUnique({ where: { id: input.customerId } });
    if (!customer || customer.kind !== "CLIENTE") throw new CrmFlowError("Selecione um cliente. Leads precisam fechar com sucesso antes de entrar em produção.");
    const due = new Date(input.due);
    const demand = await tx.demand.create({ data: {
      customerId: customer.id, title: input.title, mediaType: input.mediaType, description: input.description, clientDueAt: due,
      deliverables: { create: input.deliverables.map(title => ({ title, clientDueAt: due })) },
      messages: { create: { senderId: user.id, content: "Demanda criada diretamente pela Gestora.", system: true } },
      events: { create: { userId: user.id, type: "ENTREGA_CLIENTE", title: `Entrega ao cliente — ${customer.name}`, dueAt: due } },
    } });
    if (input.newCustomer) await tx.auditLog.create({ data: { userId: user.id, action: "CUSTOMER_CREATED", entityType: "Customer", entityId: customer.id } });
    await tx.auditLog.create({ data: { userId: user.id, action: "DEMAND_CREATED_DIRECTLY", entityType: "Demand", entityId: demand.id, details: { mediaType: input.mediaType } } });
    return demand.id;
  });
}
