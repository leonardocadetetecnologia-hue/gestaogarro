"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { requireManager, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reject } from "@/lib/redirect";
import { editEditor } from "./edit-editor";
import { CrmFlowError } from "@/modules/crm/send-to-production";

export async function updateEditor(formData: FormData) {
  const user = await requireManager();
  try { await editEditor(user, { id: text(formData, "id"), name: text(formData, "name"), email: text(formData, "email") }); }
  catch (error) { reject("/usuarios", error instanceof CrmFlowError ? error.message : "Não foi possível atualizar o editor. Confira o e-mail e tente novamente."); }
  revalidatePath("/usuarios"); revalidatePath("/painel", "layout");
  redirect("/usuarios?ok=1");
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function createEditor(formData: FormData) {
  const user = await requireManager();
  const name = text(formData, "name");
  const email = text(formData, "email").toLowerCase();
  const password = text(formData, "password");
  if (name.length < 2 || !email.includes("@") || password.length < 8) {
    reject("/usuarios", "Informe nome, e-mail e uma senha com pelo menos 8 caracteres.");
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) reject("/usuarios", "Já existe um usuário com este e-mail.");
  const editor = await prisma.user.create({
    data: { name, email, passwordHash: await bcrypt.hash(password, 12), role: "EDITOR" },
  });
  await audit(user.id, "USER_CREATED", "User", editor.id, { role: "EDITOR" });
  revalidatePath("/usuarios");
  redirect("/usuarios");
}

export async function setUserActive(formData: FormData) {
  const user = await requireManager();
  const id = text(formData, "id");
  const active = text(formData, "active") === "true";
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target || target.role === "GESTOR_GARRO") reject("/usuarios", "Este usuário não pode ser alterado aqui.");
  await prisma.user.update({ where: { id }, data: { active } });
  if (!active) await prisma.session.deleteMany({ where: { userId: id } });
  await audit(user.id, active ? "USER_ACTIVATED" : "USER_DEACTIVATED", "User", id);
  revalidatePath("/usuarios");
  redirect("/usuarios");
}

export async function resetPassword(formData: FormData) {
  const user = await requireManager();
  const id = text(formData, "id");
  const password = text(formData, "password");
  if (password.length < 8) reject("/usuarios", "A nova senha precisa ter pelo menos 8 caracteres.");
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target || target.role === "GESTOR_GARRO") reject("/usuarios", "Não é possível redefinir esta senha aqui.");
  await prisma.user.update({ where: { id }, data: { passwordHash: await bcrypt.hash(password, 12) } });
  await prisma.session.deleteMany({ where: { userId: id } });
  await audit(user.id, "PASSWORD_RESET", "User", id);
  revalidatePath("/usuarios");
  redirect("/usuarios");
}

export async function updateProfile(formData: FormData) {
  const user = await requireUser();
  const name = text(formData, "name");
  if (name.length < 2) reject("/perfil", "Informe o nome.");
  await prisma.user.update({ where: { id: user.id }, data: { name } });
  revalidatePath("/perfil");
  redirect("/perfil?ok=1");
}

export async function changeOwnPassword(formData: FormData) {
  const user = await requireUser();
  const current = text(formData, "current");
  const next = text(formData, "next");
  if (next.length < 8) reject("/perfil", "A nova senha precisa ter pelo menos 8 caracteres.");
  const record = await prisma.user.findUnique({ where: { id: user.id } });
  if (!record || !(await bcrypt.compare(current, record.passwordHash))) {
    reject("/perfil", "Senha atual incorreta.");
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(next, 12) },
  });
  await audit(user.id, "PASSWORD_CHANGED", "User", user.id);
  redirect("/perfil?ok=senha");
}

export async function saveTimerSettings(formData: FormData) {
  const user = await requireManager();
  const yellow = Number(text(formData, "yellowHours"));
  const orange = Number(text(formData, "orangeHours"));
  const red = Number(text(formData, "redHours"));
  if (![yellow, orange, red].every((value) => Number.isFinite(value) && value > 0) || !(yellow < orange && orange < red)) {
    reject("/configuracoes", "Use horas crescentes: atenção, urgente e atraso.");
  }
  await prisma.$transaction([
    prisma.setting.upsert({ where: { key: "timer.yellowHours" }, update: { value: String(yellow) }, create: { key: "timer.yellowHours", value: String(yellow) } }),
    prisma.setting.upsert({ where: { key: "timer.orangeHours" }, update: { value: String(orange) }, create: { key: "timer.orangeHours", value: String(orange) } }),
    prisma.setting.upsert({ where: { key: "timer.redHours" }, update: { value: String(red) }, create: { key: "timer.redHours", value: String(red) } }),
  ]);
  await audit(user.id, "SETTINGS_UPDATED", "Setting", "timers");
  revalidatePath("/configuracoes");
  redirect("/configuracoes?ok=1");
}

export async function markNotificationRead(formData: FormData) {
  const user = await requireUser();
  const id = text(formData, "id");
  await prisma.notification.updateMany({
    where: { id, userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  const notification = await prisma.notification.findFirst({ where: { id, userId: user.id } });
  revalidatePath("/notificacoes");
  if (notification?.href) redirect(notification.href);
  redirect("/notificacoes");
}
