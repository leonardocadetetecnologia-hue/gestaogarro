"use client";

import { pieParts, piePath, type PiePart } from "@/lib/pie";
import { productionStages, stageLabel, stages } from "@/lib/data";
import { useGarro } from "@/lib/store";

function PieCard({ title, parts }: { title: string; parts: PiePart[] }) {
  const caption = parts.length ? parts.map((part) => `${part.label} ${part.value}`).join(", ") : "Sem dados";
  return (
    <section className="surface pie-card" aria-label={`${title}: ${caption}`}>
      <h2>{title}</h2>
      {parts.length === 0 ? <p className="empty-state">Sem dados nesta visão.</p> : <>
        <svg viewBox="-1.15 -1.15 2.3 2.3" role="img" aria-hidden="true">
          {parts.length === 1 ? <circle cx="0" cy="0" r="1" fill={parts[0].color} /> : parts.map((part) => (
            <path key={part.label} d={piePath(part.start, part.end)} fill={part.color} />
          ))}
        </svg>
        <ul className="pie-legend">
          {parts.map((part) => (
            <li key={part.label}>
              <i style={{ background: part.color }} />
              <span>{part.label}</span>
              <strong>{part.value}</strong>
            </li>
          ))}
        </ul>
      </>}
    </section>
  );
}

export function ManagerPies() {
  const { state } = useGarro();
  const demands = pieParts(productionStages.map((status) => ({
    label: status,
    value: state.demands.filter((demand) => demand.status === status).length,
  })));
  const commercial = pieParts(stages.map((stage) => ({
    label: stageLabel(stage, state.kanbanLabels),
    value: state.opportunities.filter((item) => item.stage === stage).length,
  })));
  return (
    <div className="pie-grid">
      <PieCard title="Demandas por etapa" parts={demands} />
      <PieCard title="Comercial por etapa" parts={commercial} />
    </div>
  );
}
