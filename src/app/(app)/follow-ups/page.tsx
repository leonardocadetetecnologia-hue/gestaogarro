import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { formatSaoPaulo } from "@/lib/deadlines";
import { prisma } from "@/lib/prisma";
import { opportunityScope } from "@/modules/crm/visibility";

export default async function FollowUpsPage() {
  const user = await requirePermission("crm");
  const items = await prisma.opportunity.findMany({
    where: { outcome: "ABERTA", nextActionAt: { not: null }, ...opportunityScope(user) },
    include: { customer: true },
    orderBy: { nextActionAt: "asc" },
  });
  const now = new Date();

  return (
    <section>
      <h1 className="mb-4 text-xl font-semibold">Follow-ups</h1>
      <div className="grid gap-2">
        {items.map((item) => (
          <Link key={item.id} href={`/crm/${item.id}`} className="rounded-lg bg-[var(--surface)] p-3 text-sm">
            <span className="font-medium">{item.customer.name}</span> · {item.nextAction || "Próxima ação"} · {item.nextActionAt ? formatSaoPaulo(item.nextActionAt) : ""}
            {item.nextActionAt && item.nextActionAt < now ? " · vencido" : ""}
          </Link>
        ))}
        {items.length === 0 ? <p>Nenhum follow-up agendado.</p> : null}
      </div>
    </section>
  );
}
