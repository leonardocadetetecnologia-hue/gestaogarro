"use client";

import { useState, type FormEvent } from "react";
import type { Deliverable } from "@/lib/data";
import { composeDeadline } from "@/lib/date-input";
import { useGarro } from "@/lib/store";
import { Field, Modal } from "./Ui";

export function BulkAssignModal({ demandId, tasks, onClose }: { demandId: string; tasks: Deliverable[]; onClose: () => void }) {
  const { state, activeEditorId, assignMany, busy, error } = useGarro();
  const [selected, setSelected] = useState(() => tasks.map(task => task.id));
  const [editorId, setEditorId] = useState("");
  const [editorDate, setEditorDate] = useState("");
  const [editorTime, setEditorTime] = useState("");
  const [reviewDate, setReviewDate] = useState("");
  const [reviewTime, setReviewTime] = useState("");
  const [formError, setFormError] = useState("");
  function toggle(id: string) {
    setSelected(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (reviewTime && !reviewDate) { setFormError("Informe o dia da revisão ou apague o horário."); return; }
    const due = composeDeadline(editorDate, editorTime);
    if (!due || !selected.length) return;
    const review = reviewDate ? composeDeadline(reviewDate, reviewTime) : null;
    if (reviewDate && !review) return;
    setFormError("");
    if (await assignMany({ demandId, deliverableIds: selected, editorId, editorDue: due.toISOString(), reviewDue: review?.toISOString() || "" })) onClose();
  }
  const allSelected = tasks.length > 0 && selected.length === tasks.length;
  return <Modal title="Atribuir vários" description="Os itens marcados deste projeto recebem o mesmo editor e o mesmo prazo. Cada um continua podendo ser alterado depois." onClose={() => { if (!busy) onClose(); }} width="640px">
    <form className="form-stack" onSubmit={submit} aria-busy={busy}>
      <fieldset className="bulk-tasks">
        <legend>Entregáveis deste projeto</legend>
        <label><input type="checkbox" checked={allSelected} disabled={busy} onChange={() => setSelected(allSelected ? [] : tasks.map(task => task.id))}/> Marcar todos</label>
        {tasks.map(task => <label key={task.id}><input type="checkbox" checked={selected.includes(task.id)} disabled={busy} onChange={() => toggle(task.id)}/> <span>{task.title}</span> <small>{task.status}</small></label>)}
      </fieldset>
      <Field label="Responsável pela edição *">
        <select required disabled={busy} value={editorId} onChange={e => setEditorId(e.target.value)}>
          <option value="">Escolher responsável</option>
          {state.editors.filter(editor => editor.active).map(editor => <option value={editor.id} key={editor.id}>{editor.name}{editor.role === "GESTOR_GARRO" ? editor.id === activeEditorId ? " (eu · Gestora)" : " (Gestora)" : " (Editor)"}</option>)}
        </select>
      </Field>
      <div className="form-grid">
        <Field label="Dia da edição *"><input type="date" required disabled={busy} value={editorDate} onChange={e => setEditorDate(e.target.value)}/></Field>
        <Field label="Horário da edição"><input type="time" aria-label="Horário da edição, opcional" disabled={busy} value={editorTime} onChange={e => setEditorTime(e.target.value)}/></Field>
        <Field label="Dia da revisão"><input type="date" disabled={busy} value={reviewDate} onChange={e => setReviewDate(e.target.value)}/></Field>
        <Field label="Horário da revisão"><input type="time" aria-label="Horário da revisão, opcional" disabled={busy} value={reviewTime} onChange={e => setReviewTime(e.target.value)}/></Field>
      </div>
      <p className="muted">O horário é opcional. Sem ele, o prazo vale até o fim do dia.</p>
      {(formError || error) && <p role="alert" className="form-error">{formError || error}</p>}
      <div className="modal-footer"><button type="button" className="button secondary" disabled={busy} onClick={onClose}>Cancelar</button><button className="button primary" disabled={busy || !selected.length}>{busy ? "Atribuindo…" : `Atribuir ${selected.length}`}</button></div>
    </form>
  </Modal>;
}
