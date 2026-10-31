import type { TaskStatus } from "@/lib/data";
import { managerStatusActions } from "@/modules/production/deliverable-flow";

export function DeliverableStageActions({ status, onStatus }: { status: TaskStatus; onStatus: (status: TaskStatus) => void }) {
  const actions = managerStatusActions(status);
  if (!actions.length) return null;
  return <>{actions.map((action) => (
    <button key={action.label} type="button" className={action.status === "Aprovado" ? "button success small" : "button secondary small"} onClick={() => onStatus(action.status)}>{action.label}</button>
  ))}</>;
}
