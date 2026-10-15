"use client";
import { useEffect, useId, useState, type FormEvent } from "react";
import { FileText } from "lucide-react";
import type { Deliverable } from "@/lib/data";
import { useGarro } from "@/lib/store";
import { ScriptAttachments } from "./script-attachments";

export function TaskScript({ task }: { task: Deliverable }) {
  const { role, busy, saveTaskScript } = useGarro();
  const canEdit = role === "GESTOR_GARRO";
  const saved = task.script || "";
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(saved);
  const [previous, setPrevious] = useState(saved);
  const [feedback, setFeedback] = useState("");
  const [failed, setFailed] = useState(false);
  const boxId = useId();
  const dirty = text !== previous;
  useEffect(() => {
    if (!dirty) { setText(saved); setPrevious(saved); }
  }, [saved, dirty]);
  async function submit(event: FormEvent) {
    event.preventDefault(); setFeedback(""); setFailed(false);
    if (await saveTaskScript(task.id, text, previous)) {
      setPrevious(text); setFeedback("Script salvo.");
    } else { setFailed(true); setFeedback("Não foi possível salvar. Seu texto foi preservado; confira o aviso e tente novamente."); }
  }
  return <div className="task-script">
    <div className="task-script-toggle">
      <button type="button" className="button secondary small" aria-expanded={open} aria-controls={boxId} onClick={() => setOpen(value => !value)}><FileText size={16}/>Script</button>
      {saved && <span>Script preenchido</span>}
      {canEdit && dirty && <span>Alterações não salvas</span>}
    </div>
    {open && <form id={boxId} className="task-script-form" onSubmit={submit} aria-busy={busy}>
      <label htmlFor={`${boxId}-text`}>Script — {task.title}</label>
      <textarea id={`${boxId}-text`} maxLength={10000} rows={8} value={text} readOnly={!canEdit} disabled={busy && canEdit}
        placeholder={canEdit ? "Escreva orientações, roteiro ou informações adicionais deste entregável." : "Nenhum script informado."}
        onChange={event => { setText(event.target.value); setFeedback(""); }}/>
      <div className="task-script-footer"><span>{text.length.toLocaleString("pt-BR")} / 10.000 caracteres</span>
        {canEdit ? <button type="submit" className="button primary small" disabled={busy || !dirty}>{busy ? "Salvando…" : "Salvar script"}</button> : <span>Consulta do script definido pela Gestora</span>}
      </div>
      {canEdit && dirty && saved !== previous && <div className="task-script-conflict">
        <p className="form-error">Existe uma versão mais recente. Seu texto foi preservado.</p>
        <details><summary>Ver versão salva</summary><pre>{saved || "Script vazio"}</pre></details>
        <button type="button" className="button secondary small" disabled={busy} onClick={() => { setPrevious(saved); setFeedback(""); }}>Manter meu texto para substituir a versão salva</button>
      </div>}
      {feedback && <p className={failed ? "form-error" : "task-script-feedback"} role={failed ? "alert" : "status"}>{feedback}</p>}
      <ScriptAttachments task={task}/>
    </form>}
  </div>;
}
