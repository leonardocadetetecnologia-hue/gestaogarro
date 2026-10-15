import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "../src/lib/prisma";
import { executeCrmCommand } from "../src/modules/painel/crm-service";
import { sendToProduction } from "../src/modules/crm/send-to-production";
import { loadPanelState } from "../src/modules/painel/state";
import { assignProductionEditor } from "../src/modules/production/assignment-service";
import { createDirectDemand } from "../src/modules/production/create-demand";
import { editEditor } from "../src/modules/users/edit-editor";
import { saveDeliverableScript } from "../src/modules/production/script-service";
import type { SessionUser } from "../src/lib/auth";

// Este teste nunca executa contra o banco de produção.
if (!process.env.DATABASE_URL?.includes("@garro-flow-qa-db:5432/garro_qa")) {
  throw new Error("Use exclusivamente o PostgreSQL isolado garro-flow-qa-db / garro_qa.");
}

async function main() {
  const users = await Promise.all([
    prisma.user.create({ data: { name: "QA Gestora", email: "manager@example.invalid", passwordHash: "TEST_FIXTURE", role: "GESTOR_GARRO" } }),
    prisma.user.create({ data: { name: "QA Atendente", email: "attendant@example.invalid", passwordHash: "TEST_FIXTURE", role: "ATENDENTE" } }),
    prisma.user.create({ data: { name: "QA Editor", email: "editor@example.invalid", passwordHash: "TEST_FIXTURE", role: "EDITOR" } }),
  ]);
  const [manager, attendant, editor]: SessionUser[] = users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role }));
  await executeCrmCommand(attendant, {
    kind: "createCustomer", value: 14000.5,
    customer: { id: "local-draft", name: "QA Cliente", phone: "", email: "", origin: "Site", company: "", service: "QA Vídeo", notes: "" },
  });
  const opportunity = await prisma.opportunity.findFirstOrThrow();
  assert.equal(opportunity.stage, "LEAD");
  assert.equal((await prisma.customer.findUniqueOrThrow({ where: { id: opportunity.customerId } })).kind, "LEAD");
  await executeCrmCommand(attendant, { kind: "move", id: opportunity.id, stage: "Follow-up" });
  await executeCrmCommand(attendant, {
    kind: "contact", id: opportunity.id, summary: "QA registrar retorno", waitingOn: "cliente", nextAction: "QA Retornar ao cliente", nextAt: new Date().toISOString(),
  });
  const input = { opportunityId: opportunity.id, title: "QA Vídeo contratado", description: "QA Briefing de produção", amount: "14000.50", due: new Date().toISOString(), deliverables: ["QA Vídeo principal", "QA Reel"] };
  await assert.rejects(sendToProduction(attendant, input), /Fechado com sucesso/);
  await executeCrmCommand(attendant, { kind: "move", id: opportunity.id, stage: "Fechado com sucesso" });
  assert.equal((await prisma.customer.findUniqueOrThrow({ where: { id: opportunity.customerId } })).kind, "CLIENTE");
  assert.equal(await prisma.demand.count(), 0, "Mover o card não deve gerar a demanda sem envio explícito.");
  const results = await Promise.all([sendToProduction(attendant, input), sendToProduction(attendant, input)]);
  assert.equal(results[0].demandId, results[1].demandId);
  assert.equal(results.filter(r => !r.alreadySent).length, 1);
  assert.equal(await prisma.sale.count(), 1); assert.equal(await prisma.demand.count(), 1);
  assert.equal(await prisma.deliverable.count(), 2); assert.equal(await prisma.notification.count({ where: { type: "NOVA_DEMANDA" } }), 1);
  const savedSale = await prisma.sale.findFirstOrThrow(); assert.equal(savedSale.value.toString(), "14000.5");
  await assert.rejects(executeCrmCommand(attendant, { kind: "move", id: opportunity.id, stage: "Lead" }), /produção/);
  await assert.rejects(sendToProduction(editor, input), /Este perfil/);
  const managerState = await loadPanelState(manager); assert.equal(managerState.demands.length, 1);
  const attendantState = await loadPanelState(attendant); assert.equal(attendantState.demands.length, 0); assert.equal(attendantState.opportunities[0].demandId, results[0].demandId);
  assert.equal((await loadPanelState(editor)).opportunities.length, 0);
  const task = await prisma.deliverable.findFirstOrThrow();
  await assignProductionEditor(manager, { deliverableId: task.id, editorId: manager.id, editorDueAt: new Date(), reviewDueAt: new Date() });
  const ownTask = await prisma.deliverable.findUniqueOrThrow({ where: { id: task.id } }); assert.equal(ownTask.editorId, manager.id);
  await assert.rejects(assignProductionEditor(editor, { deliverableId: task.id, editorId: editor.id, editorDueAt: new Date(), reviewDueAt: null }), /Somente a Gestora/);
  const finalState = await loadPanelState(manager);
  assert.ok(finalState.schedule.some(e => e.deliverableId === task.id && e.responsibleRole === "GESTOR_GARRO" && e.origin === "Produção"));
  assert.ok(finalState.editors.some(e => e.id === manager.id && e.role === "GESTOR_GARRO"));

  // Provoca uma falha depois de criar a venda, para comprovar o rollback completo.
  await prisma.$executeRaw`ALTER TABLE "Demand" ADD CONSTRAINT "qa_force_failure" CHECK ("title" <> 'QA_FORCE_FAILURE')`;
  const another = await prisma.opportunity.create({ data: { customerId: opportunity.customerId, responsibleId: attendant.id, service: "QA Falha", stage: "FECHADO", outcome: "GANHA" } });
  await assert.rejects(sendToProduction(attendant, { ...input, opportunityId: another.id, title: "QA_FORCE_FAILURE" }));
  assert.equal(await prisma.sale.count(), 1); assert.equal(await prisma.demand.count(), 1);
  assert.equal(await prisma.notification.count({ where: { type: "NOVA_DEMANDA" } }), 1);
  console.log("PASS: persistência, envio explícito, concorrência, duplicação, rollback, RBAC e Gestora executora.");

  const directInput = { title: "QA Nova produção", description: "QA Briefing direto", due: new Date().toISOString(), deliverables: ["QA Entrega"] };
  const directId = await createDirectDemand(manager, { ...directInput, customerId: opportunity.customerId });
  const direct = await prisma.demand.findUniqueOrThrow({ where: { id: directId } });
  assert.equal(direct.saleId, null); assert.equal(direct.customerId, opportunity.customerId);
  assert.equal(await prisma.sale.count(), 1, "Demanda direta não pode inventar uma venda.");
  await assert.rejects(createDirectDemand(attendant, { ...directInput, customerId: opportunity.customerId }), /Somente a Gestora/);
  await executeCrmCommand(attendant, { kind: "createCustomer", value: null, customer: { id: "draft", kind: "LEAD", name: "QA Lead novo", phone: "", email: "", company: "", origin: "Site", service: "Vídeo", notes: "" } });
  const lead = await prisma.customer.findFirstOrThrow({ where: { name: "QA Lead novo" } });
  await assert.rejects(createDirectDemand(manager, { ...directInput, customerId: lead.id }), /Leads precisam/);
  const opportunitiesBefore = await prisma.opportunity.count();
  await executeCrmCommand(manager, { kind: "createCustomer", value: null, customer: { id: "draft", kind: "CLIENTE", name: "QA Cliente cadastrado", phone: "", email: "", company: "", origin: "Site", service: "", notes: "" } });
  assert.equal(await prisma.opportunity.count(), opportunitiesBefore, "Cadastrar cliente não cria lead.");
  await executeCrmCommand(attendant, { kind: "createOpportunity", customerId: opportunity.customerId, service: "QA Nova negociação" });
  assert.equal(await prisma.opportunity.count(), opportunitiesBefore + 1);
  const customersBefore = await prisma.customer.count();
  await assert.rejects(createDirectDemand(manager, { ...directInput, title: "QA_FORCE_FAILURE", newCustomer: { name: "QA Cliente rollback", email: "", phone: "" } }));
  assert.equal(await prisma.customer.count(), customersBefore, "Cliente novo deve ser revertido se a demanda falhar.");
  const newId = await createDirectDemand(manager, { ...directInput, newCustomer: { name: "QA Cliente na demanda", email: "", phone: "" } });
  assert.equal((await prisma.demand.findUniqueOrThrow({ where: { id: newId }, include: { customer: true } })).customer.kind, "CLIENTE");
  await assert.rejects(editEditor(attendant, { id: editor.id, name: "QA Editado", email: "edited@example.invalid" }), /Somente a Gestora/);
  await assert.rejects(editEditor(manager, { id: manager.id, name: "QA Editado", email: "edited@example.invalid" }), /Editor não encontrado/);
  await assert.rejects(editEditor(manager, { id: editor.id, name: "QA Editado", email: manager.email }), /Já existe/);
  await editEditor(manager, { id: editor.id, name: "QA Editor atualizado", email: "edited@example.invalid" });
  const changed = await prisma.user.findUniqueOrThrow({ where: { id: editor.id } });
  assert.equal(changed.name, "QA Editor atualizado"); assert.equal(changed.role, "EDITOR");
  console.log("PASS: lead separado de cliente, conversão, nova oportunidade, demanda direta/novo cliente, rollback e edição de editor.");

  const script = "Ação\n".repeat(2000);
  await saveDeliverableScript(manager, { id: task.id, script, previous: "" });
  assert.equal((await prisma.deliverable.findUniqueOrThrow({ where: { id: task.id } })).description, script);
  const scriptAudits = await prisma.auditLog.count({ where: { action: "DELIVERABLE_SCRIPT_UPDATED" } });
  await saveDeliverableScript(manager, { id: task.id, script, previous: "" });
  assert.equal(await prisma.auditLog.count({ where: { action: "DELIVERABLE_SCRIPT_UPDATED" } }), scriptAudits);
  await assert.rejects(saveDeliverableScript(manager, { id: task.id, script: "x".repeat(10001), previous: script }), /10.000/);
  await assert.rejects(saveDeliverableScript(manager, { id: task.id, script: "Conflito", previous: "" }), /outra sessão/);
  for (const actor of [attendant, editor]) await assert.rejects(saveDeliverableScript(actor, { id: task.id, script: "Alteração indevida", previous: script }), /Somente a Gestora/);
  await assignProductionEditor(manager, { deliverableId: task.id, editorId: editor.id, editorDueAt: new Date(), reviewDueAt: new Date() });
  const editorWithScript = await loadPanelState(editor);
  assert.equal(editorWithScript.deliverables.find(t => t.id === task.id)?.script, script);
  assert.ok(editorWithScript.deliverables.every(t => t.editorId === editor.id));
  assert.equal((await loadPanelState(attendant)).deliverables.length, 0);
  await saveDeliverableScript(manager, { id: task.id, script: "", previous: script });
  assert.equal((await prisma.deliverable.findUniqueOrThrow({ where: { id: task.id } })).description, null);
  await saveDeliverableScript(manager, { id: task.id, script, previous: "" });
  await prisma.$executeRaw`ALTER TABLE "AuditLog" ADD CONSTRAINT "qa_script_audit_failure" CHECK ("action" <> 'DELIVERABLE_SCRIPT_UPDATED') NOT VALID`;
  await assert.rejects(saveDeliverableScript(manager, { id: task.id, script: "QA rollback", previous: script }));
  assert.equal((await prisma.deliverable.findUniqueOrThrow({ where: { id: task.id } })).description, script);
  await prisma.$executeRaw`ALTER TABLE "AuditLog" DROP CONSTRAINT "qa_script_audit_failure"`;
  console.log("PASS: script de 10.000 caracteres, persistência, consulta do editor, limite, conflito, RBAC e rollback.");

  if (process.env.QA_APP_URL && process.env.QA_SESSION_SECRET) {
    const secret = process.env.QA_SESSION_SECRET;
    const pages: { role: string; status: number }[] = [];
    for (const actor of [manager, attendant, editor]) {
      const token = randomBytes(24).toString("hex");
      await prisma.session.create({ data: { userId: actor.id, tokenHash: createHash("sha256").update(`${secret}:${token}`).digest("hex"), expiresAt: new Date(Date.now() + 3600000) } });
      const response: Response = await fetch(`${process.env.QA_APP_URL}/gestaogarro/painel/agenda`, { headers: { cookie: `garro_session=${token}` } });
      assert.equal(response.status, 200, `Agenda do perfil ${actor.role}`);
      const html = await response.text();
      if (actor.role === "GESTOR_GARRO") { assert.ok(html.includes("Agenda Global")); assert.ok(html.includes("Gestora · QA Gestora")); }
      else { assert.ok(!html.includes("Agenda Global")); assert.ok(!html.includes("QA Briefing de produção")); }
      pages.push({ role: actor.role, status: response.status });
    }
    console.log("PASS HTTP QA:", JSON.stringify(pages));
  }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Falha no teste isolado."); process.exitCode = 1; }).finally(() => prisma.$disconnect());
