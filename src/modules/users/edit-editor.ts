import { z } from "zod";
import type { SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CrmFlowError } from "@/modules/crm/send-to-production";

const schema = z.object({ id: z.string().min(1).max(80), name: z.string().trim().min(2).max(200), email: z.string().trim().email().transform(v => v.toLowerCase()) });
export async function editEditor(user: SessionUser, raw: unknown) {
  if (user.role !== "GESTOR_GARRO") throw new CrmFlowError("Somente a Gestora pode editar editores.");
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw new CrmFlowError("Informe nome e e-mail válidos.");
  const { id, name, email } = parsed.data;
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${id} FOR UPDATE`;
    const target = await tx.user.findUnique({ where: { id } });
    if (!target || target.role !== "EDITOR") throw new CrmFlowError("Editor não encontrado.");
    const duplicate = await tx.user.findUnique({ where: { email } });
    if (duplicate && duplicate.id !== id) throw new CrmFlowError("Já existe um usuário com este e-mail.");
    await tx.user.update({ where: { id }, data: { name, email } });
    if (target.email !== email) await tx.session.deleteMany({ where: { userId: id } });
    await tx.auditLog.create({ data: { userId: user.id, action: "EDITOR_UPDATED", entityType: "User", entityId: id } });
  });
}
