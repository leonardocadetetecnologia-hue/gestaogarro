"use server";

import type { DeliverableStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit, notify } from "@/lib/audit";
import { requireManager, requireUser } from "@/lib/auth";
import { composeDeadline } from "@/lib/date-input";
import { parseSaoPaulo } from "@/lib/deadlines";
import { prisma } from "@/lib/prisma";
import { reject } from "@/lib/redirect";
import { assignProductionEditor } from "./assignment-service";
import { syncDemandStatus } from "./demand-status";
import { leavesApproval, leavesClientDelivery, MANAGER_NEXT } from "./deliverable-flow";
import { CrmFlowError } from "@/modules/crm/send-to-production";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function deadlineField(formData: FormData, dateKey: string, timeKey: string) {
  const date = text(formData, dateKey);
  const time = text(formData, timeKey);
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return composeDeadline(date, time);
  return parseSaoPaulo(date);
}

const EDITOR_NEXT: Partial<Record<DeliverableStatus, DeliverableStatus[]>> = {
  AGUARDANDO_EDITOR: ["EM_PRODUCAO"],
  EM_PRODUCAO: ["ENVIADO_REVISAO"],
  CORRECAO: ["EM_PRODUCAO", "ENVIADO_REVISAO"],
};

async function assertDemand(userId: string, role: string, demandId: string) {
  if (role === "GESTOR_GARRO") return;
  if (role !== "EDITOR") redirect("/?erro=acesso");
  const assigned = await prisma.deliverable.count({ where: { demandId, editorId: userId, archivedAt: null } });
  if (!assigned) redirect("/?erro=acesso");
}

async function syncDemand(demandId: string) {
  await prisma.$transaction((tx) => syncDemandStatus(tx, demandId));
}

export async function assignEditor(formData: FormData) {
  const user = await requireManager();
  const deliverableId = text(formData, "deliverableId");
  try {
    await assignProductionEditor(user, {
      deliverableId, editorId: text(formData, "editorId"),
      editorDueAt: deadlineField(formData, "editorDueAt", "editorDueTime"),
      reviewDueAt: deadlineField(formData, "reviewDueAt", "reviewDueTime"),
    });
  } catch (error) {
    if (error instanceof CrmFlowError) reject("/demandas", error.message);
    throw error;
  }
  const item = await prisma.deliverable.findUnique({ where: { id: deliverableId }, select: { demandId: true } });
  if (!item) reject("/demandas", "Entregável não encontrado.");
  revalidatePath(`/demandas/${item.demandId}`);
  if (formData.get("returnToPanel") === "1") { revalidatePath("/painel", "layout"); return; }
  redirect(`/demandas/${item.demandId}`);
}

export async function changeDeliverableStatus(formData: FormData) {
  const user = await requireUser();
  const deliverableId = text(formData, "deliverableId");
  const next = text(formData, "status") as DeliverableStatus;
  const note = text(formData, "note");
  const item = await prisma.deliverable.findUnique({ where: { id: deliverableId } });
  if (!item) reject("/demandas", "Entregável não encontrado.");
  if (item.archivedAt) reject(`/demandas/${item.demandId}`, "Este entregável está arquivado.");
  await assertDemand(user.id, user.role, item.demandId);

  const allowed =
    user.role === "GESTOR_GARRO" ? MANAGER_NEXT[item.status] ?? [] : EDITOR_NEXT[item.status] ?? [];
  if (user.role === "EDITOR" && item.editorId !== user.id) redirect("/?erro=acesso");
  if (!allowed.includes(next)) reject(`/demandas/${item.demandId}`, "Esta mudança de status não é permitida.");

  const now = new Date();
  const reopening = leavesApproval(item.status, next);
  await prisma.deliverable.update({
    where: { id: item.id },
    data: {
      status: next,
      editorDeliveredAt: next === "ENVIADO_REVISAO" ? item.editorDeliveredAt ?? now : item.editorDeliveredAt,
      managerApprovedAt: next === "APROVADO" ? now : reopening ? null : item.managerApprovedAt,
      clientDeliveredAt: next === "ENTREGUE" ? now : leavesClientDelivery(item.status, next) ? null : item.clientDeliveredAt,
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

  if (next === "ENVIADO_REVISAO" && !reopening) {
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
  if (reopening && (next === "ENVIADO_REVISAO" || next === "EM_REVISAO") && item.editorId && item.editorId !== user.id) {
    await notify({
      userId: item.editorId,
      type: next,
      title: "Material voltou para revisão",
      message: note || item.title,
      href: `/demandas/${item.demandId}`,
    });
  }
  await audit(user.id, "DELIVERABLE_STATUS", "Deliverable", item.id, { from: item.status, to: next });
  await syncDemand(item.demandId);
  if (leavesClientDelivery(item.status, next)) {
    const demand = await prisma.demand.findUnique({ where: { id: item.demandId }, select: { status: true } });
    if (demand && demand.status !== "ENTREGUE" && demand.status !== "CONCLUIDO") {
      await prisma.scheduleEvent.updateMany({
        where: { demandId: item.demandId, type: "ENTREGA_CLIENTE", status: "CONCLUIDO" },
        data: { status: "PENDENTE", completedAt: null },
      });
    }
  }
  revalidatePath(`/demandas/${item.demandId}`);
  if (formData.get("returnToPanel") === "1") { revalidatePath("/painel", "layout"); return; }
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
    include: { deliverables: { where: { archivedAt: null }, select: { editorId: true } } },
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
  if (formData.get("returnToPanel") === "1") { revalidatePath("/painel", "layout"); return; }
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
  if (formData.get("returnToPanel") === "1") { revalidatePath("/painel", "layout"); return; }
  redirect(`/demandas/${demandId}`);
}
