import Link from "next/link";
import { redirect } from "next/navigation";
import { LiveRemaining } from "@/components/live-remaining";
import { requireUser } from "@/lib/auth";
import { deliveryRisk } from "@/lib/deadlines";
import { DEMAND_LABELS, RISK_LABELS } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

export default async function DemandsPage() {
  const user = await requireUser();
  if (user.role === "ATENDENTE") redirect("/?erro=acesso");
  const demands = await prisma.demand.findMany({
    where: user.role === "EDITOR" ? { deliverables: { some: { editorId: user.id } } } : {},
    include: {
      customer: true,
      deliverables: { include: { editor: true } },
    },
    orderBy: { clientDueAt: "asc" },
  });

  return (
    <section>
      <h1 className="mb-4 text-xl font-semibold">{user.role === "EDITOR" ? "Minhas demandas" : "Demandas"}</h1>
      <div className="grid gap-3">
        {demands.map((demand) => {
          const visible = user.role === "EDITOR" ? demand.deliverables.filter((item) => item.editorId === user.id) : demand.deliverables;
          return (
            <Link key={demand.id} href={`/demandas/${demand.id}`} className="rounded-lg bg-[var(--surface)] p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-medium">{demand.title}</h2>
                <span className="text-sm text-[var(--muted)]">{DEMAND_LABELS[demand.status]}</span>
              </div>
              <p className="text-sm">{demand.customer.name}</p>
              <div className="mt-2 grid gap-1 text-sm">
                {visible.map((item) => {
                  const risk = deliveryRisk({
                    status: item.status,
                    editorDueAt: item.editorDueAt,
                    reviewDueAt: item.reviewDueAt,
                    clientDueAt: item.clientDueAt,
                    editorDeliveredAt: item.editorDeliveredAt,
                    managerApprovedAt: item.managerApprovedAt,
                  });
                  return (
                    <p key={item.id}>
                      {item.title} · {item.editor?.name ?? "Sem editor"} · {RISK_LABELS[risk]} · <LiveRemaining due={item.editorDueAt?.toISOString() ?? null} done={item.editorDeliveredAt?.toISOString() ?? null} />
                    </p>
                  );
                })}
              </div>
            </Link>
          );
        })}
        {demands.length === 0 ? <p>Nenhuma demanda.</p> : null}
      </div>
    </section>
  );
}
