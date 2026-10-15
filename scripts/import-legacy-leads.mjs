/* Private prepared JSON is an operational input, never a repository asset.
   Dry run is the default. Back up the database before using --apply. */
import fs from "node:fs";
import assert from "node:assert/strict";
import { PrismaClient, Prisma } from "@prisma/client";
const prisma = new PrismaClient({ log: [] });
const apply = process.argv.includes("--apply");
const inputFile = process.argv.find(arg => arg.endsWith(".json"));
const normalizeName = value => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toLowerCase();
const normalizePhone = value => {
  const digits = (value || "").replace(/\D/g, "");
  return digits.startsWith("55") && [12, 13].includes(digits.length) ? digits.slice(2) : digits;
};
async function main() {
  assert.ok(inputFile, "Informe o JSON preparado.");
  const payload = JSON.parse(fs.readFileSync(inputFile, "utf8"));
  assert.match(payload.sourceHash, /^[a-f0-9]{64}$/);
  assert.ok(Array.isArray(payload.records) && payload.records.length > 0 && payload.records.length <= 1000);
  const seen = new Set();
  for (const row of payload.records) {
    assert.match(row.sourceKey, /^[a-f0-9]{28}$/); assert.ok(!seen.has(row.sourceKey)); seen.add(row.sourceKey);
    assert.ok(row.name.length >= 2 && row.name.length <= 200 && row.notes.length <= 10000);
    assert.ok(["LEAD", "FOLLOW_UP"].includes(row.stage));
    assert.ok(normalizePhone(row.phone).length >= 10 && normalizePhone(row.phone).length <= 11);
    assert.ok(Number.isFinite(Date.parse(row.createdAt)));
    if (row.estimatedValue !== null) assert.ok(new Prisma.Decimal(row.estimatedValue).gt(0));
  }
  const result = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(71420261015::bigint)`;
    const owner = await tx.user.findUnique({ where: { username: "atendente@garro" }, select: { id: true, role: true, active: true } });
    assert.ok(owner?.active && owner.role === "ATENDENTE", "Conta da Atendente indisponível.");
    const customers = await tx.customer.findMany({ select: { id: true, name: true, phone: true } });
    const report = { mode: apply ? "apply" : "dry-run", sourceFile: payload.sourceFile, sourceHash: payload.sourceHash, total: payload.records.length, createdContacts: 0, reusedContacts: 0, createdOpportunities: 0, alreadyImported: 0, issues: [], rows: [] };
    for (const row of payload.records) {
      const auditId = `legacy_${row.sourceKey}`;
      if (await tx.auditLog.findUnique({ where: { id: auditId }, select: { id: true } })) { report.alreadyImported++; report.rows.push({ row: row.sourceRow, result: "already-imported" }); continue; }
      const matches = customers.filter(c => normalizePhone(c.phone) === normalizePhone(row.phone));
      if (matches.length > 1 || (matches.length === 1 && normalizeName(matches[0].name) !== normalizeName(row.name))) {
        report.issues.push({ row: row.sourceRow, reason: "Telefone coincide com cadastros ambíguos ou nome diferente; revisão manual necessária." }); continue;
      }
      const existing = matches[0];
      const customerId = existing?.id || `legacyc_${row.sourceKey}`;
      if (existing) report.reusedContacts++; else report.createdContacts++;
      const equivalent = existing ? await tx.opportunity.findFirst({ where: { customerId, stage: row.stage, service: row.service, estimatedValue: row.estimatedValue === null ? null : new Prisma.Decimal(row.estimatedValue) }, select: { id: true } }) : null;
      const opportunityId = equivalent?.id || `legacyo_${row.sourceKey}`;
      if (!equivalent) report.createdOpportunities++;
      if (apply) {
        const createdAt = new Date(row.createdAt);
        if (!existing) await tx.customer.create({ data: { id: customerId, name: row.name, kind: "LEAD", phone: row.phone, origin: row.origin, notes: row.notes, createdAt } });
        if (!equivalent) await tx.opportunity.create({ data: { id: opportunityId, customerId, responsibleId: owner.id, service: row.service, stage: row.stage, outcome: "ABERTA", estimatedValue: row.estimatedValue, createdAt, lastActivityAt: createdAt, waitingOn: "NINGUEM", nextAction: "Revisar lead importado e definir próximo contato" } });
        await tx.crmInteraction.create({ data: { opportunityId, userId: owner.id, channel: "Importação", summary: row.notes, occurredAt: new Date() } });
        await tx.auditLog.create({ data: { id: auditId, userId: owner.id, action: "CRM_LEGACY_IMPORTED", entityType: "Opportunity", entityId: opportunityId, details: { sourceFile: payload.sourceFile, sourceHash: payload.sourceHash, sourceRow: row.sourceRow, customerId, reusedContact: !!existing, reusedOpportunity: !!equivalent } } });
      }
      report.rows.push({ row: row.sourceRow, result: equivalent ? "linked-existing-opportunity" : "imported", customerId, opportunityId, stage: row.stage });
      if (!existing) customers.push({ id: customerId, name: row.name, phone: row.phone });
    }
    return report;
  }, { maxWait: 10000, timeout: 60000 });
  console.log(JSON.stringify(result, null, 2));
}
main().catch(error => { console.error("Falha na importação. A transação foi revertida.", { type: error.name, code: error.code || "validation" }); process.exitCode = 1; }).finally(() => prisma.$disconnect());
