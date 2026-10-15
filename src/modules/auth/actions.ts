"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import {
  clearAttempts,
  createSession,
  destroySession,
  registerFailure,
  tooManyAttempts,
} from "@/lib/auth";
import { loginDestination } from "@/lib/login-route";
import { prisma } from "@/lib/prisma";
import { findLoginAccount, loginSchema } from "./credentials";

export async function login(_state: { error?: string } | undefined, formData: FormData) {
  const parsed = loginSchema.safeParse({
    login: formData.get("login") ?? formData.get("email"),
    password: formData.get("password"),
    selectedRole: formData.get("selectedRole"),
  });
  if (!parsed.success) return { error: "Informe login e senha válidos." };

  const identifier = parsed.data.login;
  if (tooManyAttempts(identifier)) return { error: "Muitas tentativas. Aguarde alguns minutos." };

  const user = await findLoginAccount(identifier);
  const valid = user ? await bcrypt.compare(parsed.data.password, user.passwordHash) : false;
  if (!user || !valid || !user.active) {
    registerFailure(identifier);
    await audit(user?.id ?? null, "LOGIN_FAILED", "User", user?.id ?? identifier);
    return { error: "Login ou senha incorretos." };
  }

  if (user.role !== parsed.data.selectedRole) {
    await audit(user.id, "LOGIN_ROLE_MISMATCH", "User", user.id);
    return { error: "Não foi possível entrar. Confira os dados e o perfil selecionado." };
  }

  clearAttempts(identifier);
  await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  await createSession(user.id, formData.get("rememberMe") === "1");
  await audit(user.id, "LOGIN", "User", user.id);
  redirect(loginDestination(user.role));
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
