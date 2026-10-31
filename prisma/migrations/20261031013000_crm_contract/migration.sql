ALTER TYPE "OpportunityStage" ADD VALUE 'CONTRATO';

CREATE TYPE "PersonType" AS ENUM ('PESSOA_FISICA', 'EMPRESA');

ALTER TABLE "Customer" ADD COLUMN "instagram" TEXT;
ALTER TABLE "Customer" ADD COLUMN "personType" "PersonType";
ALTER TABLE "Customer" ADD COLUMN "zip" TEXT;
ALTER TABLE "Customer" ADD COLUMN "street" TEXT;
ALTER TABLE "Customer" ADD COLUMN "addressNumber" TEXT;
ALTER TABLE "Customer" ADD COLUMN "complement" TEXT;
ALTER TABLE "Customer" ADD COLUMN "district" TEXT;
ALTER TABLE "Customer" ADD COLUMN "addressCity" TEXT;
ALTER TABLE "Customer" ADD COLUMN "state" TEXT;

ALTER TABLE "Opportunity" ADD COLUMN "contractSigned" BOOLEAN;
ALTER TABLE "Opportunity" ADD COLUMN "contractSignedAt" TIMESTAMP(3);
ALTER TABLE "Opportunity" ADD COLUMN "contractFileName" TEXT;
ALTER TABLE "Opportunity" ADD COLUMN "contractMime" TEXT;
ALTER TABLE "Opportunity" ADD COLUMN "contractFile" BYTEA;

CREATE TABLE "CustomerBirthday" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "birthDate" DATE NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "CustomerBirthday_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContractLine" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "serviceId" TEXT,
    "serviceName" TEXT NOT NULL,
    "variationName" TEXT NOT NULL DEFAULT '',
    "extra" BOOLEAN NOT NULL DEFAULT false,
    "amount" DECIMAL(12,2),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ContractLine_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CustomerBirthday_customerId_sortOrder_idx" ON "CustomerBirthday"("customerId", "sortOrder");
CREATE INDEX "ContractLine_opportunityId_sortOrder_idx" ON "ContractLine"("opportunityId", "sortOrder");

ALTER TABLE "CustomerBirthday" ADD CONSTRAINT "CustomerBirthday_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContractLine" ADD CONSTRAINT "ContractLine_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
