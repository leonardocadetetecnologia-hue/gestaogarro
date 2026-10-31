import type { DemandStatus, DeliverableStatus } from "@prisma/client";
import type { SessionUser } from "@/lib/auth";
import { birthDateKey, birthdayReminders } from "@/lib/birthdays";
import { kanbanLabelsFrom, type Customer, type ProductionStatus, type ScheduleItem, type State, type TaskStatus } from "@/lib/data";
import { STAGE_LABELS } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { returnDueLostOpportunities } from "@/modules/crm/loss-return";
import { customerScope, opportunityScope } from "@/modules/crm/visibility";
import { attachmentSelect } from "@/modules/production/attachment-service";
import { readDeliveryLinks } from "@/modules/production/delivery-links";
import { creationRank } from "@/modules/production/deliverable-order";
import { loadAttendantMonitor } from "@/modules/painel/attendant-monitor";
import { loadCommercialServices } from "@/modules/services/queries";

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
  if (commercial) await returnDueLostOpportunities();
  const [customers, opportunities, demands, editors, schedule, notifications, labelRows, assignees] = await Promise.all([
    commercial ? prisma.customer.findMany({
      where: customerScope(user),
      orderBy: { name: "asc" },
      include: {
        createdBy: { select: { id: true, name: true } },
        opportunities: {
          where: user.role === "ATENDENTE" ? { responsibleId: user.id } : {},
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { service: true, responsible: { select: { id: true, name: true } } },
        },
      },
    }).then(rows => rows.map((c): Customer => ({
      id: c.id, kind: c.kind, name: c.name, phone: c.phone || "", email: c.email || "", company: c.company || "",
      origin: c.origin || "Outro", notes: c.notes || "", city: "", service: c.opportunities[0]?.service || "",
      attendantId: c.opportunities[0]?.responsible.id || c.createdBy?.id || "",
      attendantName: c.opportunities[0]?.responsible.name || c.createdBy?.name || "",
      birthDate: c.birthDate ? birthDateKey(c.birthDate) : "",
      createdAt: c.createdAt.toISOString(),
    }))) : prisma.customer.findMany({
      where: { demands: { some: { deliverables: { some: { editorId: user.id, archivedAt: null } } } } },
      select: { id: true, name: true },
    }).then(rows => rows.map((c): Customer => ({
      ...c, phone: "", email: "", company: "", origin: "", notes: "", city: "", service: "",
    }))),
    commercial ? prisma.opportunity.findMany({
      where: opportunityScope(user),
      orderBy: { createdAt: "desc" },
      include: {
        responsible: { select: { name: true } },
        sale: { select: { demand: { select: { id: true } } } },
        interactions: { orderBy: { occurredAt: "desc" }, select: { occurredAt: true, summary: true, user: { select: { name: true } } } },
      },
    }) : Promise.resolve([]),
    production ? prisma.demand.findMany({
      where: user.role === "EDITOR" ? { deliverables: { some: { editorId: user.id, archivedAt: null } } } : {},
      orderBy: { createdAt: "desc" },
      include: {
        deliverables: { where: user.role === "EDITOR" ? { editorId: user.id, archivedAt: null } : {}, orderBy: [{ createdAt: "asc" }, { id: "asc" }], include: { scriptAttachments: { select: attachmentSelect, orderBy: { createdAt: "asc" } } } },
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
        ...(user.role === "ATENDENTE" ? { demandId: null, type: { in: ["FOLLOW_UP", "CONTATO_FUTURO", "REUNIAO", "RETORNO_ORCAMENTO", "TAREFA_ATENDENTE"] } } : {}),
        ...(user.role === "EDITOR" ? { OR: [{ demandId: null }, { demand: { deliverables: { some: { editorId: user.id, archivedAt: null } } } }] } : {}),
      },
      orderBy: { dueAt: "asc" },
      include: {
        user: { select: { name: true, role: true } },
        createdBy: { select: { id: true, role: true } },
        demand: { select: { title: true, description: true, customer: { select: { name: true } } } },
        deliverable: { select: { title: true, description: true } },
      },
    }),
    prisma.notification.findMany({
      where: { userId: user.id, OR: [{ visibleAt: null }, { visibleAt: { lte: new Date() } }] },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.kanbanLabel.findMany(),
    user.role === "EDITOR" ? Promise.resolve([]) : prisma.user.findMany({
      where: user.role === "ATENDENTE"
        ? { active: true, OR: [{ id: user.id }, { role: "GESTOR_GARRO" }] }
        : { active: true, role: { in: ["GESTOR_GARRO", "ATENDENTE"] } },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const returnEvents = opportunities.length ? await prisma.scheduleEvent.findMany({
    where: { type: "CONTATO_FUTURO", status: "PENDENTE", opportunityId: { in: opportunities.map(item => item.id) } },
    select: { opportunityId: true, userId: true, user: { select: { name: true } } },
  }) : [];
  const returns = new Map(returnEvents.flatMap(event => event.opportunityId ? [[event.opportunityId, event] as const] : []));
  const activity = user.role === "GESTOR_GARRO" ? await loadAttendantMonitor() : [];
  const tracking = user.role === "ATENDENTE" ? await prisma.demand.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true, customerId: true, title: true, status: true, clientDueAt: true, mediaType: true, createdAt: true,
      customer: { select: { name: true } },
      sale: { select: { opportunity: { select: { service: true } } } },
      deliverables: {
        where: { archivedAt: null },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: { id: true, title: true, status: true, editorDueAt: true, reviewDueAt: true, clientDueAt: true, clientDeliveredAt: true, createdAt: true },
      },
    },
  }) : [];
  const catalog = commercial ? await loadCommercialServices(user) : { services: [], serviceProposals: [] };
  const fullOrder = user.role === "EDITOR" && demands.length
    ? await prisma.deliverable.findMany({
      where: { demandId: { in: demands.map(item => item.id) } },
      select: { id: true, demandId: true, createdAt: true },
    })
    : null;
  const numbersFor = (demandId: string, own: { id: string; createdAt: Date }[]) => {
    const source = fullOrder ? fullOrder.filter(row => row.demandId === demandId) : own;
    return new Map(creationRank(source).map(({ item, number }) => [item.id, number]));
  };
  return {
    customers,
    opportunities: opportunities.map(o => ({
      id: o.id, customerId: o.customerId, service: o.service, stage: STAGE_LABELS[o.stage],
      responsibleId: o.responsibleId, responsibleName: o.responsible.name,
      demandId: o.sale?.demand?.id,
      value: o.closedValue !== null ? Number(o.closedValue) : o.proposalValue !== null ? Number(o.proposalValue) : o.estimatedValue !== null ? Number(o.estimatedValue) : null,
      estimated: o.estimatedValue !== null ? Number(o.estimatedValue) : null,
      proposal: o.proposalValue !== null ? Number(o.proposalValue) : null,
      closed: o.closedValue !== null ? Number(o.closedValue) : null,
      priority: o.priority === "ALTA" ? "Alta" : o.priority === "BAIXA" ? "Baixa" : "Média",
      lastActivity: o.lastActivityAt.toISOString(), waitingSince: o.waitingSince?.toISOString(),
      waitingOn: o.waitingOn === "GARRO" ? "atendente" : o.waitingOn === "CLIENTE" ? "cliente" : "nenhum",
      nextAction: o.nextAction || "", nextAt: o.nextActionAt?.toISOString(), lostAt: o.lostAt?.toISOString(), lossReason: o.lossReason || "",
      returnResponsibleId: returns.get(o.id)?.userId, returnResponsibleName: returns.get(o.id)?.user.name,
      history: o.interactions.map(i => ({ at: i.occurredAt.toISOString(), description: i.summary, author: i.user.name })),
    })),
    editors,
    demands: user.role === "ATENDENTE" ? tracking.map(d => ({
      id: d.id, customerId: d.customerId, customerName: d.customer.name, title: d.title,
      service: d.sale?.opportunity.service, mediaType: d.mediaType ?? undefined,
      description: "", status: demandLabels[d.status], clientDue: d.clientDueAt?.toISOString() || "",
      briefing: "", links: "", createdAt: d.createdAt.toISOString(), messages: [],
    })) : demands.map(d => ({
      id: d.id, customerId: d.customerId, title: d.title, service: d.sale?.opportunity.service, mediaType: d.mediaType ?? undefined, description: d.description || "",
      status: demandLabels[d.status], clientDue: d.clientDueAt?.toISOString() || "",
      briefing: d.description || "", links: d.files.find(f => /^https?:\/\//.test(f.storagePath))?.storagePath || "",
      hd: d.hd || "", drive: d.driveUrl || "",
      deliveryLinks: readDeliveryLinks(d.deliveryLinks),
      createdAt: d.createdAt.toISOString(),
      messages: d.messages.map(m => ({
        id: m.id, demandId: d.id, author: m.sender.name, role: m.sender.role,
        message: m.content, createdAt: m.createdAt.toISOString(),
      })),
    })),
    deliverables: user.role === "ATENDENTE" ? tracking.flatMap(d => d.deliverables.map(t => ({
      id: t.id, demandId: d.id, title: t.title, editorId: "", status: taskLabels[t.status],
      editorDue: t.editorDueAt?.toISOString() || "", reviewDue: t.reviewDueAt?.toISOString() || "",
      clientDue: t.clientDueAt?.toISOString() || "", progress: ["APROVADO", "ENTREGUE", "CONCLUIDO"].includes(t.status) ? 100 : 0,
      clientDeliveredAt: t.clientDeliveredAt?.toISOString(), createdAt: t.createdAt.toISOString(),
    }))) : demands.flatMap(d => {
      const numbers = numbersFor(d.id, d.deliverables);
      return [...d.deliverables]
        .sort((left, right) => (numbers.get(left.id) ?? 0) - (numbers.get(right.id) ?? 0) || (left.id < right.id ? -1 : 1))
        .map(t => ({
          id: t.id, demandId: d.id, title: t.title, script: t.description || "", editorId: t.editorId || "", status: taskLabels[t.status],
          attachments: (t.scriptAttachments || []).map(a => ({ ...a, createdAt: a.createdAt.toISOString() })),
          editorDue: t.editorDueAt?.toISOString() || "", reviewDue: t.reviewDueAt?.toISOString() || "",
          clientDue: t.clientDueAt?.toISOString() || "", progress: ["APROVADO", "ENTREGUE", "CONCLUIDO"].includes(t.status) ? 100 : 0,
          editorDeliveredAt: t.editorDeliveredAt?.toISOString(), managerApprovedAt: t.managerApprovedAt?.toISOString(),
          clientDeliveredAt: t.clientDeliveredAt?.toISOString(), archivedAt: t.archivedAt?.toISOString() || "",
          createdAt: t.createdAt.toISOString(),
          number: numbers.get(t.id),
        }));
    }),
    schedule: [...schedule.map((e): ScheduleItem => ({
      id: e.id, title: e.title, category: e.type === "ENTREGA_EDITOR" ? "Editor" : e.type === "REVISAO_GARRO" ? "Revisão" : e.type === "ENTREGA_CLIENTE" ? "Cliente" : e.type === "TAREFA_ATENDENTE" || e.demandId ? "Gestão" : "Comercial",
      userId: e.userId, at: e.dueAt.toISOString(), demandId: e.demandId || undefined, done: e.status !== "PENDENTE",
      opportunityId: e.opportunityId || undefined, deliverableId: e.deliverableId || undefined,
      responsibleName: e.user.name,
      responsibleRole: e.user.role,
      customerName: e.demand?.customer.name || customers.find(c => c.id === opportunities.find(o => o.id === e.opportunityId)?.customerId)?.name,
      origin: e.demandId ? "Produção" : e.opportunityId ? "CRM" : "Agenda",
      context: e.deliverable?.description || e.demand?.description || opportunities.find(o => o.id === e.opportunityId)?.service || "",
      typeLabel: {
        FOLLOW_UP: "Follow-up", CONTATO_FUTURO: "Contato futuro", REUNIAO: "Reunião", RETORNO_ORCAMENTO: "Retorno de orçamento", ENTREGA_EDITOR: "Entrega do editor",
        REVISAO_GARRO: "Revisão Garro", ENTREGA_CLIENTE: "Entrega ao cliente", CORRECAO: "Correção", GRAVACAO: "Gravação", EVENTO: "Evento", INTERNO: "Compromisso interno",
        TAREFA_ATENDENTE: e.createdBy?.role === "ATENDENTE" ? "Compromisso pessoal" : "Função da atendente",
      }[e.type],
      createdById: e.createdBy?.id,
      assignment: e.type === "TAREFA_ATENDENTE" ? (e.createdBy?.role === "ATENDENTE" ? "pessoal" : "gestora") : undefined,
      status: e.status === "PENDENTE" ? "Pendente" : e.status === "CANCELADO" ? "Cancelado" : "Concluído",
      createdAt: e.createdAt.toISOString(),
    })), ...birthdayReminders(customers, user.role)],
    alerts: notifications.map(n => ({
      id: n.id, userId: user.id, title: n.title, detail: n.message, at: (n.visibleAt ?? n.createdAt).toISOString(),
      read: !!n.readAt, href: n.href || undefined, demandId: n.href?.match(/(?:demandas\/|demanda\?id=)([^/?]+)/)?.[1],
    })),
    kanbanLabels: kanbanLabelsFrom(labelRows),
    assignees,
    activity,
    services: catalog.services,
    serviceProposals: catalog.serviceProposals,
  };
}
