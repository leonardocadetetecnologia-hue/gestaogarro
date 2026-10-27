ALTER TABLE "Customer" ADD COLUMN "createdById" TEXT;

UPDATE "Customer" AS c
SET "createdById" = first_owner."responsibleId"
FROM (
  SELECT DISTINCT ON ("customerId") "customerId", "responsibleId"
  FROM "Opportunity"
  ORDER BY "customerId", "createdAt" ASC
) AS first_owner
WHERE c."id" = first_owner."customerId"
  AND c."createdById" IS NULL;

CREATE INDEX "Customer_createdById_idx" ON "Customer"("createdById");

ALTER TABLE "Customer" ADD CONSTRAINT "Customer_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
