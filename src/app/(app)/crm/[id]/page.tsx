import Link from "next/link";
import { notFound } from "next/navigation";
import { DraftWatcher } from "@/components/draft-form";
import { requirePermission } from "@/lib/auth";
import { formatSaoPaulo } from "@/lib/deadlines";
import { STAGE_LABELS } from "@/lib/labels";
import { formatBRL } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { addInteraction, closeOpportunity, loseOpportunity } from "@/modules/crm/actions";

function draftValue(content: unknown, key: string) {
  if (!content || typeof content !== "object" || Array.isArray(content)) return "";
  const value = (content as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}

export default async function OpportunityPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ fechar?: string; perder?: string }>;
}) {
  const user = await requirePermission("crm");
  const { id } = await params;
  const query = await searchParams;
  const opportunity = await prisma.opportunity.findUnique({
    where: { id },
    include: {
      customer: true,
      responsible: true,
      interactions: { include: { user: true }, orderBy: { occurredAt: "desc" } },
      sale: true,
    },
  });
  if (!opportunity) notFound();
  const draft = await prisma.draft.findUnique({
    where: { userId_entityType_entityId: { userId: user.id, entityType: "close-sale", entityId: id } },
  });

  return (
    <section className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
      <div className="grid gap-4">
        <div className="rounded-lg bg-[var(--surface)] p-4">
          <p className="text-sm text-[var(--muted)]">{STAGE_LABELS[opportunity.stage]}</p>
          <h1 className="text-xl font-semibold">{opportunity.customer.name}</h1>
          <p>{opportunity.service}</p>
          <p className="mt-2">{formatBRL(opportunity.estimatedValue?.toString() ?? null)}</p>
          <p className="text-sm text-[var(--muted)]">
            {opportunity.customer.phone || "Sem telefone"} · {opportunity.customer.origin || "Sem origem"}
          </p>
          <p className="text-sm">Responsável: {opportunity.responsible.name}</p>
          {opportunity.outcome === "ABERTA" ? (
            <div className="mt-4 flex gap-2">
              <Link href={`/crm/${id}?fechar=1`} className="rounded-md bg-[var(--terra)] px-3 py-2 text-sm text-white">Fechar venda</Link>
              <Link href={`/crm/${id}?perder=1`} className="rounded-md border border-[var(--border)] px-3 py-2 text-sm">Perder</Link>
            </div>
          ) : null}
          {opportunity.lossReason ? <p className="mt-3 text-sm">Perdido: {opportunity.lossReason}</p> : null}
        </div>
        <form action={addInteraction} className="grid gap-3 rounded-lg bg-[var(--surface)] p-4">
          <h2 className="font-medium">Registrar contato</h2>
          <input type="hidden" name="opportunityId" value={id} />
          <label>Canal<input name="channel" defaultValue="Manual" /></label>
          <label>Resumo<textarea name="summary" required className="min-h-20" /></label>
          <label>Quando<input type="datetime-local" name="occurredAt" /></label>
          <label>
            Aguardando
            <select name="waitingOn" defaultValue="NINGUEM">
              <option value="NINGUEM">Ninguém</option>
              <option value="CLIENTE">Cliente</option>
              <option value="GARRO">Garro</option>
            </select>
          </label>
          <label>Próxima ação<input name="nextAction" /></label>
          <label>Data da próxima ação<input type="datetime-local" name="nextActionAt" /></label>
          <button className="rounded-md bg-[var(--brown)] px-3 py-2 text-white">Registrar</button>
        </form>
        <div className="rounded-lg bg-[var(--surface)] p-4">
          <h2 className="mb-2 font-medium">Histórico</h2>
          <div className="grid gap-2">
            {opportunity.interactions.map((item) => (
              <article key={item.id} className="border-b border-[var(--border)] pb-2 text-sm">
                <p>{item.summary}</p>
                <p className="text-[var(--muted)]">{item.channel} · {item.user.name} · {formatSaoPaulo(item.occurredAt)}</p>
              </article>
            ))}
            {opportunity.interactions.length === 0 ? <p className="text-sm text-[var(--muted)]">Nenhum contato registrado.</p> : null}
          </div>
        </div>
      </div>
      {query.fechar && opportunity.outcome === "ABERTA" ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#2E211B]/40 p-4 backdrop-blur-sm">
          <form id="fechar-venda" action={closeOpportunity} className="grid max-h-[90vh] w-full max-w-lg gap-3 overflow-auto rounded-xl bg-[var(--surface)] p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Fechar venda</h2>
              <Link href={`/crm/${id}`}>Fechar</Link>
            </div>
            <input type="hidden" name="opportunityId" value={id} />
            <label>Valor fechado<input name="closedValue" required defaultValue={draftValue(draft?.content, "closedValue")} /></label>
            <label>Data do trabalho<input type="datetime-local" name="workDate" defaultValue={draftValue(draft?.content, "workDate")} /></label>
            <label>Prazo do cliente<input type="datetime-local" name="clientDueAt" required defaultValue={draftValue(draft?.content, "clientDueAt")} /></label>
            <label>Descrição<textarea name="description" required className="min-h-20" defaultValue={draftValue(draft?.content, "description")} /></label>
            <label>Entregáveis, um por linha<textarea name="deliverables" required className="min-h-24" defaultValue={draftValue(draft?.content, "deliverables")} /></label>
            <label>Referências e links<textarea name="references" defaultValue={draftValue(draft?.content, "references")} /></label>
            <label>Observações<textarea name="notes" defaultValue={draftValue(draft?.content, "notes")} /></label>
            <div className="flex gap-2">
              <DraftWatcher formId="fechar-venda" entityType="close-sale" entityId={id} />
              <button className="rounded-md bg-[var(--terra)] px-3 py-2 text-white">Confirmar e gerar demanda</button>
            </div>
          </form>
        </div>
      ) : null}
      {query.perder && opportunity.outcome === "ABERTA" ? (
        <form action={loseOpportunity} className="fixed inset-0 z-50 grid place-items-center bg-[#2E211B]/40 p-4">
          <div className="grid w-full max-w-md gap-3 rounded-xl bg-[var(--surface)] p-5">
            <h2 className="font-semibold">Perder oportunidade</h2>
            <input type="hidden" name="opportunityId" value={id} />
            <label>Motivo<input name="lossReason" required /></label>
            <label>Observação<textarea name="lossNote" /></label>
            <div className="flex gap-2">
              <Link href={`/crm/${id}`} className="rounded-md border px-3 py-2">Cancelar</Link>
              <button className="rounded-md bg-[var(--red)] px-3 py-2 text-white">Registrar perda</button>
            </div>
          </div>
        </form>
      ) : null}
    </section>
  );
}
