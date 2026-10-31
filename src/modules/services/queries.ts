import { Prisma } from "@prisma/client";
import type { SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { installGarroServices } from "./catalog";
import { snapshotOf } from "./commands";
import { proposalActionLabel, type ServiceProposalAction, type ServiceSnapshot } from "./model";
import { serviceChanges, type ServiceChange } from "./rules";

const include = {
  variations: { orderBy: { sortOrder: "asc" as const } },
  usages: { select: { id: true }, take: 1 },
} satisfies Prisma.ServiceInclude;

type ProposalRow = {
  id: string;
  serviceId: string | null;
  action: ServiceProposalAction;
  payload: Prisma.JsonValue;
  before: Prisma.JsonValue;
  createdAt: Date;
  author: { id: string; name: string };
};

function asSnapshot(value: Prisma.JsonValue): ServiceSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as unknown as ServiceSnapshot;
}

function proposalBody(value: Prisma.JsonValue) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {} as { service?: ServiceSnapshot; includeCost?: boolean; status?: string; deleted?: boolean };
  return value as { service?: ServiceSnapshot; includeCost?: boolean; status?: string; deleted?: boolean };
}

function proposalChanges(proposal: ProposalRow) {
  const body = proposalBody(proposal.payload);
  const before = asSnapshot(proposal.before);
  if (body.service) return serviceChanges(before, body.service, body.includeCost !== true);
  if (body.deleted) return [{ field: "Serviço", before: before?.name || "Serviço", after: "Excluído" }];
  if (body.status) return [{ field: "Status", before: body.status === "ARQUIVADO" ? "Ativo" : "Arquivado", after: body.status === "ARQUIVADO" ? "Arquivado" : "Ativo" }];
  return [] as ServiceChange[];
}

export async function loadCommercialServices(user: SessionUser) {
  const installed = await prisma.setting.findUnique({ where: { key: "services.catalog" } });
  if (!installed) {
    try {
      await prisma.$transaction((tx) => installGarroServices(tx));
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
    }
  }
  const [rows, proposals] = await Promise.all([
    prisma.service.findMany({ orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }], include }),
    prisma.serviceProposal.findMany({
      where: { status: "PENDENTE", ...(user.role === "ATENDENTE" ? { authorId: user.id } : {}) },
      orderBy: { createdAt: "asc" },
      include: { author: { select: { id: true, name: true } } },
    }),
  ]);
  const allPending = await prisma.serviceProposal.findMany({ where: { status: "PENDENTE" }, select: { serviceId: true } });
  const pendingIds = new Set(allPending.map((item) => item.serviceId).filter((id): id is string => Boolean(id)));
  const manager = user.role === "GESTOR_GARRO";
  return {
    services: rows.map((row) => {
      const snapshot = snapshotOf(row);
      return {
        ...snapshot,
        id: row.id,
        standardCost: manager ? snapshot.standardCost : null,
        status: row.status,
        used: row.usages.length > 0,
        pending: pendingIds.has(row.id),
      };
    }),
    serviceProposals: proposals.map((proposal) => ({
      id: proposal.id,
      serviceId: proposal.serviceId || "",
      serviceName: asSnapshot(proposal.before)?.name || proposalBody(proposal.payload).service?.name || "Novo serviço",
      action: proposal.action,
      actionLabel: proposalActionLabel[proposal.action],
      authorId: proposal.author.id,
      authorName: proposal.author.name,
      createdAt: proposal.createdAt.toISOString(),
      changes: proposalChanges(proposal),
    })),
  };
}
