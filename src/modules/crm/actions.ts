"use server";

import { Prisma, type OpportunityStage } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { requirePermission, requireUser } from "@/lib/auth";
import { parseSaoPaulo } from "@/lib/deadlines";
import { OPEN_STAGES } from "@/lib/labels";
import { parseMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { isRedirectError, reject } from "@/lib/redirect";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function saveDraft(entityType: string, entityId: string, content: Record<string, string>) {
  const user = await requireUser();
  if (entityType.length > 40 || entityId.length > 80) return;
  await prisma.draft.upsert({
    where: { userId_entityType_entityId: { userId: user.id, entityType, entityId } },
    update: { content },
    create: { userId: user.id, entityType, entityId, content },
  });
}

export async function createOpportunity(formData: FormData) {
  const user = await requirePermission("crm");
  const service = text(formData, "service");
  const customerId = text(formData, "customerId");
  const customerName = text(formData, "customerName");
  const estimated = parseMoney(formData.get("estimatedValue"));
  if (!service || (!customerId && customerName.length < 2)) {
    reject("/crm?novo=1", "Informe o cliente e o serviço.");
  }
  if (Number.isNaN(estimated)) reject("/crm?novo=1", "Valor estimado inválido.");

  const priority = text(formData, "priority");
  const waitingOn = text(formData, "waitingOn");
  const customer = customerId
    ? await prisma.customer.findUnique({ where: { id: customerId } })
    : await prisma.customer.create({
        data: {
          name: customerName,
          phone: text(formData, "phone") || null,
          email: text(formData, "email") || null,
          company: text(formData, "company") || null,
          origin: text(formData, "origin") || null,
        },
      });
  if (!customer) reject("/crm?novo=1", "Cliente não encontrado.");

  const opportunity = await prisma.opportunity.create({
    data: {
      customerId: customer.id,
      responsibleId: user.id,
      service,
      estimatedValue: estimated,
      priority: priority === "ALTA" || priority === "BAIXA" ? priority : "MEDIA",
      waitingOn: waitingOn === "CLIENTE" || waitingOn === "GARRO" ? waitingOn : "NINGUEM",
      waitingSince: waitingOn === "CLIENTE" || waitingOn === "GARRO" ? new Date() : null,
      nextAction: text(formData, "nextAction") || null,
      nextActionAt: parseSaoPaulo(text(formData, "nextActionAt")),
    },
  });
  await audit(user.id, "OPPORTUNITY_CREATED", "Opportunity", opportunity.id);
  await prisma.draft.deleteMany({
    where: { userId: user.id, entityType: "opportunity-new", entityId: "new" },
  });
  revalidatePath("/crm");
  redirect(`/crm/${opportunity.id}`);
}

export async function addInteraction(formData: FormData) {
  const user = await requirePermission("crm");
  const opportunityId = text(formData, "opportunityId");
  const summary = text(formData, "summary");
  const channel = text(formData, "channel") || "Manual";
  if (!opportunityId || summary.length < 2) reject("/crm", "Descreva o contato.");
  const occurredAt = parseSaoPaulo(text(formData, "occurredAt")) ?? new Date();
  const waitingOn = text(formData, "waitingOn");
  await prisma.$transaction([
    prisma.crmInteraction.create({
      data: { opportunityId, userId: user.id, channel, summary, occurredAt },
    }),
    prisma.opportunity.update({
      where: { id: opportunityId },
      data: {
        lastContactAt: occurredAt,
        lastActivityAt: new Date(),
        waitingOn: waitingOn === "CLIENTE" || waitingOn === "GARRO" ? waitingOn : "NINGUEM",
        waitingSince: waitingOn === "CLIENTE" || waitingOn === "GARRO" ? occurredAt : null,
        nextAction: text(formData, "nextAction") || undefined,
        nextActionAt: text(formData, "nextActionAt")
          ? parseSaoPaulo(text(formData, "nextActionAt"))
          : undefined,
      },
    }),
  ]);
  await audit(user.id, "CRM_INTERACTION", "Opportunity", opportunityId);
  revalidatePath(`/crm/${opportunityId}`);
  redirect(`/crm/${opportunityId}`);
}

export async function moveOpportunity(id: string, stage: OpportunityStage) {
  const user = await requirePermission("crm");
  if (!OPEN_STAGES.includes(stage)) return { error: "Use o fechamento ou a perda para encerrar." };
  const current = await prisma.opportunity.findUnique({ where: { id } });
  if (!current || current.outcome !== "ABERTA") return { error: "Esta oportunidade já foi encerrada." };
  await prisma.opportunity.update({
    where: { id },
    data: { stage, lastActivityAt: new Date() },
  });
  await audit(user.id, "OPPORTUNITY_MOVED", "Opportunity", id, { stage });
  revalidatePath("/crm");
}

export async function loseOpportunity(formData: FormData) {
  const user = await requirePermission("crm");
  const id = text(formData, "opportunityId");
  const lossReason = text(formData, "lossReason");
  const lossNote = text(formData, "lossNote");
  if (!id || lossReason.length < 3) reject(id ? `/crm/${id}?perder=1` : "/crm", "Informe o motivo da perda.");
  await prisma.opportunity.update({
    where: { id },
    data: {
      stage: "PERDIDO",
      outcome: "PERDIDA",
      lossReason,
      lossNote: lossNote || null,
      lostAt: new Date(),
      lastActivityAt: new Date(),
    },
  });
  await audit(user.id, "OPPORTUNITY_LOST", "Opportunity", id, { lossReason });
  revalidatePath("/crm");
  redirect("/crm");
}

export async function closeOpportunity(formData: FormData) {
  const user = await requirePermission("crm");
  const opportunityId = text(formData, "opportunityId");
  const value = parseMoney(formData.get("closedValue"));
  const description = text(formData, "description");
  const titles = text(formData, "deliverables")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
  const clientDueAt = parseSaoPaulo(text(formData, "clientDueAt"));
  const workDate = parseSaoPaulo(text(formData, "workDate"));
  if (!opportunityId || value == null || Number.isNaN(value) || value <= 0) {
    reject(opportunityId ? `/crm/${opportunityId}?fechar=1` : "/crm", "Informe o valor fechado.");
  }
  if (!description || titles.length === 0 || !clientDueAt) {
    reject(`/crm/${opportunityId}?fechar=1`, "Informe a descrição, o prazo do cliente e ao menos um entregável.");
  }

  try {
    const demandId = await prisma.$transaction(async (tx) => {
      const opportunity = await tx.opportunity.findUnique({
        where: { id: opportunityId },
        include: { sale: { include: { demand: true } }, customer: true },
      });
      if (!opportunity) throw new Error("Oportunidade não encontrada.");
      if (opportunity.outcome === "PERDIDA") throw new Error("Oportunidade perdida não gera demanda.");
      if (opportunity.sale?.demand) return opportunity.sale.demand.id;

      await tx.opportunity.update({
        where: { id: opportunityId },
        data: {
          stage: "FECHADO",
          outcome: "GANHA",
          closedValue: new Prisma.Decimal(value),
          proposalValue: opportunity.proposalValue ?? new Prisma.Decimal(value),
          lastActivityAt: new Date(),
        },
      });
      const sale = await tx.sale.create({
        data: {
          opportunityId,
          customerId: opportunity.customerId,
          value: new Prisma.Decimal(value),
          closedAt: new Date(),
          workDate,
          clientDueAt,
          description,
          referenceLinks: text(formData, "references") || null,
          notes: text(formData, "notes") || null,
        },
      });
      const demand = await tx.demand.create({
        data: {
          saleId: sale.id,
          customerId: opportunity.customerId,
          title: opportunity.service,
          description,
          status: "PLANEJAMENTO",
          clientDueAt,
          deliverables: {
            create: titles.map((title) => ({ title, clientDueAt, status: "AGUARDANDO_EDITOR" })),
          },
          messages: {
            create: {
              senderId: user.id,
              content: "Venda fechada e demanda criada.",
              system: true,
            },
          },
          events: {
            create: {
              userId: user.id,
              opportunityId,
              type: "ENTREGA_CLIENTE",
              title: `Entrega ao cliente — ${opportunity.customer.name}`,
              dueAt: clientDueAt,
            },
          },
        },
      });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "SALE_CLOSED",
          entityType: "Opportunity",
          entityId: opportunityId,
          details: { saleId: sale.id, demandId: demand.id },
        },
      });
      const managers = await tx.user.findMany({
        where: { role: "GESTOR_GARRO", active: true },
        select: { id: true },
      });
      if (managers.length) {
        await tx.notification.createMany({
          data: managers.map((manager) => ({
            userId: manager.id,
            type: "NOVA_DEMANDA",
            title: "Nova demanda",
            message: `${opportunity.customer.name} — ${opportunity.service}`,
            href: `/demandas/${demand.id}`,
          })),
        });
      }
      return demand.id;
    });

    if (user.role === "ATENDENTE") redirect("/crm?ok=fechado");
    redirect(`/demandas/${demandId}`);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message =
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
        ? "Esta venda já gerou uma demanda."
        : error instanceof Error
          ? error.message
          : "Não foi possível fechar a venda.";
    reject(opportunityId ? `/crm/${opportunityId}?fechar=1` : "/crm", message);
  }
}

export async function saveCustomer(formData: FormData) {
  const user = await requirePermission("crm");
  const id = text(formData, "id");
  const name = text(formData, "name");
  if (name.length < 2) reject("/clientes", "Informe o nome do cliente.");
  const data = {
    name,
    phone: text(formData, "phone") || null,
    email: text(formData, "email") || null,
    company: text(formData, "company") || null,
    origin: text(formData, "origin") || null,
    notes: text(formData, "notes") || null,
  };
  const customer = id
    ? await prisma.customer.update({ where: { id }, data })
    : await prisma.customer.create({ data });
  await audit(user.id, id ? "CUSTOMER_UPDATED" : "CUSTOMER_CREATED", "Customer", customer.id);
  revalidatePath("/clientes");
  redirect("/clientes");
}
