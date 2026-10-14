import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { deliveryRisk, formatSaoPaulo } from "@/lib/deadlines";
import { DEMAND_LABELS, RISK_LABELS } from "@/lib/labels";
import { formatBRL } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { timerSettings } from "@/lib/settings";
import { LiveRemaining } from "@/components/live-remaining";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const now = new Date();
  const settings = await timerSettings();

  if (user.role === "EDITOR") {
    const items = await prisma.deliverable.findMany({
      where: { editorId: user.id, status: { notIn: ["CONCLUIDO", "ENTREGUE"] } },
      include: { demand: { include: { customer: true } } },
      orderBy: { editorDueAt: "asc" },
    });
    return (
      <section>
        <h1 className="mb-4 text-xl font-semibold">Minhas demandas</h1>
        <div className="grid gap-3">
          {items.map((item) => (
            <Link key={item.id} href={`/demandas/${item.demandId}`} className="rounded-lg bg-[var(--surface)] p-4">
              <p className="font-medium">{item.title}</p>
              <p className="text-sm text-[var(--muted)]">{item.demand.customer.name}</p>
              <p className="text-sm">
                <LiveRemaining due={item.editorDueAt?.toISOString() ?? null} done={item.editorDeliveredAt?.toISOString() ?? null} />
              </p>
            </Link>
          ))}
          {items.length === 0 ? <p>Nenhum trabalho atribuído.</p> : null}
        </div>
      </section>
    );
  }

  const open = await prisma.opportunity.findMany({
    where: { outcome: "ABERTA" },
    include: { customer: true },
  });
  const won = await prisma.sale.findMany();
  const lost = await prisma.opportunity.count({ where: { outcome: "PERDIDA" } });
  const pipeline = open.reduce((sum, item) => sum + Number(item.estimatedValue ?? 0), 0);
  const defined = open.filter((item) => item.estimatedValue != null).length;
  const followUps = open.filter((item) => item.nextActionAt && item.nextActionAt < now).length;
  const ticket = won.length ? won.reduce((sum, sale) => sum + Number(sale.value), 0) / won.length : null;
  const conversion = won.length + lost > 0 ? won.length / (won.length + lost) : null;

  const demands = user.role === "GESTOR_GARRO"
    ? await prisma.deliverable.findMany({
        where: { status: { notIn: ["CONCLUIDO"] } },
        include: { editor: true, demand: { include: { customer: true } } },
      })
    : [];

  return (
    <section className="grid gap-4">
      {params.erro === "acesso" ? <p className="text-sm text-[var(--red)]">Você não tem acesso a essa área.</p> : null}
      <h1 className="text-xl font-semibold">{user.role === "GESTOR_GARRO" ? "Painel geral" : "Painel comercial"}</h1>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Leads ativos" value={String(open.length)} />
        <Metric label="Pipeline aberto" value={defined ? formatBRL(pipeline) : "Valor não definido"} />
        <Metric label="Vendas fechadas" value={String(won.length)} />
        <Metric label="Follow-ups vencidos" value={String(followUps)} />
        <Metric label="Ticket médio" value={ticket == null ? "Valor não definido" : formatBRL(ticket)} />
        <Metric label="Conversão" value={conversion == null ? "—" : `${Math.round(conversion * 100)}%`} />
      </div>
      <p className="text-xs text-[var(--muted)]">
        Timers: atenção {settings.yellowHours}h, urgente {settings.orangeHours}h, atraso {settings.redHours}h.
      </p>
      {user.role === "GESTOR_GARRO" ? (
        <div className="grid gap-2">
          <h2 className="font-medium">Produção</h2>
          {demands.slice(0, 8).map((item) => {
            const risk = deliveryRisk({
              status: item.status,
              editorDueAt: item.editorDueAt,
              reviewDueAt: item.reviewDueAt,
              clientDueAt: item.clientDueAt,
              editorDeliveredAt: item.editorDeliveredAt,
              managerApprovedAt: item.managerApprovedAt,
            });
            return (
              <Link key={item.id} href={`/demandas/${item.demandId}`} className="rounded-lg bg-[var(--surface)] p-3 text-sm">
                <span className="font-medium">{item.demand.customer.name}</span> · {item.title} · {item.editor?.name ?? "Sem editor"} · {DEMAND_LABELS[item.status]} · {RISK_LABELS[risk]}
                {item.clientDueAt ? ` · cliente ${formatSaoPaulo(item.clientDueAt)}` : ""}
              </Link>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-lg bg-[var(--surface)] p-4">
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </article>
  );
}
