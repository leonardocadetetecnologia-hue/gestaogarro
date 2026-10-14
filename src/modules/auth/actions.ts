"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
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

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(200),
  selectedRole: z.enum(["GESTOR_GARRO", "ATENDENTE", "EDITOR"]),
});

export async function login(_state: { error?: string } | undefined, formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    selectedRole: formData.get("selectedRole"),
  });
  if (!parsed.success) return { error: "Informe e-mail e senha válidos." };

  const email = parsed.data.email.toLowerCase();
  if (tooManyAttempts(email)) return { error: "Muitas tentativas. Aguarde alguns minutos." };

  const user = await prisma.user.findUnique({ where: { email } });
  const valid = user ? await bcrypt.compare(parsed.data.password, user.passwordHash) : false;
  if (!user || !valid || !user.active) {
    registerFailure(email);
    await audit(user?.id ?? null, "LOGIN_FAILED", "User", user?.id ?? email);
    return { error: "E-mail ou senha incorretos." };
  }

  if (user.role !== parsed.data.selectedRole) {
    await audit(user.id, "LOGIN_ROLE_MISMATCH", "User", user.id);
    return { error: "Não foi possível entrar. Confira os dados e o perfil selecionado." };
  }

  clearAttempts(email);
  await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  await createSession(user.id, formData.get("rememberMe") === "1");
  await audit(user.id, "LOGIN", "User", user.id);
  redirect(loginDestination(user.role));
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
