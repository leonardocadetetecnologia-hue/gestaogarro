import bcrypt from "bcryptjs";
import { audit } from "@/lib/audit";
import {
  clearAttempts,
  createSession,
  registerFailure,
  tooManyAttempts,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { findLoginAccount, loginSchema } from "./credentials";

export async function signIn(input: unknown, remember = false) {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { error: "Informe usuário e senha válidos." };

  const identifier = parsed.data.login;
  if (tooManyAttempts(identifier)) return { error: "Muitas tentativas. Aguarde alguns minutos." };

  const user = await findLoginAccount(identifier);
  const valid = user ? await bcrypt.compare(parsed.data.password, user.passwordHash) : false;
  if (!user || !valid || !user.active) {
    registerFailure(identifier);
    await audit(user?.id ?? null, "LOGIN_FAILED", "User", user?.id ?? identifier);
    return { error: "Usuário ou senha incorretos." };
  }

  if (user.role !== parsed.data.selectedRole) {
    await audit(user.id, "LOGIN_ROLE_MISMATCH", "User", user.id);
    return { error: "Não foi possível entrar. Confira os dados e o perfil selecionado." };
  }

  clearAttempts(identifier);
  await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  await createSession(user.id, remember);
  await audit(user.id, "LOGIN", "User", user.id);
  return { role: user.role };
}
