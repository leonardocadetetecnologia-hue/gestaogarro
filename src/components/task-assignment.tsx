"use client";
import { useState, type FormEvent } from "react";
import type { Deliverable } from "@/lib/data";
import { composeDeadline, deadlineParts } from "@/lib/date-input";
import { useGarro } from "@/lib/store";

export function TaskAssignment({ task }: { task: Deliverable }) {
  const { state, activeEditorId, assignEditor, busy } = useGarro();
  const editorParts = deadlineParts(task.editorDue);
  const reviewParts = deadlineParts(task.reviewDue);
  const [editorId, setEditorId] = useState(task.editorId);
  const [editorDate, setEditorDate] = useState(editorParts.date);
  const [editorTime, setEditorTime] = useState(editorParts.time);
  const [reviewDate, setReviewDate] = useState(reviewParts.date);
  const [reviewTime, setReviewTime] = useState(reviewParts.time);
  async function submit(event: FormEvent) {
    event.preventDefault();
    const due = composeDeadline(editorDate, editorTime);
    if (!due) return;
    const review = reviewDate ? composeDeadline(reviewDate, reviewTime) : null;
    if (reviewDate && !review) return;
    await assignEditor(task.id, editorId, due.toISOString(), review?.toISOString() || "");
  }
  return <form className="task-assignment" onSubmit={submit} aria-busy={busy}>
    <label>Responsável pela edição *<select required disabled={busy} value={editorId} onChange={e => setEditorId(e.target.value)}>
      <option value="">Escolher responsável</option>
      {state.editors.filter(e => e.active).map(e => <option value={e.id} key={e.id}>{e.name}{e.role === "GESTOR_GARRO" ? e.id === activeEditorId ? " (eu · Gestora)" : " (Gestora)" : " (Editor)"}</option>)}
    </select></label>
    <label>Prazo da edição *
      <span className="deadline-parts">
        <input type="date" required aria-label="Dia da edição" disabled={busy} value={editorDate} onChange={e => setEditorDate(e.target.value)}/>
        <input type="time" aria-label="Horário da edição, opcional" disabled={busy} value={editorTime} onChange={e => setEditorTime(e.target.value)}/>
      </span>
      <small>O horário é opcional. Sem ele, o prazo vale até o fim do dia.</small>
    </label>
    <label>Prazo de revisão
      <span className="deadline-parts">
        <input type="date" aria-label="Dia da revisão" disabled={busy} value={reviewDate} onChange={e => setReviewDate(e.target.value)}/>
        <input type="time" aria-label="Horário da revisão, opcional" disabled={busy} value={reviewTime} onChange={e => setReviewTime(e.target.value)}/>
      </span>
    </label>
    <button type="submit" className="button primary small" disabled={busy}>{busy ? "Salvando…" : "Salvar atribuição e prazos"}</button>
  </form>;
}
