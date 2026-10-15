import { z } from "zod";
import type { SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CrmFlowError } from "@/modules/crm/send-to-production";

export const taskScriptSchema = z.object({
  id: z.string().min(1).max(80),
  script: z.string().max(10000, "O script pode ter no máximo 10.000 caracteres."),
  previous: z.string().max(10000),
});

export async function saveDeliverableScript(user: SessionUser, raw: unknown) {
  if (user.role !== "GESTOR_GARRO") throw new CrmFlowError("Somente a Gestora pode alterar o script.");
  const parsed = taskScriptSchema.safeParse(raw);
  if (!parsed.success) throw new CrmFlowError(parsed.error.issues[0].message);
  const input = parsed.data;
  await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "Deliverable" WHERE "id" = ${input.id} FOR UPDATE`;
    const task = await tx.deliverable.findUnique({ where: { id: input.id }, select: { id: true, description: true } });
    if (!task) throw new CrmFlowError("Entregável não encontrado.");
    const current = task.description || "";
    if (current === input.script) return;
    if (current !== input.previous) throw new CrmFlowError("O script foi atualizado em outra sessão. Seu texto foi preservado; confira a versão atual antes de substituir.");
    await tx.deliverable.update({ where: { id: task.id }, data: { description: input.script || null } });
    await tx.auditLog.create({ data: {
      userId: user.id, action: "DELIVERABLE_SCRIPT_UPDATED", entityType: "Deliverable", entityId: task.id,
      details: { characters: input.script.length },
    } });
  }, { maxWait: 10000, timeout: 15000 });
}
