ALTER TYPE "ScheduleEventType" ADD VALUE 'CAPTACAO';

ALTER TABLE "ContractLine" ADD COLUMN "serviceDate" DATE;
ALTER TABLE "ContractLine" ADD COLUMN "captureTime" TEXT;
ALTER TABLE "ContractLine" ADD COLUMN "capturePlace" TEXT;
ALTER TABLE "ContractLine" ADD COLUMN "proposedDays" INTEGER;

ALTER TABLE "Demand" ADD COLUMN "clientDueManual" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "ScheduleEvent" ADD COLUMN "place" TEXT;
ALTER TABLE "ScheduleEvent" ADD COLUMN "contractLineId" TEXT;
CREATE INDEX "ScheduleEvent_contractLineId_idx" ON "ScheduleEvent"("contractLineId");

CREATE TABLE "AgendaHoliday" (
    "id" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "AgendaHoliday_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AgendaHoliday_day_key" ON "AgendaHoliday"("day");
