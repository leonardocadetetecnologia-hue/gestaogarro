CREATE TABLE "ScriptAttachment" (
    "id" TEXT NOT NULL,
    "deliverableId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "content" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScriptAttachment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ScriptAttachment_size_check" CHECK ("size" > 0 AND "size" <= 10485760 AND octet_length("content") = "size")
);
CREATE INDEX "ScriptAttachment_deliverableId_createdAt_idx" ON "ScriptAttachment"("deliverableId", "createdAt");
ALTER TABLE "ScriptAttachment" ADD CONSTRAINT "ScriptAttachment_deliverableId_fkey" FOREIGN KEY ("deliverableId") REFERENCES "Deliverable"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScriptAttachment" ADD CONSTRAINT "ScriptAttachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
