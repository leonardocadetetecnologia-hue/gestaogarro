import type { Role } from "@prisma/client";

export type Permission =
  | "crm"
  | "production"
  | "users"
  | "settings"
  | "agenda.global"
  | "commercial.values"
  | "reports";

const ATENDENTE: Permission[] = ["crm", "commercial.values"];

export function can(role: Role, permission: Permission): boolean {
  if (role === "GESTOR_GARRO") return true;
  if (role === "ATENDENTE") return ATENDENTE.includes(permission);
  if (role === "EDITOR") return permission === "production";
  return false;
}

export function isCommercial(role: Role) {
  return role === "GESTOR_GARRO" || role === "ATENDENTE";
}
