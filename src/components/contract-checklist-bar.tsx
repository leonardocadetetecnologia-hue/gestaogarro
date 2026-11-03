"use client";

import type { ChecklistItem } from "@/modules/crm/contract-checklist";
import { checklistSummary } from "@/modules/crm/contract-checklist";

export function ChecklistBar({ pending, waived, manager, busy, onIgnore, onRestore }: {
  pending: ChecklistItem[];
  waived: boolean;
  manager: boolean;
  busy: boolean;
  onIgnore: () => void;
  onRestore: () => void;
}) {
  if (!pending.length && !waived) return null;
  return <div className="checklist-bar">
    {pending.length > 0 && <p>{checklistSummary(pending).split(": ")[0]}: {pending.map((item, index) => <span key={item.id}>{index > 0 && " · "}<button type="button" onClick={() => document.getElementById(item.anchor)?.scrollIntoView({ behavior: "smooth", block: "center" })}>{item.label}</button></span>)}</p>}
    {manager && pending.some(item => !item.blocksSend) && <button type="button" className="button secondary small" disabled={busy} onClick={onIgnore}>Ignorar pendências</button>}
    {manager && waived && <button type="button" className="button secondary small" disabled={busy} onClick={onRestore}>Reativar pendências</button>}
  </div>;
}
