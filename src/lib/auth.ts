import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { sessionCookiePath } from "@/lib/public-path";
import { can, type Permission } from "@/lib/rbac";

const COOKIE = "garro_session";
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

const attempts = new Map<string, { count: number; reset: number }>();

function sessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32 || secret.includes("change-me")) {
    throw new Error("SESSION_SECRET inválido");
  }
  return secret;
}

function hashToken(token: string) {
  return createHash("sha256").update(`${sessionSecret()}:${token}`).digest("hex");
}

export function tooManyAttempts(email: string) {
  const current = attempts.get(email.toLowerCase());
  if (!current || current.reset < Date.now()) return false;
  return current.count >= 8;
}

export function registerFailure(email: string) {
  const key = email.toLowerCase();
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || current.reset < now) {
    attempts.set(key, { count: 1, reset: now + 15 * 60 * 1000 });
    return;
  }
  current.count += 1;
}

export function clearAttempts(email: string) {
  attempts.delete(email.toLowerCase());
}

export async function createSession(userId: string, remember = true) {
  const token = randomBytes(32).toString("base64url");
  const ttl = remember ? SESSION_MS : 12 * 60 * 60 * 1000;
  const expiresAt = new Date(Date.now() + ttl);
  await prisma.session.create({
    data: { userId, tokenHash: hashToken(token), expiresAt },
  });
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: sessionCookiePath(),
    ...(remember ? { expires: expiresAt } : {}),
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    const session = await prisma.session.findUnique({ where: { tokenHash: hashToken(token) }, select: { userId: true } });
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
    if (session) await audit(session.userId, "LOGOUT", "User", session.userId);
  }
  jar.set(COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: sessionCookiePath(),
    maxAge: 0,
  });
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt.getTime() < Date.now() || !session.user.active) return null;
  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role,
  };
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requirePermission(permission: Permission) {
  const user = await requireUser();
  if (!can(user.role, permission)) redirect("/?erro=acesso");
  return user;
}

export async function requireManager() {
  const user = await requireUser();
  if (user.role !== "GESTOR_GARRO") redirect("/?erro=acesso");
  return user;
}
