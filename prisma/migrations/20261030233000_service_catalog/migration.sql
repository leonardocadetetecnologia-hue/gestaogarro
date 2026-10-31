CREATE TYPE "ServiceCategory" AS ENUM ('ENSAIOS', 'CAPTACAO', 'EVENTOS', 'PLANOS', 'CAMPANHAS', 'ESCALAVEIS', 'SERVICO_EXTRA');
CREATE TYPE "ServicePriceType" AS ENUM ('FECHADO', 'POR_HORA', 'MENSAL');
CREATE TYPE "ServiceRecurrence" AS ENUM ('UMA_VEZ', 'TRES_MESES', 'SEIS_MESES', 'UM_ANO', 'DATA');
CREATE TYPE "ServiceStatus" AS ENUM ('ATIVO', 'ARQUIVADO');
CREATE TYPE "ServiceProposalAction" AS ENUM ('CRIAR', 'EDITAR', 'ARQUIVAR', 'DESARQUIVAR', 'EXCLUIR');
CREATE TYPE "ServiceProposalStatus" AS ENUM ('PENDENTE', 'AUTORIZADA', 'RECUSADA');

CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "ServiceCategory" NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "referencePrice" DECIMAL(12,2),
    "priceType" "ServicePriceType" NOT NULL DEFAULT 'FECHADO',
    "deliveryDays" INTEGER,
    "hasSelection" BOOLEAN NOT NULL DEFAULT false,
    "selectionDays" INTEGER,
    "recurrence" "ServiceRecurrence" NOT NULL DEFAULT 'UMA_VEZ',
    "recurrenceDate" TIMESTAMP(3),
    "standardCost" DECIMAL(12,2),
    "status" "ServiceStatus" NOT NULL DEFAULT 'ATIVO',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ServiceVariation" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "referencePrice" DECIMAL(12,2),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ServiceVariation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ServiceProposal" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT,
    "authorId" TEXT NOT NULL,
    "action" "ServiceProposalAction" NOT NULL,
    "payload" JSONB NOT NULL,
    "before" JSONB,
    "status" "ServiceProposalStatus" NOT NULL DEFAULT 'PENDENTE',
    "comment" TEXT NOT NULL DEFAULT '',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ServiceProposal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ServiceUsage" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "demandId" TEXT,
    "opportunityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ServiceUsage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Service_code_key" ON "Service"("code");
CREATE INDEX "Service_category_sortOrder_idx" ON "Service"("category", "sortOrder");
CREATE INDEX "Service_status_idx" ON "Service"("status");
CREATE INDEX "ServiceVariation_serviceId_sortOrder_idx" ON "ServiceVariation"("serviceId", "sortOrder");
CREATE INDEX "ServiceProposal_status_createdAt_idx" ON "ServiceProposal"("status", "createdAt");
CREATE INDEX "ServiceProposal_serviceId_status_idx" ON "ServiceProposal"("serviceId", "status");
CREATE INDEX "ServiceProposal_authorId_idx" ON "ServiceProposal"("authorId");
CREATE INDEX "ServiceUsage_serviceId_idx" ON "ServiceUsage"("serviceId");

ALTER TABLE "ServiceVariation" ADD CONSTRAINT "ServiceVariation_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServiceProposal" ADD CONSTRAINT "ServiceProposal_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ServiceProposal" ADD CONSTRAINT "ServiceProposal_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceProposal" ADD CONSTRAINT "ServiceProposal_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ServiceUsage" ADD CONSTRAINT "ServiceUsage_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
