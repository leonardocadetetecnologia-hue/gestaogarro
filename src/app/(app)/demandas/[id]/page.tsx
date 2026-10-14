import Link from "next/link";
import { notFound } from "next/navigation";
import { LiveRemaining } from "@/components/live-remaining";
import { requireUser } from "@/lib/auth";
import { deliveryRisk } from "@/lib/deadlines";
import { DELIVERABLE_LABELS, RISK_LABELS } from "@/lib/labels";
import { formatBRL } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { addDemandLink, addDemandMessage, assignEditor, changeDeliverableStatus } from "@/modules/production/actions";

const EDITOR_ACTIONS = [
  ["EM_PRODUCAO", "Iniciar produção"],
  ["ENVIADO_REVISAO", "Enviar para revisão"],
] as const;

const MANAGER_ACTIONS = [
  ["EM_REVISAO", "Assumir revisão"],
  ["CORRECAO", "Pedir correção"],
  ["APROVADO", "Aprovar"],
  ["ENTREGUE", "Marcar entrega ao cliente"],
  ["CONCLUIDO", "Concluir"],
] as const;

export default async function DemandPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (user.role === "ATENDENTE") notFound();
  const { id } = await params;
  const demand = await prisma.demand.findUnique({
    where: { id },
    include: {
      customer: true,
      sale: { select: { description: true, referenceLinks: true, clientDueAt: true } },
      deliverables: { include: { editor: true }, orderBy: { createdAt: "asc" } },
      messages: { include: { sender: true }, orderBy: { createdAt: "asc" } },
      files: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!demand) notFound();
  if (user.role === "EDITOR" && !demand.deliverables.some((item) => item.editorId === user.id)) notFound();
  const editors = user.role === "GESTOR_GARRO" ? await prisma.user.findMany({ where: { role: "EDITOR", active: true }, orderBy: { name: "asc" } }) : [];
  const commercial = user.role !== "EDITOR";
  const saleValue = commercial
    ? await prisma.sale.findUnique({ where: { id: demand.saleId }, select: { value: true } })
    : null;

  return (
    <section className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
      <div className="grid gap-4">
        <div className="rounded-lg bg-[var(--surface)] p-4">
          <p className="text-sm text-[var(--muted)]">{demand.customer.name}</p>
          <h1 className="text-xl font-semibold">{demand.title}</h1>
          <p className="mt-2 whitespace-pre-wrap text-sm">{demand.description}</p>
          {saleValue ? <p className="mt-2 font-medium">{formatBRL(saleValue.value.toString())}</p> : null}
          <p className="text-sm">Cliente: <LiveRemaining due={demand.clientDueAt?.toISOString() ?? null} done={null} /></p>
        </div>
        {demand.deliverables.map((item) => {
          const risk = deliveryRisk({
            status: item.status,
            editorDueAt: item.editorDueAt,
            reviewDueAt: item.reviewDueAt,
            clientDueAt: item.clientDueAt,
            editorDeliveredAt: item.editorDeliveredAt,
            managerApprovedAt: item.managerApprovedAt,
          });
          const actions = user.role === "EDITOR" ? EDITOR_ACTIONS : MANAGER_ACTIONS;
          return (
            <article key={item.id} className="rounded-lg bg-[var(--surface)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-medium">{item.title}</h2>
                <span className="text-sm">{DELIVERABLE_LABELS[item.status]} · {RISK_LABELS[risk]}</span>
              </div>
              <p className="text-sm text-[var(--muted)]">{item.editor?.name ?? "Sem editor"}</p>
              <div className="mt-2 grid gap-1 text-sm">
                <p>Editor — <LiveRemaining due={item.editorDueAt?.toISOString() ?? null} done={item.editorDeliveredAt?.toISOString() ?? null} /></p>
                <p>Revisão — <LiveRemaining due={item.reviewDueAt?.toISOString() ?? null} done={item.managerApprovedAt?.toISOString() ?? null} /></p>
                <p>Cliente — <LiveRemaining due={item.clientDueAt?.toISOString() ?? null} done={item.clientDeliveredAt?.toISOString() ?? null} /></p>
              </div>
              {user.role === "GESTOR_GARRO" ? (
                <form action={assignEditor} className="mt-3 grid gap-2 md:grid-cols-4">
                  <input type="hidden" name="deliverableId" value={item.id} />
                  <select name="editorId" defaultValue={item.editorId ?? ""}>
                    <option value="">Editor</option>
                    {editors.map((editor) => <option key={editor.id} value={editor.id}>{editor.name}</option>)}
                  </select>
                  <input type="datetime-local" name="editorDueAt" aria-label="Prazo do editor" />
                  <input type="datetime-local" name="reviewDueAt" aria-label="Prazo de revisão" />
                  <button className="rounded-md bg-[var(--brown)] px-3 py-2 text-white">Delegar</button>
                </form>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                {actions.map(([status, label]) => (
                  <form key={status} action={changeDeliverableStatus}>
                    <input type="hidden" name="deliverableId" value={item.id} />
                    <input type="hidden" name="status" value={status} />
                    <button className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm">{label}</button>
                  </form>
                ))}
              </div>
            </article>
          );
        })}
      </div>
      <aside className="grid h-fit gap-4">
        <div className="rounded-lg bg-[var(--surface)] p-4">
          <h2 className="mb-2 font-medium">Conversa da demanda</h2>
          <div className="mb-3 grid max-h-80 gap-2 overflow-auto">
            {demand.messages.map((message) => (
              <article key={message.id} className="text-sm">
                <p className="text-[var(--muted)]">{message.sender.name}{message.system ? " · sistema" : ""}</p>
                <p>{message.content}</p>
              </article>
            ))}
          </div>
          <form action={addDemandMessage} className="grid gap-2">
            <input type="hidden" name="demandId" value={demand.id} />
            <textarea name="content" required placeholder="Mensagem para esta demanda" />
            <button className="rounded-md bg-[var(--terra)] px-3 py-2 text-white">Enviar</button>
          </form>
        </div>
        <div className="rounded-lg bg-[var(--surface)] p-4">
          <h2 className="mb-2 font-medium">Links</h2>
          {demand.files.map((file) => (
            <p key={file.id} className="text-sm"><a href={file.storagePath} className="underline">{file.fileName}</a></p>
          ))}
          {commercial && demand.sale.referenceLinks ? <p className="mt-2 whitespace-pre-wrap text-sm">{demand.sale.referenceLinks}</p> : null}
          <form action={addDemandLink} className="mt-3 grid gap-2">
            <input type="hidden" name="demandId" value={demand.id} />
            <input name="fileName" placeholder="Nome" required />
            <input name="storagePath" placeholder="https://" required />
            <button className="rounded-md border px-3 py-2">Adicionar link</button>
          </form>
        </div>
        <Link href="/demandas" className="text-sm">Voltar</Link>
      </aside>
    </section>
  );
}
