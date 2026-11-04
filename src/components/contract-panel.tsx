"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Customer, Opportunity } from "@/lib/data";
import { addBusinessDays } from "@/modules/agenda/business-days";
import { contractChecklist, optionalDateLineIds } from "@/modules/crm/contract-checklist";
import { useGarro } from "@/lib/store";
import { Field } from "./Ui";

type ScheduleLine = { id: string; serviceDate: string; captureTime: string; capturePlace: string; proposedDays: string };
type Personal = { street: string; addressCity: string; state: string; birthdayName: string; birthday: string };

export function ContractPanel({ opportunity, onDirty, onSaved, onChecklist }: {
  opportunity: Opportunity;
  onDirty?: () => void;
  onSaved?: () => void;
  onChecklist?: (status: ReturnType<typeof contractChecklist>) => void;
}) {
  const { saveContract, saveServiceDates, saveRegistration, busy, state, role, transferContract, reload } = useGarro();
  const customer = state.customers.find(item => item.id === opportunity.customerId);
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
  const [personal, setPersonal] = useState<Personal>(() => personalFrom(customer));
  const attendants = (state.assignees || []).filter(person => person.role === "ATENDENTE" || person.role === "GESTOR_GARRO");
  const variationRequired = new Set((state.services || []).filter(service => service.variations.length > 0).map(service => service.id));
  const lines = (opportunity.lines || []).flatMap(line => {
    const current = schedule.find(item => item.id === line.id);
    if (!line.id || !current) return [];
    const days = current.proposedDays.trim() === "" ? null : Number(current.proposedDays);
    return [{
      id: line.id, serviceId: line.serviceId, serviceName: line.serviceName, variationName: line.variationName, extra: line.extra,
      serviceDate: current.serviceDate, proposedDays: days != null && Number.isInteger(days) ? days : null, sortOrder: line.sortOrder,
    }];
  });
  const check = contractChecklist({
    contractSigned: signed === "sim", waived: opportunity.checklistWaived, lines, customer: {
      personType: customer?.personType || "PESSOA_FISICA", street: personal.street, addressCity: personal.addressCity, state: personal.state,
      birthdays: personal.birthdayName && personal.birthday ? [{ name: personal.birthdayName, birthDate: personal.birthday }] : [],
    }, variationRequired,
  });
  const optionalDates = optionalDateLineIds(lines);
  const savedPersonal = contractChecklist({
    contractSigned: opportunity.contractSigned, waived: opportunity.checklistWaived, lines: opportunity.lines || [], customer: customer || {}, variationRequired,
  }).missing.some(item => item.id === "personal");
  const signedPending = check.pending.some(item => item.id === "signed");
  const signedIgnored = check.ignored.some(item => item.id === "signed");
  const personalPending = check.pending.some(item => item.id === "personal");
  const personalIgnored = check.ignored.some(item => item.id === "personal");
  const servicesPending = check.pending.some(item => item.id === "services");

  const reported = useRef("");
  const signature = `${check.canSend}|${check.pending.map(item => item.id).join()}|${check.ignored.map(item => item.id).join()}`;
  useEffect(() => {
    if (reported.current === signature) return;
    reported.current = signature;
    onChecklist?.(check);
  }, [check, onChecklist, signature]);

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

  async function savePersonal() {
    const several = (customer?.birthdays?.length || 0) > 1;
    const payload = { ...personal, birthdayName: several ? personal.birthdayName : (customer?.name || personal.birthdayName) };
    if (await saveRegistration(opportunity.id, payload)) onSaved?.();
  }

  const previews = lines.flatMap(line => {
    const delivery = line.serviceDate && line.proposedDays != null && line.proposedDays >= 0 ? addBusinessDays(line.serviceDate, line.proposedDays, holidays) : "";
    return [{ id: line.id, delivery }];
  });
  const projectDelivery = previews.reduce((max, item) => item.delivery > max ? item.delivery : max, "");
  let dateAnchor = false;
  let daysAnchor = false;

  return <form className="form-stack contract-panel" onSubmit={(event) => void submit(event)}>
    <section className="contract-block">
    <h3>Contrato</h3>
    <fieldset id="pendencia-signed" className={signedPending ? "choice-field choice-pending" : "choice-field"}><legend>Contrato assinado?</legend><div className="choice-row">
      <button type="button" className="button secondary small" aria-pressed={signed === "nao"} onClick={() => { setSigned("nao"); onDirty?.(); }}>Não</button>
      <button type="button" className="button secondary small" aria-pressed={signed === "sim"} onClick={() => { setSigned("sim"); onDirty?.(); }}>Sim</button>
    </div>{signedPending && <small className="field-pending-note">Pendente</small>}{signedIgnored && <small className="field-ignored-note">ignorado pela gestora</small>}</fieldset>
    {signed === "sim" && <div className="loss-date"><Field label="Data de assinatura *"><input type="date" required value={signedAt} onChange={(event) => { setSignedAt(event.target.value); onDirty?.(); }} /></Field></div>}
    <Field label="Anexo do contrato"><input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) { onDirty?.(); void upload(file); } }} /></Field>
    {fileName && <p className="service-note">Anexo: {fileName}</p>}
    {message && <p className="service-note">{message}</p>}
    <div className="contract-actions"><button className="button primary small" disabled={busy}>Salvar contrato</button></div>
    </section>
    {savedPersonal && <section id="pendencia-personal" className={personalPending ? "contract-block choice-pending" : "contract-block"}>
      <h3>Informações pessoais</h3>
      <div className="compact-address">
        <Field label="Endereço" pending={personalPending}><input value={personal.street} onChange={(event) => { setPersonal({ ...personal, street: event.target.value }); onDirty?.(); }} /></Field>
        <Field label="Cidade" pending={personalPending}><input value={personal.addressCity} onChange={(event) => { setPersonal({ ...personal, addressCity: event.target.value }); onDirty?.(); }} /></Field>
        <Field label="UF" pending={personalPending}><input maxLength={2} value={personal.state} onChange={(event) => { setPersonal({ ...personal, state: event.target.value.toUpperCase() }); onDirty?.(); }} /></Field>
      </div>
      <div className={(customer?.birthdays?.length || 0) > 1 ? "closing-person" : "compact-date"}>
        {(customer?.birthdays?.length || 0) > 1 && <Field label="Aniversariante" pending={personalPending}><input value={personal.birthdayName} onChange={(event) => { setPersonal({ ...personal, birthdayName: event.target.value }); onDirty?.(); }} /></Field>}
        <Field label="Data de nascimento" pending={personalPending}><input type="date" value={personal.birthday} max="9999-12-31" onChange={(event) => { setPersonal({ ...personal, birthday: event.target.value }); onDirty?.(); }} /></Field>
      </div>
      {personalIgnored && <small className="field-ignored-note">ignorado pela gestora</small>}
      <button className="button secondary small" type="button" disabled={busy} onClick={() => void savePersonal()}>Salvar cadastro</button>
    </section>}
    {role === "GESTOR_GARRO" && <Field label="Atendente responsável"><select value={opportunity.responsibleId || ""} onChange={(event) => void transferContract(opportunity.id, event.target.value)}>
      {attendants.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}
    </select></Field>}
    <section className="contract-block service-dates" id="pendencia-services">
      <h3>Serviços</h3>
      {servicesPending && <p className="field-pending-note">Pendente: escolha o serviço no fechamento.</p>}
      {check.ignored.some(item => item.id === "services") && <p className="field-ignored-note">Serviço: ignorado pela gestora</p>}
      {lines.map(line => {
        const current = schedule.find(item => item.id === line.id);
        if (!current) return null;
        const source = (opportunity.lines || []).find(item => item.id === line.id);
        const delivery = previews.find(item => item.id === line.id)?.delivery || "";
        const dateOptional = optionalDates.has(line.id);
        const datePending = !dateOptional && !current.serviceDate;
        const daysPending = current.proposedDays.trim() === "" || !Number.isInteger(Number(current.proposedDays)) || Number(current.proposedDays) < 0;
        const dateId = datePending && !dateAnchor ? (dateAnchor = true, "pendencia-serviceDate") : undefined;
        const daysId = daysPending && !daysAnchor ? (daysAnchor = true, "pendencia-proposedDays") : undefined;
        return <div className="service-line" key={line.id}>
          <h3>{source?.extra ? "Extra · " : ""}{source?.serviceName}{source?.variationName ? ` · ${source.variationName}` : ""}</h3>
          <div className="contract-service-grid">
            <Field label={dateOptional ? "Data do serviço" : "Data do serviço *"} pending={datePending} id={dateId} note={dateOptional && !current.serviceDate ? "A definir" : undefined}><input type="date" value={current.serviceDate} onChange={(event) => { setSchedule(schedule.map(item => item.id === line.id ? { ...item, serviceDate: event.target.value } : item)); onDirty?.(); }} /></Field>
            <Field label="Prazo proposto (dias úteis) *" pending={daysPending} id={daysId}><input type="number" min={0} step={1} value={current.proposedDays} onChange={(event) => { setSchedule(schedule.map(item => item.id === line.id ? { ...item, proposedDays: event.target.value } : item)); onDirty?.(); }} /></Field>
            <Field label="Horário da captação"><input type="time" value={current.captureTime} onChange={(event) => { setSchedule(schedule.map(item => item.id === line.id ? { ...item, captureTime: event.target.value } : item)); onDirty?.(); }} /></Field>
            <Field label="Local da captação"><input value={current.capturePlace} onChange={(event) => { setSchedule(schedule.map(item => item.id === line.id ? { ...item, capturePlace: event.target.value } : item)); onDirty?.(); }} /></Field>
          </div>
          {delivery && <p className="service-note">Prazo deste serviço: {delivery.split("-").reverse().join("/")}.</p>}
        </div>;
      })}
      {projectDelivery && <p className="service-note">Entrega ao cliente do projeto: {projectDelivery.split("-").reverse().join("/")}{previews.filter(item => item.delivery).length > 1 ? ", a data mais tarde" : ""}. Entra uma vez na agenda, no filtro Entregas.</p>}
      {lines.length > 0 && <div className="contract-actions"><button className="button secondary small" type="button" disabled={busy} onClick={() => void saveServiceDates(opportunity.id, schedule.map(line => ({
        ...line,
        proposedDays: line.proposedDays.trim() === "" ? null : Number(line.proposedDays),
      }))).then(saved => { if (saved) onSaved?.(); })}>Salvar datas</button></div>}
    </section>
  </form>;
}

function personalFrom(customer?: Customer): Personal {
  const birthday = customer?.birthdays?.[0];
  return {
    street: customer?.street || "", addressCity: customer?.addressCity || "", state: customer?.state || "",
    birthdayName: birthday?.name || customer?.name || "", birthday: birthday?.birthDate || customer?.birthDate || "",
  };
}
