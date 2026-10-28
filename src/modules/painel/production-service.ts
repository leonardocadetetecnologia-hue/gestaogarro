import { z } from "zod";
import type { SessionUser } from "@/lib/auth";
import { dateInputSaoPaulo } from "@/lib/date-input";
import { prisma } from "@/lib/prisma";
import { CrmFlowError } from "@/modules/crm/send-to-production";
import { addDemandMessage, assignEditor, changeDeliverableStatus } from "@/modules/production/actions";
import { assignManyDeliverables } from "@/modules/production/assignment-service";
import { createDirectDemand, directDemandSchema } from "@/modules/production/create-demand";
import { addDeliverable, addDeliverableSchema, demandMediaSchema, renameDeliverable, renameDeliverableSchema, saveDemandMedia, updateDemandDetails, updateDemandSchema } from "@/modules/production/demand-edit";
import { saveDeliverableScript, taskScriptSchema } from "@/modules/production/script-service";

const id = z.string().min(1).max(80);
const schema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("createDemand"), input: directDemandSchema }),
  z.object({ kind: z.literal("updateDemand"), input: updateDemandSchema }),
  z.object({ kind: z.literal("demandMedia"), input: demandMediaSchema }),
  z.object({ kind: z.literal("addDeliverable"), input: addDeliverableSchema }),
  z.object({ kind: z.literal("renameDeliverable"), input: renameDeliverableSchema }),
  z.object({ kind: z.literal("script"), input: taskScriptSchema }),
  z.object({ kind: z.literal("assign"), id, editorId: id, editorDue: z.string().datetime({ offset: true }).optional(), reviewDue: z.string().datetime({ offset: true }).or(z.literal("")).optional() }),
  z.object({ kind: z.literal("assignMany"), demandId: id, deliverableIds: z.array(id).min(1).max(100), editorId: id, editorDue: z.string().datetime({ offset: true }), reviewDue: z.string().datetime({ offset: true }).or(z.literal("")) }),
  z.object({ kind: z.literal("due"), id, field: z.enum(["editorDue", "reviewDue", "clientDue"]), value: z.string().datetime({ offset: true }) }),
  z.object({ kind: z.literal("status"), id, status: z.enum(["A iniciar", "Em edição", "Em revisão", "Correção", "Aprovado"]) }),
  z.object({ kind: z.literal("message"), id, message: z.string().trim().min(1).max(10000) }),
  z.object({ kind: z.literal("delivered"), id }),
  z.object({ kind: z.literal("read"), id }),
]);
export type ProductionCommand = z.infer<typeof schema>;

export async function executeProductionCommand(user: SessionUser, raw: unknown) {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw new CrmFlowError(parsed.error.issues[0].message);
  const input = parsed.data;
  if (input.kind === "createDemand") return createDirectDemand(user, input.input);
  if (input.kind === "updateDemand") return updateDemandDetails(user, input.input);
  if (input.kind === "demandMedia") return saveDemandMedia(user, input.input);
  if (input.kind === "addDeliverable") return addDeliverable(user, input.input);
  if (input.kind === "renameDeliverable") return renameDeliverable(user, input.input);
  if (input.kind === "script") return saveDeliverableScript(user, input.input);
  if (input.kind === "read") {
    await prisma.notification.updateMany({ where: { id: input.id, userId: user.id }, data: { readAt: new Date() } });
    return;
  }
  if (input.kind === "assignMany") {
    await assignManyDeliverables(user, {
      demandId: input.demandId, deliverableIds: input.deliverableIds, editorId: input.editorId,
      editorDueAt: new Date(input.editorDue), reviewDueAt: input.reviewDue ? new Date(input.reviewDue) : null,
    });
    return;
  }
  if (user.role === "ATENDENTE") throw new CrmFlowError("A produção é gerenciada pela Gestora e pelos editores atribuídos.");
  const form = new FormData();
  form.set("returnToPanel", "1");
  if (input.kind === "message") {
    form.set("demandId", input.id); form.set("content", input.message);
    await addDemandMessage(form);
    return;
  }
  if (input.kind === "status") {
    const statuses = { "A iniciar": "AGUARDANDO_EDITOR", "Em edição": "EM_PRODUCAO", "Em revisão": "ENVIADO_REVISAO", "Correção": "CORRECAO", "Aprovado": "APROVADO" };
    form.set("deliverableId", input.id); form.set("status", statuses[input.status]);
    await changeDeliverableStatus(form);
    return;
  }
  if (user.role !== "GESTOR_GARRO") throw new CrmFlowError("Somente a Gestora pode delegar, alterar prazos ou concluir entregas.");
  if (input.kind === "delivered") {
    await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "Demand" WHERE "id" = ${input.id} FOR UPDATE`;
      const items = await tx.deliverable.findMany({ where: { demandId: input.id } });
      if (!items.length || items.some(t => !["APROVADO", "ENTREGUE", "CONCLUIDO"].includes(t.status))) throw new CrmFlowError("Aprove todos os entregáveis antes de registrar a entrega ao cliente.");
      await tx.deliverable.updateMany({ where: { demandId: input.id, status: "APROVADO" }, data: { status: "ENTREGUE", clientDeliveredAt: new Date() } });
      await tx.demand.update({ where: { id: input.id }, data: { status: "ENTREGUE" } });
      await tx.scheduleEvent.updateMany({ where: { demandId: input.id, type: "ENTREGA_CLIENTE" }, data: { status: "CONCLUIDO", completedAt: new Date() } });
      await tx.auditLog.create({ data: { userId: user.id, action: "DEMAND_DELIVERED", entityType: "Demand", entityId: input.id } });
    });
    return;
  }
  const task = await prisma.deliverable.findUnique({ where: { id: input.id } });
  if (!task) throw new CrmFlowError("Entregável não encontrado.");
  if (input.kind === "due") {
    const field = { editorDue: "editorDueAt", reviewDue: "reviewDueAt", clientDue: "clientDueAt" }[input.field];
    await prisma.$transaction([
      prisma.deliverable.update({ where: { id: task.id }, data: { [field]: new Date(input.value) } }),
      prisma.scheduleEvent.updateMany({
        where: { deliverableId: task.id, type: input.field === "editorDue" ? "ENTREGA_EDITOR" : input.field === "reviewDue" ? "REVISAO_GARRO" : "ENTREGA_CLIENTE", status: "PENDENTE" },
        data: { dueAt: new Date(input.value) },
      }),
      prisma.auditLog.create({ data: { userId: user.id, action: "DELIVERABLE_DEADLINE", entityType: "Deliverable", entityId: task.id, details: { field: input.field } } }),
    ]);
    return;
  }
  const editorDue = input.editorDue ? new Date(input.editorDue) : task.editorDueAt;
  const reviewDue = input.reviewDue === "" ? null : input.reviewDue ? new Date(input.reviewDue) : task.reviewDueAt;
  if (!editorDue) throw new CrmFlowError("Informe o dia do prazo de edição.");
  form.set("deliverableId", task.id); form.set("editorId", input.editorId);
  form.set("editorDueAt", dateInputSaoPaulo(editorDue));
  form.set("reviewDueAt", reviewDue ? dateInputSaoPaulo(reviewDue) : "");
  await assignEditor(form);
}
