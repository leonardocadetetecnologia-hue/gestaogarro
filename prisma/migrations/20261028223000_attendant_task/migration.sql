-- Função isolada da atendente. O autor fica gravado para a exclusão.
ALTER TYPE "ScheduleEventType" ADD VALUE 'TAREFA_ATENDENTE';

ALTER TABLE "ScheduleEvent" ADD COLUMN "createdById" TEXT;

ALTER TABLE "ScheduleEvent" ADD CONSTRAINT "ScheduleEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
