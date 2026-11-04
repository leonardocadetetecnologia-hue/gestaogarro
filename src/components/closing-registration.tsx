"use client";

import { useState, type FormEvent } from "react";
import type { Opportunity } from "@/lib/data";
import { categoryLabel } from "@/modules/services/model";
import { useGarro } from "@/lib/store";
import { Field, Modal } from "./Ui";

type Line = { serviceId: string; variationName: string; amount: string };
type Birthday = { name: string; birthDate: string };

export function ClosingRegistration({ opportunity, onClose }: { opportunity: Opportunity; onClose: () => void }) {
  const { state, closeWon, busy, error } = useGarro();
  const customer = state.customers.find(item => item.id === opportunity.customerId);
  const services = (state.services || []).filter(item => item.status === "ATIVO");
  const personType = customer?.personType === "EMPRESA" ? "EMPRESA" : "PESSOA_FISICA";
  const [address, setAddress] = useState({
    street: customer?.street || "", addressCity: customer?.addressCity || "", state: customer?.state || "",
  });
  const [birthdays, setBirthdays] = useState<Birthday[]>(customer?.birthdays?.length
    ? customer.birthdays.map(item => ({ name: item.name, birthDate: item.birthDate }))
    : [{ name: customer?.name || "", birthDate: customer?.birthDate || "" }]);
  const [lines, setLines] = useState<Line[]>([{ serviceId: "", variationName: "", amount: "" }]);
  const [localError, setLocalError] = useState("");

  function serviceOf(id: string) {
    return services.find(item => item.id === id);
  }

  function addBirthday() {
    setBirthdays(current => current.length === 1
      ? [{ name: customer?.name || current[0].name, birthDate: current[0].birthDate }, { name: "", birthDate: "" }]
      : [...current, { name: "", birthDate: "" }]);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (lines.some(line => !line.serviceId)) { setLocalError("Escolha o serviço contratado."); return; }
    if (lines.some(line => (serviceOf(line.serviceId)?.variations.length || 0) > 0 && !line.variationName)) {
      setLocalError("Escolha a opção do serviço."); return;
    }
    const payload = lines.map(line => {
      const service = serviceOf(line.serviceId);
      const text = line.amount.trim().replace(",", ".");
      const amount = text === "" ? null : Number(text);
      if (service?.category === "SERVICO_EXTRA" && (amount == null || Number.isNaN(amount))) return null;
      if (amount != null && Number.isNaN(amount)) return null;
      return { serviceId: line.serviceId, variationName: line.variationName, amount };
    });
    if (payload.some(line => !line)) { setLocalError("Informe o valor do serviço extra."); return; }
    const people = birthdays.length === 1
      ? [{ name: (customer?.name || birthdays[0].name).trim(), birthDate: birthdays[0].birthDate }]
      : birthdays.map(item => ({ name: item.name.trim(), birthDate: item.birthDate }));
    if (people.some(item => item.name.length < 2 || !item.birthDate)) {
      setLocalError(birthdays.length > 1 ? "Informe o nome e a data de cada aniversariante." : "Informe a data de nascimento.");
      return;
    }
    const saved = await closeWon(opportunity.id, {
      personType, zip: customer?.zip || "", street: address.street, addressNumber: customer?.addressNumber || "",
      complement: customer?.complement || "", district: customer?.district || "", addressCity: address.addressCity,
      state: address.state.toUpperCase(), birthdays: people, lines: payload.flatMap(line => line ? [line] : []),
    });
    if (saved) onClose();
  }

  return <Modal title="Fechamento" description={`${customer?.name || "Cliente"} aceitou a proposta.`} width="640px" onClose={() => { if (!busy) onClose(); }}>
    <form className="closing-form" onSubmit={(event) => void submit(event)}>
      <section className="closing-section">
        <div className="closing-section-head"><h3>Serviços contratados</h3><button className="button secondary small" type="button" onClick={() => setLines([...lines, { serviceId: "", variationName: "", amount: "" }])}>Adicionar serviço</button></div>
        {lines.map((line, index) => {
          const service = serviceOf(line.serviceId);
          const options = service?.variations || [];
          const extra = service?.category === "SERVICO_EXTRA";
          return <div className="closing-service" key={index}>
            {lines.length > 1 && <div className="closing-span closing-service-tools"><button className="text-link" type="button" onClick={() => setLines(lines.filter((_, position) => position !== index))}>Remover</button></div>}
            <Field label="Serviço"><select required value={line.serviceId} onChange={(event) => setLines(lines.map((item, position) => position === index ? { serviceId: event.target.value, variationName: "", amount: "" } : item))}>
              <option value="">Selecione</option>
              {services.map(item => <option key={item.id} value={item.id}>{categoryLabel[item.category]} · {item.name}</option>)}
            </select></Field>
            <Field label={extra ? "Valor do extra (R$)" : "Valor (R$)"}><input type="number" min={0} step="0.01" required={extra} value={line.amount} placeholder={extra ? "Informe o valor" : "Preço do catálogo"} onChange={(event) => setLines(lines.map((item, position) => position === index ? { ...item, amount: event.target.value } : item))} /></Field>
            {options.length > 0 && <div className="closing-span"><Field label="Opção deste serviço"><select required value={line.variationName} onChange={(event) => setLines(lines.map((item, position) => position === index ? { ...item, variationName: event.target.value } : item))}>
              <option value="">Selecione</option>
              {options.map(item => <option key={item.name} value={item.name}>{item.name}</option>)}
            </select></Field></div>}
          </div>;
        })}
      </section>
      <section className="closing-section">
        <h3>Endereço</h3>
        <div className="compact-address">
          <Field label="Endereço"><input required value={address.street} placeholder="Rua e número" onChange={(event) => setAddress({ ...address, street: event.target.value })} /></Field>
          <Field label="Cidade"><input required value={address.addressCity} onChange={(event) => setAddress({ ...address, addressCity: event.target.value })} /></Field>
          <Field label="UF"><input required maxLength={2} value={address.state} onChange={(event) => setAddress({ ...address, state: event.target.value.toUpperCase() })} /></Field>
        </div>
      </section>
      <section className="closing-section">
        <div className="closing-section-head"><h3>Aniversário</h3><button className="button secondary small" type="button" onClick={addBirthday}>Adicionar outra pessoa</button></div>
        {birthdays.length === 1
          ? <div className="compact-date"><Field label="Data de nascimento"><input required type="date" value={birthdays[0].birthDate} max="9999-12-31" onChange={(event) => setBirthdays([{ ...birthdays[0], birthDate: event.target.value }])} /></Field></div>
          : birthdays.map((birthday, index) => <div className="closing-person" key={index}>
            <Field label="Nome"><input required value={birthday.name} onChange={(event) => setBirthdays(birthdays.map((item, position) => position === index ? { ...item, name: event.target.value } : item))} /></Field>
            <Field label="Data"><input required type="date" value={birthday.birthDate} max="9999-12-31" onChange={(event) => setBirthdays(birthdays.map((item, position) => position === index ? { ...item, birthDate: event.target.value } : item))} /></Field>
            <button className="text-link" type="button" onClick={() => setBirthdays(birthdays.filter((_, position) => position !== index))}>Remover</button>
          </div>)}
      </section>
      {(localError || error) && <p className="form-error" role="alert">{localError || error}</p>}
      <div className="modal-footer"><button className="button secondary" type="button" onClick={onClose}>Cancelar</button><button className="button primary" disabled={busy}>{busy ? "Salvando…" : "Salvar fechamento"}</button></div>
    </form>
  </Modal>;
}
