import Link from "next/link";
import { Kanban } from "@/components/kanban";
import { DraftWatcher } from "@/components/draft-form";
import { requirePermission } from "@/lib/auth";
import { crmAttention, formatSaoPaulo } from "@/lib/deadlines";
import { KANBAN_STAGES } from "@/lib/labels";
import { formatBRL } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { timerSettings } from "@/lib/settings";
import { createOpportunity } from "@/modules/crm/actions";

function draftValue(content: unknown, key: string) {
  if (!content || typeof content !== "object" || Array.isArray(content)) return "";
  const value = (content as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}

export default async function CrmPage({
  searchParams,
}: {
  searchParams: Promise<{ novo?: string; ok?: string }>;
}) {
  const user = await requirePermission("crm");
  const params = await searchParams;
  const settings = await timerSettings();
  const now = new Date();
  const [opportunities, customers, draft] = await Promise.all([
    prisma.opportunity.findMany({
      include: { customer: true },
      orderBy: { lastActivityAt: "desc" },
      take: 400,
    }),
    prisma.customer.findMany({ orderBy: { name: "asc" }, take: 200 }),
    prisma.draft.findUnique({
      where: { userId_entityType_entityId: { userId: user.id, entityType: "opportunity-new", entityId: "new" } },
    }),
  ]);

  const cards = opportunities.map((item) => {
    const attention = crmAttention({
      waitingSince: item.waitingSince,
      nextActionAt: item.nextActionAt,
      lastActivityAt: item.lastActivityAt,
      ...settings,
      now,
    });
    return {
      id: item.id,
      stage: item.stage,
      customer: item.customer.name,
      service: item.service,
      origin: item.customer.origin,
      valueLabel: formatBRL(item.estimatedValue?.toString() ?? null),
      attention,
      nextAction: item.nextAction,
      priority: item.priority,
      staleLabel: item.lastContactAt ? `Contato ${formatSaoPaulo(item.lastContactAt)}` : "Sem contato registrado",
      estimated: item.estimatedValue == null ? null : Number(item.estimatedValue),
    };
  });

  const summaries = Object.fromEntries(
    KANBAN_STAGES.map((stage) => {
      const column = cards.filter((card) => card.stage === stage);
      const valued = column.filter((card) => card.estimated != null);
      const total = valued.reduce((sum, card) => sum + (card.estimated ?? 0), 0);
      return [
        stage,
        {
          count: column.length,
          total: valued.length ? formatBRL(total) : "Valor não definido",
          late: column.filter((card) => card.attention === "atrasado").length,
          next: column.filter((card) => card.nextAction).length,
        },
      ];
    }),
  );

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">CRM</h1>
        <Link href="/crm?novo=1" className="rounded-md bg-[var(--terra)] px-3 py-2 text-sm text-white">
          Nova oportunidade
        </Link>
      </div>
      {params.ok === "fechado" ? <p className="mb-3 text-sm text-[var(--green)]">Venda fechada e demanda enviada à Gestora.</p> : null}
      <Kanban
        stages={KANBAN_STAGES}
        cards={cards.map((card) => ({
          id: card.id,
          stage: card.stage,
          customer: card.customer,
          service: card.service,
          origin: card.origin,
          valueLabel: card.valueLabel,
          attention: card.attention,
          nextAction: card.nextAction,
          priority: card.priority,
          staleLabel: card.staleLabel,
        }))}
        summaries={summaries}
      />
      {params.novo ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#2E211B]/40 p-4 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-xl bg-[var(--surface)] p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Nova oportunidade</h2>
              <Link href="/crm">Fechar</Link>
            </div>
            <form id="nova-oportunidade" action={createOpportunity} className="grid gap-3">
              <label>
                Cliente existente
                <select name="customerId" defaultValue={draftValue(draft?.content, "customerId")}>
                  <option value="">Novo cliente</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>{customer.name}</option>
                  ))}
                </select>
              </label>
              <label>Nome<input name="customerName" defaultValue={draftValue(draft?.content, "customerName")} /></label>
              <label>Telefone<input name="phone" defaultValue={draftValue(draft?.content, "phone")} /></label>
              <label>Origem<input name="origin" defaultValue={draftValue(draft?.content, "origin")} /></label>
              <label>Serviço<input name="service" required defaultValue={draftValue(draft?.content, "service")} /></label>
              <label>Valor estimado<input name="estimatedValue" placeholder="Em branco se ainda não houver" defaultValue={draftValue(draft?.content, "estimatedValue")} /></label>
              <label>
                Prioridade
                <select name="priority" defaultValue={draftValue(draft?.content, "priority") || "MEDIA"}>
                  <option value="BAIXA">Baixa</option>
                  <option value="MEDIA">Média</option>
                  <option value="ALTA">Alta</option>
                </select>
              </label>
              <label>Próxima ação<input name="nextAction" defaultValue={draftValue(draft?.content, "nextAction")} /></label>
              <label>Quando<input type="datetime-local" name="nextActionAt" defaultValue={draftValue(draft?.content, "nextActionAt")} /></label>
              <div className="flex gap-2">
                <DraftWatcher formId="nova-oportunidade" entityType="opportunity-new" entityId="new" />
                <button className="rounded-md bg-[var(--terra)] px-3 py-2 text-white">Criar</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
