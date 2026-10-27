import { requirePermission } from "@/lib/auth";
import { formatSaoPaulo } from "@/lib/deadlines";
import { formatBRL } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { saleScope } from "@/modules/crm/visibility";

export default async function SalesPage() {
  const user = await requirePermission("commercial.values");
  const sales = await prisma.sale.findMany({
    where: saleScope(user),
    include: { customer: true, demand: true },
    orderBy: { closedAt: "desc" },
  });

  return (
    <section>
      <h1 className="mb-4 text-xl font-semibold">Vendas</h1>
      <div className="grid gap-2">
        {sales.map((sale) => (
          <article key={sale.id} className="rounded-lg bg-[var(--surface)] p-3 text-sm">
            <p className="font-medium">{sale.customer.name}</p>
            <p>{formatBRL(sale.value.toString())} · {formatSaoPaulo(sale.closedAt)}</p>
            <p className="text-[var(--muted)]">{sale.demand ? "Demanda gerada" : "Sem demanda"}</p>
          </article>
        ))}
        {sales.length === 0 ? <p>Nenhuma venda fechada.</p> : null}
      </div>
    </section>
  );
}
