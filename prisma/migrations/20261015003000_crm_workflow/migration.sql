-- Mantém os valores legados para preservar registros e versões anteriores da aplicação.
ALTER TYPE "OpportunityStage" ADD VALUE IF NOT EXISTS 'LEAD';
ALTER TYPE "OpportunityStage" ADD VALUE IF NOT EXISTS 'SEM_INTERESSE';
ALTER TYPE "OpportunityStage" ADD VALUE IF NOT EXISTS 'REUNIAO_AGENDADA';
ALTER TYPE "OpportunityStage" ADD VALUE IF NOT EXISTS 'REUNIAO_REALIZADA';
ALTER TYPE "OpportunityStage" ADD VALUE IF NOT EXISTS 'BOLO';
