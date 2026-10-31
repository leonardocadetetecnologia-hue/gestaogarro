"use client";

import { useState, type FormEvent } from "react";
import type { Opportunity } from "@/lib/data";
import { categoryLabel } from "@/modules/services/model";
import { useGarro } from "@/lib/store";
import { Field, Modal } from "./Ui";

type Line = { serviceId: string; variationName: string; amount: string };

export function ClosingRegistration({ opportunity, onClose }: { opportunity: Opportunity; onClose: () => void }) {
  const { state, closeWon, busy, error } = useGarro();
  const customer = state.customers.find(item => item.id === opportunity.customerId);
  const services = (state.services || []).filter(item => item.status === "ATIVO");
  const [personType, setPersonType] = useState<"PESSOA_FISICA" | "EMPRESA">(customer?.personType === "EMPRESA" ? "EMPRESA" : "PESSOA_FISICA");
  const [address, setAddress] = useState({
    zip: customer?.zip || "", street: customer?.street || "", addressNumber: customer?.addressNumber || "",
    complement: customer?.complement || "", district: customer?.district || "", addressCity: customer?.addressCity || "", state: customer?.state || "",
  });
  const [birthdays, setBirthdays] = useState(customer?.birthdays?.length ? customer.birthdays : [{ name: customer?.name || "", birthDate: customer?.birthDate || "" }]);
  const [lines, setLines] = useState<Line[]>([{ serviceId: "", variationName: "", amount: "" }]);
  const [localError, setLocalError] = useState("");

  function serviceOf(id: string) {
    return services.find(item => item.id === id);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (lines.some(line => !line.serviceId)) { setLocalError("Escolha o serviço contratado."); return; }
    const payload = lines.map(line => {
      const service = serviceOf(line.serviceId);
      const text = line.amount.trim().replace(",", ".");
      const amount = text === "" ? null : Number(text);
      if (service?.category === "SERVICO_EXTRA" && (amount == null || Number.isNaN(amount))) return null;
      if (amount != null && Number.isNaN(amount)) return null;
      return { serviceId: line.serviceId, variationName: line.variationName, amount };
    });
    if (payload.some(line => !line)) { setLocalError("Informe o valor do serviço extra."); return; }
    const saved = await closeWon(opportunity.id, {
      personType, ...address, state: address.state.toUpperCase(), birthdays, lines: payload.flatMap(line => line ? [line] : []),
    });
    if (saved) onClose();
  }

  return <Modal title="Fechamento" description={`${customer?.name || "Cliente"} aceitou a proposta.`} width="760px" onClose={() => { if (!busy) onClose(); }}>
    <form className="form-stack" onSubmit={(event) => void submit(event)}>
      <div className="service-actions"><strong>Serviços contratados</strong><button className="button secondary small" type="button" onClick={() => setLines([...lines, { serviceId: "", variationName: "", amount: "" }])}>Adicionar serviço</button></div>
      {lines.map((line, index) => {
        const service = serviceOf(line.serviceId);
        const extra = service?.category === "SERVICO_EXTRA";
        return <div className="form-grid" key={index}>
          <Field label="Serviço"><select required value={line.serviceId} onChange={(event) => setLines(lines.map((item, position) => position === index ? { serviceId: event.target.value, variationName: "", amount: "" } : item))}>
            <option value="">Selecione</option>
            {services.map(item => <option key={item.id} value={item.id}>{categoryLabel[item.category]} · {item.name}</option>)}
          </select></Field>
          <Field label="Variação"><select value={line.variationName} onChange={(event) => setLines(lines.map((item, position) => position === index ? { ...item, variationName: event.target.value } : item))}>
            <option value="">Sem variação</option>
            {(service?.variations || []).map(item => <option key={item.name} value={item.name}>{item.name}</option>)}
          </select></Field>
          <Field label={extra ? "Valor do extra (R$) *" : "Valor (R$)"}><input type="number" min={0} step="0.01" required={extra} value={line.amount} placeholder={extra ? "Informe no fechamento" : "Pode usar o preço do catálogo"} onChange={(event) => setLines(lines.map((item, position) => position === index ? { ...item, amount: event.target.value } : item))} /></Field>
        </div>;
      })}
      <fieldset className="choice-field"><legend>Tipo de cliente</legend><div className="choice-row">
        <button type="button" className="button secondary" aria-pressed={personType === "PESSOA_FISICA"} onClick={() => setPersonType("PESSOA_FISICA")}>Pessoa física</button>
        <button type="button" className="button secondary" aria-pressed={personType === "EMPRESA"} onClick={() => setPersonType("EMPRESA")}>Empresa</button>
      </div></fieldset>
      <div className="form-grid">
        <Field label="CEP"><input value={address.zip} onChange={(event) => setAddress({ ...address, zip: event.target.value })} /></Field>
        <Field label="Logradouro *"><input required value={address.street} onChange={(event) => setAddress({ ...address, street: event.target.value })} /></Field>
        <Field label="Número"><input value={address.addressNumber} onChange={(event) => setAddress({ ...address, addressNumber: event.target.value })} /></Field>
        <Field label="Complemento"><input value={address.complement} onChange={(event) => setAddress({ ...address, complement: event.target.value })} /></Field>
        <Field label="Bairro"><input value={address.district} onChange={(event) => setAddress({ ...address, district: event.target.value })} /></Field>
        <Field label="Cidade *"><input required value={address.addressCity} onChange={(event) => setAddress({ ...address, addressCity: event.target.value })} /></Field>
        <Field label="UF *"><input required maxLength={2} value={address.state} onChange={(event) => setAddress({ ...address, state: event.target.value })} /></Field>
      </div>
      <div className="service-actions"><strong>{personType === "EMPRESA" ? "Aniversário dos responsáveis" : "Aniversários"}</strong><button className="button secondary small" type="button" onClick={() => setBirthdays([...birthdays, { name: "", birthDate: "" }])}>+ adicionar aniversário</button></div>
      {birthdays.map((birthday, index) => <div className="form-grid" key={index}>
        <Field label="Nome do aniversariante"><input required value={birthday.name} onChange={(event) => setBirthdays(birthdays.map((item, position) => position === index ? { ...item, name: event.target.value } : item))} /></Field>
        <Field label="Data de nascimento"><input required type="date" value={birthday.birthDate} max="9999-12-31" onChange={(event) => setBirthdays(birthdays.map((item, position) => position === index ? { ...item, birthDate: event.target.value } : item))} /></Field>
      </div>)}
      {(localError || error) && <p className="form-error" role="alert">{localError || error}</p>}
      <div className="modal-footer"><button className="button secondary" type="button" onClick={onClose}>Cancelar</button><button className="button primary" disabled={busy}>{busy ? "Salvando…" : "Salvar fechamento"}</button></div>
    </form>
  </Modal>;
}
