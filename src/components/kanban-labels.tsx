"use client";

import { useState, type FormEvent } from "react";
import { stages, stageLabel, type Stage } from "@/lib/data";
import { useGarro } from "@/lib/store";

export function KanbanLabelEditor() {
  const { state, saveKanbanLabels, busy, error } = useGarro();
  const [labels, setLabels] = useState<Record<Stage, string>>(() => Object.fromEntries(stages.map(stage => [stage, stageLabel(stage, state.kanbanLabels)])) as Record<Stage, string>);
  function update(stage: Stage, value: string) { setLabels(current => ({ ...current, [stage]: value })); }
  async function submit(event: FormEvent) {
    event.preventDefault();
    await saveKanbanLabels(stages.map(stage => ({ stage, label: labels[stage].trim() })));
  }
  return <form className="kanban-label-editor" onSubmit={submit}>
    <div className="settings-row"><div><strong>Edição de kanban</strong><span>Os nomes das colunas do CRM. A ordem e as regras de cada etapa permanecem.</span></div></div>
    {stages.map(stage => <label className="kanban-label-row" key={stage}><span>{stage}</span><input aria-label={`Nome da coluna ${stage}`} maxLength={40} required minLength={2} disabled={busy} value={labels[stage]} onChange={event => update(stage, event.target.value)}/></label>)}
    {error && <p role="alert" className="form-error">{error}</p>}
    <div className="modal-footer"><button type="button" className="button secondary" disabled={busy} onClick={() => setLabels(Object.fromEntries(stages.map(stage => [stage, stage])) as Record<Stage, string>)}>Restaurar nomes padrão</button><button className="button primary" disabled={busy}>{busy ? "Salvando…" : "Salvar nomes do kanban"}</button></div>
  </form>;
}
