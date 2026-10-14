"use server";

import type { DeliverableStatus, DemandStatus, ScheduleEventType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit, notify } from "@/lib/audit";
import { requireManager, requireUser } from "@/lib/auth";
import { parseSaoPaulo } from "@/lib/deadlines";
import { prisma } from "@/lib/prisma";
import { reject } from "@/lib/redirect";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

const EDITOR_NEXT: Partial<Record<DeliverableStatus, DeliverableStatus[]>> = {
  AGUARDANDO_EDITOR: ["EM_PRODUCAO"],
  EM_PRODUCAO: ["ENVIADO_REVISAO"],
  CORRECAO: ["EM_PRODUCAO", "ENVIADO_REVISAO"],
};

const MANAGER_NEXT: Partial<Record<DeliverableStatus, DeliverableStatus[]>> = {
  ENVIADO_REVISAO: ["EM_REVISAO", "CORRECAO", "APROVADO"],
  EM_REVISAO: ["CORRECAO", "APROVADO"],
  APROVADO: ["ENTREGUE"],
  ENTREGUE: ["CONCLUIDO"],
  AGUARDANDO_EDITOR: ["EM_PRODUCAO"],
  EM_PRODUCAO: ["ENVIADO_REVISAO"],
  CORRECAO: ["EM_REVISAO", "APROVADO"],
};

function aggregateDemand(statuses: DeliverableStatus[]): DemandStatus {
  if (statuses.length === 0) return "PLANEJAMENTO";
  if (statuses.every((status) => status === "CONCLUIDO")) return "CONCLUIDO";
  if (statuses.every((status) => status === "ENTREGUE" || status === "CONCLUIDO")) return "ENTREGUE";
  if (statuses.some((status) => status === "CORRECAO")) return "CORRECAO";
  if (statuses.some((status) => status === "EM_REVISAO" || status === "ENVIADO_REVISAO")) {
    return "EM_REVISAO";
  }
  if (statuses.some((status) => status === "EM_PRODUCAO")) return "EM_PRODUCAO";
  if (statuses.some((status) => status === "APROVADO")) return "PRONTO_ENTREGA";
  if (statuses.every((status) => status === "AGUARDANDO_EDITOR")) return "AGUARDANDO_EDITOR";
  return "PLANEJAMENTO";
}

async function assertDemand(userId: string, role: string, demandId: string) {
  if (role === "GESTOR_GARRO") return;
  if (role !== "EDITOR") redirect("/?erro=acesso");
  const assigned = await prisma.deliverable.count({ where: { demandId, editorId: userId } });
  if (!assigned) redirect("/?erro=acesso");
}

async function syncDemand(demandId: string) {
  const items = await prisma.deliverable.findMany({
    where: { demandId },
    select: { status: true },
  });
  await prisma.demand.update({
    where: { id: demandId },
    data: { status: aggregateDemand(items.map((item) => item.status)) },
  });
}

async function upsertEvent(input: {
  deliverableId: string;
  demandId: string;
  userId: string;
  type: ScheduleEventType;
  title: string;
  dueAt: Date;
}) {
  const existing = await prisma.scheduleEvent.findFirst({
    where: { deliverableId: input.deliverableId, type: input.type, status: "PENDENTE" },
  });
  if (existing) {
    await prisma.scheduleEvent.update({
      where: { id: existing.id },
      data: { dueAt: input.dueAt, userId: input.userId, title: input.title },
    });
    return;
  }
  await prisma.scheduleEvent.create({ data: input });
}

export async function assignEditor(formData: FormData) {
  const user = await requireManager();
  const deliverableId = text(formData, "deliverableId");
  const editorId = text(formData, "editorId");
  const editorDueAt = parseSaoPaulo(text(formData, "editorDueAt"));
  const reviewDueAt = parseSaoPaulo(text(formData, "reviewDueAt"));
  const item = await prisma.deliverable.findUnique({
    where: { id: deliverableId },
    include: { demand: true },
  });
  const editor = await prisma.user.findFirst({
    where: { id: editorId, role: "EDITOR", active: true },
  });
  if (!item || !editor || !editorDueAt) {
    reject(item ? `/demandas/${item.demandId}` : "/demandas", "Escolha um editor ativo e o prazo dele.");
  }

  await prisma.deliverable.update({
    where: { id: item.id },
    data: {
      editorId: editor.id,
      editorDueAt,
      reviewDueAt,
      status: item.status === "AGUARDANDO_EDITOR" ? "AGUARDANDO_EDITOR" : item.status,
    },
  });
  await upsertEvent({
    deliverableId: item.id,
    demandId: item.demandId,
    userId: editor.id,
    type: "ENTREGA_EDITOR",
    title: `${item.title} — entrega do editor`,
    dueAt: editorDueAt,
  });
  if (reviewDueAt) {
    await upsertEvent({
      deliverableId: item.id,
      demandId: item.demandId,
      userId: user.id,
      type: "REVISAO_GARRO",
      title: `${item.title} — revisão Garro`,
      dueAt: reviewDueAt,
    });
  }
  await prisma.demandMessage.create({
    data: {
      demandId: item.demandId,
      senderId: user.id,
      system: true,
      content: `${editor.name} ficou responsável por ${item.title}.`,
    },
  });
  await notify({
    userId: editor.id,
    type: "ATRIBUICAO",
    title: "Novo trabalho",
    message: item.title,
    href: `/demandas/${item.demandId}`,
  });
  await audit(user.id, "DELIVERABLE_ASSIGNED", "Deliverable", item.id, { editorId });
  await syncDemand(item.demandId);
  revalidatePath(`/demandas/${item.demandId}`);
  redirect(`/demandas/${item.demandId}`);
}

export async function changeDeliverableStatus(formData: FormData) {
  const user = await requireUser();
  const deliverableId = text(formData, "deliverableId");
  const next = text(formData, "status") as DeliverableStatus;
  const note = text(formData, "note");
  const item = await prisma.deliverable.findUnique({ where: { id: deliverableId } });
  if (!item) reject("/demandas", "Entregável não encontrado.");
  await assertDemand(user.id, user.role, item.demandId);

  const allowed =
    user.role === "GESTOR_GARRO" ? MANAGER_NEXT[item.status] ?? [] : EDITOR_NEXT[item.status] ?? [];
  if (user.role === "EDITOR" && item.editorId !== user.id) redirect("/?erro=acesso");
  if (!allowed.includes(next)) reject(`/demandas/${item.demandId}`, "Esta mudança de status não é permitida.");

  const now = new Date();
  await prisma.deliverable.update({
    where: { id: item.id },
    data: {
      status: next,
      editorDeliveredAt: next === "ENVIADO_REVISAO" ? item.editorDeliveredAt ?? now : item.editorDeliveredAt,
      managerApprovedAt: next === "APROVADO" ? now : item.managerApprovedAt,
      clientDeliveredAt: next === "ENTREGUE" ? now : item.clientDeliveredAt,
    },
  });
  await prisma.demandMessage.create({
    data: {
      demandId: item.demandId,
      senderId: user.id,
      system: true,
      content: note ? `${item.title}: ${next}. ${note}` : `${item.title} mudou para ${next}.`,
    },
  });

  if (next === "ENVIADO_REVISAO") {
    const managers = await prisma.user.findMany({ where: { role: "GESTOR_GARRO", active: true } });
    await Promise.all(
      managers.map((manager) =>
        notify({
          userId: manager.id,
          type: "REVISAO",
          title: "Material para revisão",
          message: item.title,
          href: `/demandas/${item.demandId}`,
        }),
      ),
    );
  }
  if ((next === "CORRECAO" || next === "APROVADO") && item.editorId) {
    await notify({
      userId: item.editorId,
      type: next,
      title: next === "APROVADO" ? "Material aprovado" : "Correção solicitada",
      message: note || item.title,
      href: `/demandas/${item.demandId}`,
    });
  }
  await audit(user.id, "DELIVERABLE_STATUS", "Deliverable", item.id, { from: item.status, to: next });
  await syncDemand(item.demandId);
  revalidatePath(`/demandas/${item.demandId}`);
  redirect(`/demandas/${item.demandId}`);
}

export async function addDemandMessage(formData: FormData) {
  const user = await requireUser();
  const demandId = text(formData, "demandId");
  const content = text(formData, "content");
  if (content.length < 1) reject(demandId ? `/demandas/${demandId}` : "/demandas", "Escreva a mensagem.");
  await assertDemand(user.id, user.role, demandId);
  await prisma.demandMessage.create({
    data: { demandId, senderId: user.id, content, system: false },
  });
  const demand = await prisma.demand.findUnique({
    where: { id: demandId },
    include: { deliverables: { select: { editorId: true } } },
  });
  const recipients = new Set<string>();
  if (user.role === "EDITOR") {
    const managers = await prisma.user.findMany({ where: { role: "GESTOR_GARRO", active: true } });
    managers.forEach((manager) => recipients.add(manager.id));
  } else {
    demand?.deliverables.forEach((item) => {
      if (item.editorId && item.editorId !== user.id) recipients.add(item.editorId);
    });
  }
  await Promise.all(
    [...recipients].map((userId) =>
      notify({
        userId,
        type: "MENSAGEM",
        title: "Nova mensagem da demanda",
        message: content.slice(0, 140),
        href: `/demandas/${demandId}`,
      }),
    ),
  );
  revalidatePath(`/demandas/${demandId}`);
  redirect(`/demandas/${demandId}`);
}

export async function addDemandLink(formData: FormData) {
  const user = await requireUser();
  const demandId = text(formData, "demandId");
  const fileName = text(formData, "fileName");
  const storagePath = text(formData, "storagePath");
  if (!fileName || !/^https?:\/\//i.test(storagePath)) {
    reject(demandId ? `/demandas/${demandId}` : "/demandas", "Informe um nome e um link http(s).");
  }
  await assertDemand(user.id, user.role, demandId);
  await prisma.demandFile.create({
    data: { demandId, fileName, storagePath, uploadedById: user.id },
  });
  await audit(user.id, "DEMAND_LINK", "Demand", demandId, { fileName });
  revalidatePath(`/demandas/${demandId}`);
  redirect(`/demandas/${demandId}`);
}
