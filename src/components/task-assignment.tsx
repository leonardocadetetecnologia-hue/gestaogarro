"use client";
import { useState, type FormEvent } from "react";
import type { Deliverable } from "@/lib/data";
import { dateInputSaoPaulo } from "@/lib/date-input";
import { parseSaoPaulo } from "@/lib/deadlines";
import { useGarro } from "@/lib/store";

export function TaskAssignment({ task }: { task: Deliverable }) {
  const { state, activeEditorId, assignEditor, busy } = useGarro();
  const [editorId, setEditorId] = useState(task.editorId);
  const [editorDue, setEditorDue] = useState(dateInputSaoPaulo(task.editorDue));
  const [reviewDue, setReviewDue] = useState(dateInputSaoPaulo(task.reviewDue));
  async function submit(event: FormEvent) {
    event.preventDefault();
    const due = parseSaoPaulo(editorDue);
    if (!due) return;
    await assignEditor(task.id, editorId, due.toISOString(), parseSaoPaulo(reviewDue)?.toISOString() || "");
  }
  return <form className="task-assignment" onSubmit={submit} aria-busy={busy}>
    <label>Responsável pela edição *<select required disabled={busy} value={editorId} onChange={e => setEditorId(e.target.value)}>
      <option value="">Escolher responsável</option>
      {state.editors.filter(e => e.active).map(e => <option value={e.id} key={e.id}>{e.name}{e.role === "GESTOR_GARRO" ? e.id === activeEditorId ? " (eu · Gestora)" : " (Gestora)" : " (Editor)"}</option>)}
    </select></label>
    <label>Prazo da edição (Brasília) *<input type="datetime-local" required disabled={busy} value={editorDue} onChange={e => setEditorDue(e.target.value)}/></label>
    <label>Prazo de revisão (Brasília)<input type="datetime-local" disabled={busy} value={reviewDue} onChange={e => setReviewDue(e.target.value)}/></label>
    <button type="submit" className="button primary small" disabled={busy}>{busy ? "Salvando…" : "Salvar atribuição e prazos"}</button>
  </form>;
}
