"use client";

import { useEffect, useState, type FormEvent } from "react";
import { dateInputSaoPaulo } from "@/lib/date-input";
import { parseSaoPaulo } from "@/lib/deadlines";
import type { Demand, Deliverable } from "@/lib/data";
import { useGarro } from "@/lib/store";
import { deliveryHref } from "@/modules/production/delivery-links";
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

function deliveryRows(demand: Demand, canEdit: boolean) {
  const saved = demand.deliveryLinks ?? [];
  if (saved.length) return saved;
  if (!canEdit) return [];
  return demand.mediaType === "FOTO_E_VIDEO" ? ["", ""] : [""];
}

function deliveryPlaceholder(index: number, mediaType: Demand["mediaType"]) {
  if (mediaType === "FOTO_E_VIDEO" && index === 0) return "Link das fotos";
  if (mediaType === "FOTO_E_VIDEO" && index === 1) return "Link dos vídeos";
  return "https://";
}

export function DeliveryLinks({ demand }: { demand: Demand }) {
  const { role, saveDeliveryLinks, busy } = useGarro();
  const canEdit = role === "GESTOR_GARRO";
  const savedKey = (demand.deliveryLinks ?? []).join("\n");
  const [links, setLinks] = useState<string[]>(() => deliveryRows(demand, canEdit));
  const [copied, setCopied] = useState("");
  useEffect(() => {
    const saved = savedKey ? savedKey.split("\n") : [];
    setLinks(saved.length ? saved : !canEdit ? [] : demand.mediaType === "FOTO_E_VIDEO" ? ["", ""] : [""]);
  }, [savedKey, demand.mediaType, canEdit]);
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(""), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);
  async function copy(value: string) {
    const href = deliveryHref(value);
    if (!href) return;
    try {
      await navigator.clipboard.writeText(href);
      setCopied(href);
    } catch {
      setCopied("");
    }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!canEdit) return;
    await saveDeliveryLinks({ id: demand.id, links });
  }
  return <form className="delivery-links" onSubmit={submit} aria-label="Link de Entrega">
    <div className="delivery-links-head">
      <h3>Link de Entrega</h3>
      {canEdit && <button className="button secondary small" type="button" aria-label="Incluir outro link de entrega" disabled={busy} onClick={() => setLinks(current => [...current, ""])}>+</button>}
    </div>
    {canEdit && demand.mediaType === "FOTO_E_VIDEO" && <p>Foto e vídeo: um link para cada. O + inclui outros.</p>}
    {!canEdit && links.length === 0 && <p>Nenhum link de entrega informado.</p>}
    {links.map((link, index) => {
      const href = deliveryHref(link);
      const label = `Link de entrega ${index + 1}`;
      return <div className="delivery-link-row" key={`${index}-${savedKey}`}>
        <label>
          <span>{label}</span>
          <input aria-label={label} type="text" inputMode="url" autoCapitalize="none" spellCheck={false} maxLength={2000} readOnly={!canEdit} disabled={canEdit && busy} value={link} placeholder={deliveryPlaceholder(index, demand.mediaType)} onChange={event => setLinks(current => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} />
        </label>
        <div className="delivery-link-actions">
          {href && <button className="button ghost small" type="button" onClick={() => void copy(href)}>{copied === href ? "Copiado" : "Copiar"}</button>}
          {href && <a href={href} target="_blank" rel="noreferrer" className="text-link">Abrir</a>}
          {canEdit && <button className="button ghost small" type="button" aria-label={`Remover link de entrega ${index + 1}`} disabled={busy} onClick={() => setLinks(current => current.filter((_, itemIndex) => itemIndex !== index))}>Remover</button>}
        </div>
      </div>;
    })}
    {canEdit && <button className="button secondary small" disabled={busy}>{busy ? "Salvando…" : "Salvar links"}</button>}
    <span className="sr-only" role="status">{copied ? "Link copiado." : ""}</span>
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
