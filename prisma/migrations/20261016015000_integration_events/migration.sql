CREATE TABLE "IntegrationFeedCounter" (
    "id" TEXT NOT NULL DEFAULT 'feed',
    "value" BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT "IntegrationFeedCounter_pkey" PRIMARY KEY ("id")
);

INSERT INTO "IntegrationFeedCounter" ("id", "value") VALUES ('feed', 0);

CREATE TABLE "IntegrationEvent" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "schemaVersion" INTEGER NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "payload" JSONB NOT NULL,
    "deduplicationKey" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "sequence" BIGINT NOT NULL,
    CONSTRAINT "IntegrationEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IntegrationEvent_eventId_key" ON "IntegrationEvent"("eventId");
CREATE UNIQUE INDEX "IntegrationEvent_deduplicationKey_key" ON "IntegrationEvent"("deduplicationKey");
CREATE UNIQUE INDEX "IntegrationEvent_sequence_key" ON "IntegrationEvent"("sequence");
CREATE INDEX "IntegrationEvent_scope_sequence_idx" ON "IntegrationEvent"("scope", "sequence");
