import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const loginSchema = z.object({
  login: z.string().trim().min(2).max(254).regex(/^\S+$/).transform(v => v.toLowerCase()),
  password: z.string().min(8).max(200),
  selectedRole: z.enum(["GESTOR_GARRO", "ATENDENTE", "EDITOR"]),
});

export async function findLoginAccount(identifier: string) {
  const username = identifier.trim().toLowerCase();
  const account = await prisma.user.findUnique({ where: { username } });
  if (account) return account;
  // Contas sem nome de usuário mantêm o acesso anterior por e-mail.
  return prisma.user.findFirst({ where: { email: username, username: null } });
}
