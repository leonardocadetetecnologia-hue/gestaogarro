import { requireUser } from "@/lib/auth";
import { formatSaoPaulo } from "@/lib/deadlines";
import { prisma } from "@/lib/prisma";

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ visao?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const now = new Date();
  const span = params.visao === "dia" ? 1 : params.visao === "mes" ? 31 : 7;
  const until = new Date(now.getTime() + span * 24 * 60 * 60 * 1000);
  const events = await prisma.scheduleEvent.findMany({
    where: {
      dueAt: { lte: until },
      status: { not: "CANCELADO" },
      ...(user.role === "GESTOR_GARRO" ? {} : { userId: user.id }),
    },
    include: { user: true },
    orderBy: { dueAt: "asc" },
    take: 200,
  });

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">{user.role === "GESTOR_GARRO" ? "Agenda global" : "Minha agenda"}</h1>
        <div className="flex gap-2 text-sm">
          <a href="/agenda?visao=dia">Dia</a>
          <a href="/agenda?visao=semana">Semana</a>
          <a href="/agenda?visao=mes">Mês</a>
          <a href="/agenda?visao=lista">Lista</a>
        </div>
      </div>
      <div className="grid gap-2">
        {events.map((event) => (
          <article key={event.id} className="rounded-lg bg-[var(--surface)] p-3 text-sm">
            <p className="font-medium">{event.title}</p>
            <p className="text-[var(--muted)]">{formatSaoPaulo(event.dueAt)} · {event.type} · {event.user.name} · {event.status}</p>
          </article>
        ))}
        {events.length === 0 ? <p>Nenhum compromisso neste período.</p> : null}
      </div>
    </section>
  );
}
