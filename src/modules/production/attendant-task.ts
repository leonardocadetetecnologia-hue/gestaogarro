import type { Role } from "@prisma/client";
import type { SessionUser } from "@/lib/auth";
import { composeDeadline } from "@/lib/date-input";
import { prisma } from "@/lib/prisma";
import { CrmFlowError } from "@/modules/crm/send-to-production";

type Actor = { id: string; role: Role };
type TaskAccess = { type: string; userId: string; createdById: string | null; createdByRole: Role | null };

export function canDeleteAttendantTask(actor: Actor, task: TaskAccess) {
  if (task.type !== "TAREFA_ATENDENTE" || !task.createdById || !task.createdByRole) return false;
  if (task.createdByRole === "GESTOR_GARRO") return actor.role === "GESTOR_GARRO";
  return actor.role === "ATENDENTE" && actor.id === task.createdById;
}

export function canCompleteAttendantTask(actor: Actor, task: TaskAccess) {
  if (task.type !== "TAREFA_ATENDENTE") return false;
  if (actor.role === "GESTOR_GARRO") return task.createdByRole === "GESTOR_GARRO";
  return actor.role === "ATENDENTE" && actor.id === task.userId;
}

function dueFrom(date: string, time: string) {
  const due = composeDeadline(date, time);
  if (!due) throw new CrmFlowError("Informe a data limite.");
  return due;
}

export async function assignAttendantTask(user: SessionUser, input: { assigneeId: string; title: string; date: string; time: string }) {
  if (user.role !== "GESTOR_GARRO") throw new CrmFlowError("Só a Gestora atribui função para a atendente.");
  const title = input.title.trim();
  if (!title) throw new CrmFlowError("Informe a função.");
  const due = dueFrom(input.date, input.time);
  const attendant = await prisma.user.findFirst({ where: { id: input.assigneeId, role: "ATENDENTE", active: true }, select: { id: true, name: true } });
  if (!attendant) throw new CrmFlowError("Escolha uma atendente.");
  await prisma.$transaction(async (tx) => {
    const event = await tx.scheduleEvent.create({
      data: { userId: attendant.id, createdById: user.id, type: "TAREFA_ATENDENTE", title, dueAt: due },
    });
    await tx.notification.create({
      data: { userId: attendant.id, type: "TAREFA_ATENDENTE", title: "Nova função", message: title, href: "/painel/agenda" },
    });
    await tx.auditLog.create({ data: { userId: user.id, action: "ATTENDANT_TASK_CREATED", entityType: "ScheduleEvent", entityId: event.id, details: { assigneeId: attendant.id } } });
  });
}

export async function createPersonalTask(user: SessionUser, input: { title: string; date: string; time: string }) {
  if (user.role !== "ATENDENTE") throw new CrmFlowError("Só a atendente cria o compromisso pessoal.");
  const title = input.title.trim();
  if (!title) throw new CrmFlowError("Informe o compromisso.");
  const due = dueFrom(input.date, input.time);
  await prisma.$transaction(async (tx) => {
    const event = await tx.scheduleEvent.create({
      data: { userId: user.id, createdById: user.id, type: "TAREFA_ATENDENTE", title, dueAt: due },
    });
    await tx.auditLog.create({ data: { userId: user.id, action: "PERSONAL_TASK_CREATED", entityType: "ScheduleEvent", entityId: event.id } });
  });
}

async function loadTask(id: string) {
  const task = await prisma.scheduleEvent.findUnique({
    where: { id },
    select: { id: true, type: true, userId: true, createdById: true, status: true, createdBy: { select: { role: true } } },
  });
  if (!task || task.type !== "TAREFA_ATENDENTE") throw new CrmFlowError("Esta função não está disponível.");
  return {
    id: task.id,
    type: task.type,
    userId: task.userId,
    createdById: task.createdById,
    createdByRole: task.createdBy?.role ?? null,
    status: task.status,
  };
}

export async function deleteAttendantTask(user: SessionUser, id: string) {
  const task = await loadTask(id);
  if (!canDeleteAttendantTask(user, task)) throw new CrmFlowError("Só quem criou esta função pode excluí-la.");
  await prisma.$transaction(async (tx) => {
    await tx.scheduleEvent.delete({ where: { id: task.id } });
    await tx.auditLog.create({ data: { userId: user.id, action: "ATTENDANT_TASK_DELETED", entityType: "ScheduleEvent", entityId: task.id } });
  });
}

export async function completeAttendantTask(user: SessionUser, id: string) {
  const task = await loadTask(id);
  if (task.status !== "PENDENTE") throw new CrmFlowError("Esta função já foi encerrada.");
  if (!canCompleteAttendantTask(user, task)) throw new CrmFlowError("Só a responsável ou a Gestora conclui esta função.");
  await prisma.scheduleEvent.update({ where: { id: task.id }, data: { status: "CONCLUIDO", completedAt: new Date() } });
}
