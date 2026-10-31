import type { DeliverableStatus, DemandStatus, Prisma } from "@prisma/client";

export function aggregateDemand(statuses: DeliverableStatus[]): DemandStatus {
  if (statuses.length === 0) return "PLANEJAMENTO";
  if (statuses.every((status) => status === "CONCLUIDO")) return "CONCLUIDO";
  if (statuses.every((status) => status === "ENTREGUE" || status === "CONCLUIDO")) return "ENTREGUE";
  if (statuses.some((status) => status === "CORRECAO")) return "CORRECAO";
  if (statuses.some((status) => status === "EM_REVISAO" || status === "ENVIADO_REVISAO")) return "EM_REVISAO";
  if (statuses.some((status) => status === "EM_PRODUCAO")) return "EM_PRODUCAO";
  if (statuses.some((status) => status === "APROVADO")) return "PRONTO_ENTREGA";
  if (statuses.every((status) => status === "AGUARDANDO_EDITOR")) return "AGUARDANDO_EDITOR";
  return "PLANEJAMENTO";
}

export async function syncDemandStatus(tx: Prisma.TransactionClient, demandId: string) {
  const items = await tx.deliverable.findMany({
    where: { demandId, archivedAt: null },
    select: { status: true },
  });
  const status = aggregateDemand(items.map((item) => item.status));
  await tx.demand.update({ where: { id: demandId }, data: { status } });
  return status;
}
