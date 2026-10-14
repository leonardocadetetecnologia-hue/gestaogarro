import type { Role } from "@prisma/client";

export function loginDestination(role: Role) {
  void role;
  return "/painel";
}
