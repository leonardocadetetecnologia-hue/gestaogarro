import { requireUser } from "@/lib/auth";
import { formatSaoPaulo } from "@/lib/deadlines";
import { prisma } from "@/lib/prisma";
import { markNotificationRead } from "@/modules/users/actions";

export default async function NotificationsPage() {
  const user = await requireUser();
  const items = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 80,
  });

  return (
    <section>
      <h1 className="mb-4 text-xl font-semibold">Notificações</h1>
      <div className="grid gap-2">
        {items.map((item) => (
          <form key={item.id} action={markNotificationRead} className="rounded-lg bg-[var(--surface)] p-3 text-sm">
            <input type="hidden" name="id" value={item.id} />
            <button className="text-left">
              <p className="font-medium">{item.title}</p>
              <p>{item.message}</p>
              <p className="text-[var(--muted)]">{formatSaoPaulo(item.createdAt)} · {item.readAt ? "lida" : "nova"}</p>
            </button>
          </form>
        ))}
        {items.length === 0 ? <p>Nenhuma notificação.</p> : null}
      </div>
    </section>
  );
}
