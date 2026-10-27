ALTER TYPE "OpportunityStage" ADD VALUE 'EM_TRATATIVA';
ALTER TYPE "ScheduleEventType" ADD VALUE 'CONTATO_FUTURO';

ALTER TABLE "Notification" ADD COLUMN "visibleAt" TIMESTAMP(3);
CREATE INDEX "Notification_userId_visibleAt_createdAt_idx" ON "Notification"("userId", "visibleAt", "createdAt");

CREATE TABLE "KanbanLabel" (
  "stage" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "KanbanLabel_pkey" PRIMARY KEY ("stage")
);
