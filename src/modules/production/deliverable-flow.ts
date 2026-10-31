import type { DeliverableStatus } from "@prisma/client";
import type { TaskStatus } from "@/lib/data";

const SETTLED = new Set<DeliverableStatus>(["APROVADO", "ENTREGUE", "CONCLUIDO"]);
const DELIVERED = new Set<DeliverableStatus>(["ENTREGUE", "CONCLUIDO"]);
const REOPEN: DeliverableStatus[] = ["CORRECAO", "ENVIADO_REVISAO", "EM_REVISAO"];

export const MANAGER_NEXT: Partial<Record<DeliverableStatus, DeliverableStatus[]>> = {
  ENVIADO_REVISAO: ["EM_REVISAO", "CORRECAO", "APROVADO"],
  EM_REVISAO: ["CORRECAO", "APROVADO"],
  APROVADO: ["ENTREGUE", ...REOPEN],
  ENTREGUE: [...REOPEN],
  CONCLUIDO: [...REOPEN],
  AGUARDANDO_EDITOR: ["EM_PRODUCAO"],
  EM_PRODUCAO: ["ENVIADO_REVISAO"],
  CORRECAO: ["EM_PRODUCAO", "ENVIADO_REVISAO", "EM_REVISAO", "APROVADO"],
};

export function leavesApproval(current: DeliverableStatus, next: DeliverableStatus) {
  return SETTLED.has(current) && !SETTLED.has(next);
}

export function leavesClientDelivery(current: DeliverableStatus, next: DeliverableStatus) {
  return DELIVERED.has(current) && !DELIVERED.has(next);
}

export function managerStatusActions(status: TaskStatus): { status: TaskStatus; label: string }[] {
  if (status === "Em revisão") return [
    { status: "Aprovado", label: "Aprovar" },
    { status: "Correção", label: "Solicitar correção" },
  ];
  if (status === "Aprovado") return [
    { status: "Correção", label: "Solicitar correção" },
    { status: "Em revisão", label: "Voltar para revisão" },
  ];
  return [];
}
