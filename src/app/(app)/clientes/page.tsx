import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveCustomer } from "@/modules/crm/actions";

export default async function CustomersPage() {
  await requirePermission("crm");
  const customers = await prisma.customer.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { opportunities: true } } },
  });

  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div>
        <h1 className="mb-4 text-xl font-semibold">Clientes</h1>
        <div className="grid gap-2">
          {customers.map((customer) => (
            <article key={customer.id} className="rounded-lg bg-[var(--surface)] p-3 text-sm">
              <p className="font-medium">{customer.name}</p>
              <p className="text-[var(--muted)]">{customer.phone || "Sem telefone"} · {customer.email || "Sem e-mail"} · {customer.origin || "Sem origem"}</p>
              <p>{customer._count.opportunities} oportunidade(s)</p>
            </article>
          ))}
        </div>
      </div>
      <form action={saveCustomer} className="grid h-fit gap-3 rounded-lg bg-[var(--surface)] p-4">
        <h2 className="font-medium">Novo cliente</h2>
        <label>Nome<input name="name" required /></label>
        <label>Telefone<input name="phone" /></label>
        <label>E-mail<input name="email" type="email" /></label>
        <label>Empresa<input name="company" /></label>
        <label>Origem<input name="origin" /></label>
        <label>Notas<textarea name="notes" /></label>
        <button className="rounded-md bg-[var(--terra)] px-3 py-2 text-white">Cadastrar</button>
      </form>
    </section>
  );
}
