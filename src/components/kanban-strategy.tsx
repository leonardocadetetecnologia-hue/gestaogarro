import { currency } from "@/lib/data";
import type { StrategyLine } from "@/lib/kanban-strategy";

export function ColumnStrategy({ lines }: { lines: StrategyLine[] }) {
  return <ul className="column-strategy">
    {lines.map(line => <li key={line.label}>
      <span>{line.label}</span>
      <strong>{line.count ? currency(line.total) : "—"}</strong>
      <small>{line.count}</small>
    </li>)}
  </ul>;
}
