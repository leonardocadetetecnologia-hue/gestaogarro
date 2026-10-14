"use client";

import type { OpportunityStage } from "@prisma/client";
import Link from "next/link";
import { STAGE_LABELS } from "@/lib/labels";
import { moveOpportunity } from "@/modules/crm/actions";
import type { Attention } from "@/lib/deadlines";

export type KanbanCard = {
  id: string;
  stage: OpportunityStage;
  customer: string;
  service: string;
  origin: string | null;
  valueLabel: string;
  attention: Attention;
  nextAction: string | null;
  priority: string;
  staleLabel: string;
};

const COLOR: Record<Attention, string> = {
  ok: "var(--green)",
  atencao: "var(--yellow)",
  urgente: "var(--gold)",
  atrasado: "var(--red)",
};

export function Kanban({
  stages,
  cards,
  summaries,
}: {
  stages: OpportunityStage[];
  cards: KanbanCard[];
  summaries: Record<string, { count: number; total: string; late: number; next: number }>;
}) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {stages.map((stage) => {
        const column = cards.filter((card) => card.stage === stage);
        const summary = summaries[stage];
        const locked = stage === "FECHADO" || stage === "PERDIDO";
        return (
          <section
            key={stage}
            className="w-[260px] shrink-0 rounded-lg bg-[var(--bg-2)] p-2"
            onDragOver={(event) => {
              if (!locked) event.preventDefault();
            }}
            onDrop={(event) => {
              if (locked) return;
              const id = event.dataTransfer.getData("text/plain");
              if (id) void moveOpportunity(id, stage);
            }}
          >
            <header className="mb-2 px-1">
              <h2 className="text-sm font-semibold">{STAGE_LABELS[stage]}</h2>
              <p className="text-xs text-[var(--muted)]">
                {summary?.count ?? 0} · {summary?.total} · {summary?.late ?? 0} atrasados
              </p>
            </header>
            <div className="grid gap-2">
              {column.map((card) => (
                <article
                  key={card.id}
                  draggable={!locked}
                  onDragStart={(event) => event.dataTransfer.setData("text/plain", card.id)}
                  className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-3 text-sm shadow-sm"
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <Link href={`/crm/${card.id}`} className="font-medium">
                      {card.customer}
                    </Link>
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLOR[card.attention] }} />
                  </div>
                  <p>{card.service}</p>
                  <p className="text-[var(--muted)]">{card.origin || "Origem não informada"}</p>
                  <p className="mt-1 font-medium">{card.valueLabel}</p>
                  <p className="text-xs text-[var(--muted)]">{card.staleLabel}</p>
                  <p className="text-xs">{card.nextAction || "Sem próxima ação"}</p>
                  <p className="text-xs uppercase tracking-wide text-[var(--muted)]">{card.priority}</p>
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
