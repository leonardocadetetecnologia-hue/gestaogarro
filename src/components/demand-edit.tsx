"use client";

import { useEffect, useState, type FormEvent } from "react";
import { dateInputSaoPaulo } from "@/lib/date-input";
import { parseSaoPaulo } from "@/lib/deadlines";
import type { Demand, Deliverable } from "@/lib/data";
import { useGarro } from "@/lib/store";
import { Field, Modal } from "./Ui";

export function EditDemandModal({ demand, onClose }: { demand: Demand; onClose: () => void }) {
  const { updateDemand, busy, error } = useGarro();
  const [title, setTitle] = useState(demand.title);
  const [description, setDescription] = useState(demand.briefing || demand.description || "");
  const [due, setDue] = useState(demand.clientDue ? dateInputSaoPaulo(demand.clientDue) : "");
  const [links, setLinks] = useState(demand.links || "");
  async function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = due ? parseSaoPaulo(due) : null;
    if (due && !parsed) return;
    if (await updateDemand({ id: demand.id, title, description, due: parsed ? parsed.toISOString() : "", links })) onClose();
  }
  return <Modal title="Editar demanda" description="A correção vale em qualquer etapa. A ordem dos entregáveis não muda." onClose={() => { if (!busy) onClose(); }}>
    <form className="form-stack" onSubmit={submit} aria-busy={busy}>
      <Field label="Nome da demanda *"><input required minLength={2} maxLength={200} disabled={busy} value={title} onChange={e => setTitle(e.target.value)}/></Field>
      <Field label="Briefing"><textarea rows={4} maxLength={10000} disabled={busy} value={description} onChange={e => setDescription(e.target.value)}/></Field>
      <Field label="Prazo do cliente (horário de Brasília)"><input type="datetime-local" disabled={busy} value={due} onChange={e => setDue(e.target.value)}/></Field>
      <Field label="Link de referência"><input type="url" disabled={busy} value={links} onChange={e => setLinks(e.target.value)} placeholder="https://"/></Field>
      {error && <p role="alert" className="form-error">{error}</p>}
      <div className="modal-footer"><button type="button" className="button secondary" disabled={busy} onClick={onClose}>Cancelar</button><button className="button primary" disabled={busy}>{busy ? "Salvando…" : "Salvar alterações"}</button></div>
    </form>
  </Modal>;
}

export function DemandMedia({ demand }: { demand: Demand }) {
  const { role, saveDemandMedia, busy } = useGarro();
  const [hd, setHd] = useState(demand.hd || "");
  const [drive, setDrive] = useState(demand.drive || "");
  useEffect(() => { setHd(demand.hd || ""); setDrive(demand.drive || ""); }, [demand.hd, demand.drive]);
  const canEdit = role === "GESTOR_GARRO";
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!canEdit) return;
    const saved = await saveDemandMedia({ id: demand.id, hd, drive });
    if (saved && drive && !/^https?:\/\//i.test(drive)) setDrive(`https://${drive.trim()}`);
  }
  const driveHref = /^https?:\/\/\S+$/i.test(drive.trim()) ? drive.trim() : /^[\w.-]+\.[a-z]{2,}/i.test(drive.trim()) ? `https://${drive.trim()}` : "";
  return <form className="demand-media" onSubmit={submit}>
    <label>HD<input aria-label="HD" maxLength={200} readOnly={!canEdit} disabled={canEdit && busy} value={hd} onChange={event => setHd(event.target.value)} placeholder="Nome ou número do HD"/></label>
    <label>Drive<input aria-label="Drive" type="text" inputMode="url" autoCapitalize="none" spellCheck={false} maxLength={2000} readOnly={!canEdit} disabled={canEdit && busy} value={drive} onChange={event => setDrive(event.target.value)} placeholder="https://"/></label>
    {canEdit && <button className="button secondary small" disabled={busy}>{busy ? "Salvando…" : "Salvar HD e Drive"}</button>}
    {driveHref && <a href={driveHref} target="_blank" rel="noreferrer" className="text-link">Abrir Drive</a>}
  </form>;
}

export function NewDeliverableModal({ demandId, onClose }: { demandId: string; onClose: () => void }) {
  const { addDeliverable, busy, error } = useGarro();
  const [title, setTitle] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (await addDeliverable(demandId, title)) onClose();
  }
  return <Modal title="Novo entregável" description="Entra no final da lista deste projeto, sem reordenar os demais." onClose={() => { if (!busy) onClose(); }}>
    <form className="form-stack" onSubmit={submit} aria-busy={busy}>
      <Field label="Nome do entregável *"><input required minLength={1} maxLength={200} disabled={busy} value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex.: 9- Novo corte"/></Field>
      {error && <p role="alert" className="form-error">{error}</p>}
      <div className="modal-footer"><button type="button" className="button secondary" disabled={busy} onClick={onClose}>Cancelar</button><button className="button primary" disabled={busy}>{busy ? "Incluindo…" : "Incluir"}</button></div>
    </form>
  </Modal>;
}

export function RenameDeliverableModal({ task, onClose }: { task: Deliverable; onClose: () => void }) {
  const { renameDeliverable, busy, error } = useGarro();
  const [title, setTitle] = useState(task.title);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (await renameDeliverable(task.id, title)) onClose();
  }
  return <Modal title="Editar entregável" description="O nome pode ser corrigido em qualquer etapa. A posição na lista permanece." onClose={() => { if (!busy) onClose(); }}>
    <form className="form-stack" onSubmit={submit} aria-busy={busy}>
      <Field label="Nome do entregável *"><input required minLength={1} maxLength={200} disabled={busy} value={title} onChange={e => setTitle(e.target.value)}/></Field>
      {error && <p role="alert" className="form-error">{error}</p>}
      <div className="modal-footer"><button type="button" className="button secondary" disabled={busy} onClick={onClose}>Cancelar</button><button className="button primary" disabled={busy}>{busy ? "Salvando…" : "Salvar nome"}</button></div>
    </form>
  </Modal>;
}
