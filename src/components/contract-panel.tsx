"use client";

import { useState, type FormEvent } from "react";
import type { Opportunity } from "@/lib/data";
import { addBusinessDays } from "@/modules/agenda/business-days";
import { useGarro } from "@/lib/store";
import { Field } from "./Ui";

type ScheduleLine = { id: string; serviceDate: string; captureTime: string; capturePlace: string; proposedDays: string };

export function ContractPanel({ opportunity, onDirty, onSaved }: { opportunity: Opportunity; onDirty?: () => void; onSaved?: () => void }) {
  const { saveContract, saveServiceDates, busy, state, role, transferContract, reload } = useGarro();
  const holidays = new Set(state.holidays || []);
  const [schedule, setSchedule] = useState<ScheduleLine[]>((opportunity.lines || []).flatMap(line => line.id ? [{
    id: line.id,
    serviceDate: line.serviceDate || "",
    captureTime: line.captureTime || "",
    capturePlace: line.capturePlace || "",
    proposedDays: line.proposedDays == null ? String(state.services?.find(service => service.id === line.serviceId)?.deliveryDays ?? "") : String(line.proposedDays),
  }] : []));
  const [signed, setSigned] = useState<"sim" | "nao">(opportunity.contractSigned ? "sim" : "nao");
  const [signedAt, setSignedAt] = useState(opportunity.contractSignedAt ? opportunity.contractSignedAt.slice(0, 10) : "");
  const [fileName, setFileName] = useState(opportunity.contractFileName || "");
  const [message, setMessage] = useState("");
  const attendants = (state.assignees || []).filter(person => person.role === "ATENDENTE" || person.role === "GESTOR_GARRO");

  async function upload(file: File) {
    const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
    const response = await fetch(`${base}/api/contracts`, {
      method: "POST",
      headers: { "x-opportunity-id": opportunity.id, "x-file-name": encodeURIComponent(file.name) },
      body: file,
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) { setMessage(body.error || "Não foi possível anexar o contrato."); return; }
    setFileName(file.name);
    setMessage("Contrato anexado.");
    await reload();
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (await saveContract(opportunity.id, { signed: signed === "sim", signedAt })) onSaved?.();
  }

  return <form className="form-stack contract-panel" onSubmit={(event) => void submit(event)}>
    <fieldset className="choice-field"><legend>Contrato assinado?</legend><div className="choice-row">
      <button type="button" className="button secondary" aria-pressed={signed === "nao"} onClick={() => { setSigned("nao"); onDirty?.(); }}>Não</button>
      <button type="button" className="button secondary" aria-pressed={signed === "sim"} onClick={() => { setSigned("sim"); onDirty?.(); }}>Sim</button>
    </div></fieldset>
    {signed === "sim" && <Field label="Data de assinatura *"><input type="date" required value={signedAt} onChange={(event) => { setSignedAt(event.target.value); onDirty?.(); }} /></Field>}
    <Field label="Anexo do contrato"><input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) { onDirty?.(); void upload(file); } }} /></Field>
    {fileName && <p className="service-note">Anexo: {fileName}</p>}
    {opportunity.contractPending && <p className="form-error">Pendente: falta a assinatura ou o anexo.</p>}
    {message && <p className="service-note">{message}</p>}
    {role === "GESTOR_GARRO" && <Field label="Atendente responsável"><select value={opportunity.responsibleId || ""} onChange={(event) => void transferContract(opportunity.id, event.target.value)}>
      {attendants.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}
    </select></Field>}
    {(opportunity.lines || []).length > 0 && <div className="service-dates">{opportunity.lines?.map(line => {
      const current = schedule.find(item => item.id === line.id);
      if (!current) return null;
      const days = current.proposedDays.trim() === "" ? null : Number(current.proposedDays);
      const delivery = current.serviceDate && days != null && Number.isInteger(days) && days >= 0 ? addBusinessDays(current.serviceDate, days, holidays) : "";
      return <fieldset className="choice-field" key={line.id}>
        <legend>{line.extra ? "Extra · " : ""}{line.serviceName}{line.variationName ? ` · ${line.variationName}` : ""}</legend>
        <div className="form-grid">
          <Field label="Data do serviço *"><input type="date" value={current.serviceDate} onChange={(event) => { setSchedule(schedule.map(item => item.id === line.id ? { ...item, serviceDate: event.target.value } : item)); onDirty?.(); }} /></Field>
          <Field label="Prazo proposto (dias úteis) *"><input type="number" min={0} step={1} value={current.proposedDays} onChange={(event) => { setSchedule(schedule.map(item => item.id === line.id ? { ...item, proposedDays: event.target.value } : item)); onDirty?.(); }} /></Field>
          <Field label="Horário da captação"><input type="time" value={current.captureTime} onChange={(event) => { setSchedule(schedule.map(item => item.id === line.id ? { ...item, captureTime: event.target.value } : item)); onDirty?.(); }} /></Field>
          <Field label="Local da captação"><input value={current.capturePlace} onChange={(event) => { setSchedule(schedule.map(item => item.id === line.id ? { ...item, capturePlace: event.target.value } : item)); onDirty?.(); }} /></Field>
        </div>
        {delivery && <p className="service-note">Entrega final: {delivery.split("-").reverse().join("/")}. Entra na agenda e na entrega ao cliente.</p>}
      </fieldset>;
    })}
    <button className="button secondary" type="button" disabled={busy} onClick={() => void saveServiceDates(opportunity.id, schedule.map(line => ({
      ...line,
      proposedDays: line.proposedDays.trim() === "" ? null : Number(line.proposedDays),
    }))).then(saved => { if (saved) onSaved?.(); })}>Salvar datas do serviço</button>
    </div>}
    <button className="button primary" disabled={busy}>Salvar contrato</button>
  </form>;
}
