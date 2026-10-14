import type { Role } from "@prisma/client";

export function loginDestination(role: Role) {
  if (role === "ATENDENTE") return "/crm";
  if (role === "EDITOR") return "/demandas";
  return "/";
}
