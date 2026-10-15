"use client";
import { useState, type FormEvent } from "react";
import { useGarro } from "@/lib/store";
import { parseSaoPaulo } from "@/lib/deadlines";
import { Field, Modal } from "./Ui";

export function NewDemandModal({ onClose }: { onClose: () => void }) {
  const { state, createDemand, busy, error } = useGarro();
  const [customerId, setCustomerId] = useState("");
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [phone, setPhone] = useState("");
  const [title, setTitle] = useState(""); const [description, setDescription] = useState("");
  const [due, setDue] = useState(""); const [items, setItems] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault(); const date = parseSaoPaulo(due); if (!date) return;
    if (await createDemand({ title, description, due: date.toISOString(), deliverables: items.split("\n").map(v => v.trim()).filter(Boolean),
      ...(customerId === "new" ? { newCustomer: { name, email, phone } } : { customerId }),
    })) onClose();
  }
  return <Modal title="Nova demanda" description="Vincule a produção a um cliente existente ou cadastre um novo cliente." onClose={() => { if (!busy) onClose(); }}>
    <form className="form-stack" onSubmit={submit} aria-busy={busy}>
      <Field label="Cliente *"><select required disabled={busy} value={customerId} onChange={e => setCustomerId(e.target.value)}>
        <option value="">Selecione um cliente</option><option value="new">+ Cadastrar novo cliente</option>
        {state.customers.filter(c => c.kind === "CLIENTE").map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select></Field>
      {customerId === "new" && <div className="form-grid"><Field label="Nome do cliente *"><input required minLength={2} value={name} onChange={e => setName(e.target.value)}/></Field><Field label="E-mail"><input type="email" value={email} onChange={e => setEmail(e.target.value)}/></Field><Field label="Telefone"><input value={phone} onChange={e => setPhone(e.target.value)}/></Field></div>}
      <Field label="Título da demanda *"><input required minLength={2} maxLength={200} value={title} onChange={e => setTitle(e.target.value)}/></Field>
      <Field label="Briefing *"><textarea required minLength={3} rows={4} value={description} onChange={e => setDescription(e.target.value)}/></Field>
      <Field label="Prazo do cliente (horário de Brasília) *"><input required type="datetime-local" value={due} onChange={e => setDue(e.target.value)}/></Field>
      <Field label="Entregáveis (um por linha) *"><textarea required rows={3} value={items} onChange={e => setItems(e.target.value)}/></Field>
      {error && <p role="alert" className="form-error">{error}</p>}
      <div className="modal-footer"><button type="button" className="button secondary" disabled={busy} onClick={onClose}>Cancelar</button><button className="button primary" disabled={busy}>{busy ? "Criando…" : "Criar demanda"}</button></div>
    </form>
  </Modal>;
}
