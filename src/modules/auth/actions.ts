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
import { prisma } from "@/lib/prisma";

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(200),
});

export async function login(_state: { error?: string } | undefined, formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
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

  clearAttempts(email);
  await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  await createSession(user.id);
  await audit(user.id, "LOGIN", "User", user.id);
  redirect("/");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
