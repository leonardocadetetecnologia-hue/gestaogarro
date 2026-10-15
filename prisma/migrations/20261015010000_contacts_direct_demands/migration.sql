CREATE TYPE "ContactKind" AS ENUM ('LEAD', 'CLIENTE');
ALTER TABLE "Customer" ADD COLUMN "kind" "ContactKind" NOT NULL DEFAULT 'LEAD';
UPDATE "Customer" SET "kind" = 'CLIENTE' WHERE "id" IN (
  SELECT "customerId" FROM "Sale" UNION SELECT "customerId" FROM "Demand"
  UNION SELECT "customerId" FROM "Opportunity" WHERE "stage" = 'FECHADO'
);
ALTER TABLE "Demand" ALTER COLUMN "saleId" DROP NOT NULL;
