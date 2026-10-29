/* Lista operacional privada. Sem --apply, só simula. Não grava a planilha no repositório. */
import fs from "node:fs";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { prepareContemporaneoWorkbook } from "./contemporaneo-leads.mjs";

const prisma = new PrismaClient({ log: [] });
const apply = process.argv.includes("--apply");
const inputFile = process.argv.find((arg) => arg.toLowerCase().endsWith(".xlsx"));

async function main() {
  assert.ok(inputFile && fs.existsSync(inputFile), "Informe a planilha .xlsx.");
  const prepared = prepareContemporaneoWorkbook(fs.readFileSync(inputFile));
  const included = prepared.filter((row) => row.include);
  assert.ok(included.length > 0 && included.length <= 500, "A lista não tem leads para gravar.");
  const result = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(202610291330::bigint)`;
    const owner = await tx.user.findUnique({ where: { username: "ana.atendente" }, select: { id: true, role: true, active: true } });
    assert.ok(owner?.active && owner.role === "ATENDENTE", "A conta ana.atendente não está disponível como atendente.");
    const report = {
      mode: apply ? "apply" : "dry-run",
      owner: "ana.atendente",
      rows: prepared.length,
      included: included.length,
      skipped: prepared.filter((row) => !row.include).length,
      created: 0,
      alreadyImported: 0,
      names: [],
    };
    for (const row of included) {
      const auditId = `contemp_${row.sourceKey}`;
      if (await tx.auditLog.findUnique({ where: { id: auditId }, select: { id: true } })) {
        report.alreadyImported += 1;
        continue;
      }
      report.created += 1;
      report.names.push({ sala: row.sala, name: row.name });
      if (!apply) continue;
      const customer = await tx.customer.create({
        data: {
          name: row.name, kind: "LEAD", phone: row.phone, email: row.email, company: row.name,
          origin: row.origin, notes: row.notes, createdById: owner.id,
        },
      });
      const opportunity = await tx.opportunity.create({
        data: {
          customerId: customer.id, responsibleId: owner.id, service: row.service, stage: "LEAD",
          outcome: "ABERTA", waitingOn: "NINGUEM", nextAction: "Revisar lead importado e definir próximo contato",
        },
      });
      await tx.crmInteraction.create({
        data: { opportunityId: opportunity.id, userId: owner.id, channel: "Importação", summary: `Lead importado da lista do Edifício Contemporâneo, sala ${row.sala || "não informada"}.`, occurredAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          id: auditId, userId: owner.id, action: "CRM_CONTEMPORANEO_IMPORTED", entityType: "Opportunity", entityId: opportunity.id,
          details: { sala: row.sala, customerId: customer.id },
        },
      });
    }
    return report;
  }, { maxWait: 10000, timeout: 60000 });
  console.log(JSON.stringify(result));
}

main().catch((error) => {
  console.error("Falha na importação. A transação foi revertida.", { type: error.name, code: error.code || "validation" });
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
