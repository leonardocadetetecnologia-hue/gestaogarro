import type { DemandStatus, DeliverableStatus } from "@prisma/client";
import type { SessionUser } from "@/lib/auth";
import type { Customer, ProductionStatus, State, TaskStatus } from "@/lib/data";
import { STAGE_LABELS } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

const demandLabels: Record<DemandStatus, ProductionStatus> = {
  NOVA: "Nova demanda", PLANEJAMENTO: "Planejamento", AGUARDANDO_EDITOR: "Planejamento",
  EM_PRODUCAO: "Em produção", ENVIADO_REVISAO: "Em revisão", EM_REVISAO: "Em revisão",
  CORRECAO: "Correção", PRONTO_ENTREGA: "Aprovada", ENTREGUE: "Entregue", CONCLUIDO: "Entregue",
};
const taskLabels: Record<DeliverableStatus, TaskStatus> = {
  AGUARDANDO_EDITOR: "A iniciar", EM_PRODUCAO: "Em edição", ENVIADO_REVISAO: "Em revisão",
  EM_REVISAO: "Em revisão", CORRECAO: "Correção", APROVADO: "Aprovado", ENTREGUE: "Aprovado", CONCLUIDO: "Aprovado",
};

export async function loadPanelState(user: SessionUser): Promise<State> {
  const commercial = user.role !== "EDITOR";
  const production = user.role !== "ATENDENTE";
  const [customers, opportunities, demands, editors, schedule, notifications] = await Promise.all([
    commercial ? prisma.customer.findMany({
      orderBy: { name: "asc" },
      include: { opportunities: { orderBy: { createdAt: "desc" }, take: 1, select: { service: true } } },
    }).then(rows => rows.map((c): Customer => ({
      id: c.id, kind: c.kind, name: c.name, phone: c.phone || "", email: c.email || "", company: c.company || "",
      origin: c.origin || "Outro", notes: c.notes || "", city: "", service: c.opportunities[0]?.service || "",
    }))) : prisma.customer.findMany({
      where: { demands: { some: { deliverables: { some: { editorId: user.id } } } } },
      select: { id: true, name: true },
    }).then(rows => rows.map((c): Customer => ({
      ...c, phone: "", email: "", company: "", origin: "", notes: "", city: "", service: "",
    }))),
    commercial ? prisma.opportunity.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        sale: { select: { demand: { select: { id: true } } } },
        interactions: { orderBy: { occurredAt: "desc" }, select: { occurredAt: true, summary: true } },
      },
    }) : Promise.resolve([]),
    production ? prisma.demand.findMany({
      where: user.role === "EDITOR" ? { deliverables: { some: { editorId: user.id } } } : {},
      orderBy: { createdAt: "desc" },
      include: {
        deliverables: { where: user.role === "EDITOR" ? { editorId: user.id } : {} },
        messages: {
          orderBy: { createdAt: "asc" },
          include: { sender: { select: { name: true, role: true } } },
        },
        files: { select: { storagePath: true } },
        sale: { select: { opportunity: { select: { service: true } } } },
      },
    }) : Promise.resolve([]),
    user.role === "ATENDENTE" ? Promise.resolve([]) : prisma.user.findMany({
      where: { role: { in: ["EDITOR", "GESTOR_GARRO"] }, ...(user.role === "EDITOR" ? { id: user.id } : {}) },
      select: { id: true, name: true, email: true, active: true, role: true },
      orderBy: { name: "asc" },
    }),
    prisma.scheduleEvent.findMany({
      where: user.role === "GESTOR_GARRO" ? {} : {
        userId: user.id,
        ...(user.role === "ATENDENTE" ? { demandId: null, type: { in: ["FOLLOW_UP", "REUNIAO", "RETORNO_ORCAMENTO"] } } : {}),
        ...(user.role === "EDITOR" ? { OR: [{ demandId: null }, { demand: { deliverables: { some: { editorId: user.id } } } }] } : {}),
      },
      orderBy: { dueAt: "asc" },
      include: {
        user: { select: { name: true, role: true } },
        demand: { select: { title: true, description: true, customer: { select: { name: true } } } },
        deliverable: { select: { title: true, description: true } },
      },
    }),
    prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 100 }),
  ]);
  return {
    customers,
    opportunities: opportunities.map(o => ({
      id: o.id, customerId: o.customerId, service: o.service, stage: STAGE_LABELS[o.stage],
      demandId: o.sale?.demand?.id,
      value: o.closedValue !== null ? Number(o.closedValue) : o.proposalValue !== null ? Number(o.proposalValue) : o.estimatedValue !== null ? Number(o.estimatedValue) : null,
      priority: o.priority === "ALTA" ? "Alta" : o.priority === "BAIXA" ? "Baixa" : "Média",
      lastActivity: o.lastActivityAt.toISOString(), waitingSince: o.waitingSince?.toISOString(),
      waitingOn: o.waitingOn === "GARRO" ? "atendente" : o.waitingOn === "CLIENTE" ? "cliente" : "nenhum",
      nextAction: o.nextAction || "", nextAt: o.nextActionAt?.toISOString(),
      history: o.interactions.map(i => ({ at: i.occurredAt.toISOString(), description: i.summary })),
    })),
    editors,
    demands: demands.map(d => ({
      id: d.id, customerId: d.customerId, title: d.title, service: d.sale?.opportunity.service, description: d.description || "",
      status: demandLabels[d.status], clientDue: d.clientDueAt?.toISOString() || "",
      briefing: d.description || "", links: d.files.find(f => /^https?:\/\//.test(f.storagePath))?.storagePath || "",
      createdAt: d.createdAt.toISOString(),
      messages: d.messages.map(m => ({
        id: m.id, demandId: d.id, author: m.sender.name, role: m.sender.role,
        message: m.content, createdAt: m.createdAt.toISOString(),
      })),
    })),
    deliverables: demands.flatMap(d => d.deliverables.map(t => ({
      id: t.id, demandId: d.id, title: t.title, editorId: t.editorId || "", status: taskLabels[t.status],
      editorDue: t.editorDueAt?.toISOString() || "", reviewDue: t.reviewDueAt?.toISOString() || "",
      clientDue: t.clientDueAt?.toISOString() || "", progress: ["APROVADO", "ENTREGUE", "CONCLUIDO"].includes(t.status) ? 100 : 0,
      editorDeliveredAt: t.editorDeliveredAt?.toISOString(), managerApprovedAt: t.managerApprovedAt?.toISOString(),
    }))),
    schedule: schedule.map(e => ({
      id: e.id, title: e.title, category: e.type === "ENTREGA_EDITOR" ? "Editor" : e.type === "REVISAO_GARRO" ? "Revisão" : e.type === "ENTREGA_CLIENTE" ? "Cliente" : e.demandId ? "Gestão" : "Comercial",
      userId: e.userId, at: e.dueAt.toISOString(), demandId: e.demandId || undefined, done: e.status !== "PENDENTE",
      opportunityId: e.opportunityId || undefined, deliverableId: e.deliverableId || undefined,
      responsibleName: e.user.name,
      responsibleRole: e.user.role,
      customerName: e.demand?.customer.name || customers.find(c => c.id === opportunities.find(o => o.id === e.opportunityId)?.customerId)?.name,
      origin: e.demandId ? "Produção" : e.opportunityId ? "CRM" : "Agenda",
      context: e.deliverable?.description || e.demand?.description || opportunities.find(o => o.id === e.opportunityId)?.service || "",
      typeLabel: {
        FOLLOW_UP: "Follow-up", REUNIAO: "Reunião", RETORNO_ORCAMENTO: "Retorno de orçamento", ENTREGA_EDITOR: "Entrega do editor",
        REVISAO_GARRO: "Revisão Garro", ENTREGA_CLIENTE: "Entrega ao cliente", CORRECAO: "Correção", GRAVACAO: "Gravação", EVENTO: "Evento", INTERNO: "Compromisso interno",
      }[e.type],
      status: e.status === "PENDENTE" ? "Pendente" : e.status === "CANCELADO" ? "Cancelado" : "Concluído",
      createdAt: e.createdAt.toISOString(),
    })),
    alerts: notifications.map(n => ({
      id: n.id, userId: user.id, title: n.title, detail: n.message, at: n.createdAt.toISOString(),
      read: !!n.readAt, demandId: n.href?.match(/(?:demandas\/|demanda\?id=)([^/?]+)/)?.[1],
    })),
  };
}
