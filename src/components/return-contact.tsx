"use client";

import { useState, type FormEvent } from "react";
import type { Opportunity } from "@/lib/data";
import { dateFull } from "@/lib/data";
import { futureContactAt, futureContactFromDate, todayKey } from "@/modules/crm/future-contact";
import { lossMotives } from "@/modules/crm/loss-motives";
import { useGarro } from "@/lib/store";
import { Field, Modal } from "./Ui";

export function ReturnContactModal({ opportunity, kind, onClose }: { opportunity: Opportunity; kind: "sem-interesse" | "perdido"; onClose: () => void }) {
  const { state, moveOpportunity, loseOpportunity, saveFutureContact, busy, error } = useGarro();
  const editing = kind === "sem-interesse" ? opportunity.stage === "Sem interesse" : opportunity.stage === "Fechado sem sucesso";
  const scheduled = opportunity.nextAction === "Contato futuro" && opportunity.nextAt;
  const [answer, setAnswer] = useState<"sim" | "nao" | "">(scheduled ? "sim" : "");
  const [preset, setPreset] = useState<"30" | "60" | "outra" | "">(scheduled ? "outra" : "");
  const [custom, setCustom] = useState(scheduled ? new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(opportunity.nextAt!)) : "");
  const known = lossMotives.includes((opportunity.lossReason || "") as typeof lossMotives[number]);
  const [reason, setReason] = useState(known ? opportunity.lossReason || "" : opportunity.lossReason ? "Outro" : "");
  const [note, setNote] = useState(known ? opportunity.lossNote || "" : opportunity.lossReason && opportunity.lossReason !== "Outro" ? opportunity.lossReason : opportunity.lossNote || "");
  const options = (state.assignees || []).filter(person => person.role === "GESTOR_GARRO" || person.id === opportunity.responsibleId);
  const responsibleId = opportunity.returnResponsibleId || opportunity.responsibleId || options[0]?.id || "";
  const lost = kind === "perdido";

  function chosenDate() {
    if (lost) return futureContactFromDate(custom);
    if (preset === "30") return futureContactAt(30);
    if (preset === "60") return futureContactAt(60);
    return futureContactFromDate(custom);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (answer !== "sim" && answer !== "nao") return;
    if (lost && !reason) return;
    if (lost && reason === "Outro" && note.trim().length < 3) return;
    const date = answer === "sim" ? chosenDate() : null;
    if (answer === "sim" && !date) return;
    const owner = opportunity.responsibleId || responsibleId;
    if (answer === "sim" && lost && !owner) return;
    const futureAt = date ? date.toISOString() : "";
    const future = { futureContact: answer, futureAt, responsibleId: owner, reason, note: note.trim() };
    const saved = lost
      ? editing
        ? await saveFutureContact(opportunity.id, future)
        : await loseOpportunity(opportunity.id, { reason, note: note.trim(), futureContact: answer, futureAt, responsibleId: owner })
      : editing
        ? await saveFutureContact(opportunity.id, { futureContact: answer, futureAt, responsibleId: opportunity.responsibleId || "" })
        : await moveOpportunity(opportunity.id, "Sem interesse", { futureContact: answer, futureAt });
    if (saved) onClose();
  }

  return <Modal title={lost ? "Fechado sem sucesso" : "Sem interesse"} description={scheduled ? `Retorno marcado para ${dateFull(opportunity.nextAt)}.` : "Responda antes de concluir a mudança de coluna."} onClose={() => { if (!busy) onClose(); }}>
    <form className="form-stack" onSubmit={submit} aria-busy={busy}>
      {lost && <Field label="Motivo *"><select required disabled={busy} value={reason} onChange={event => setReason(event.target.value)}><option value="">Selecione</option>{lossMotives.map(item => <option key={item} value={item}>{item}</option>)}</select></Field>}
      {lost && reason === "Outro" && <Field label="Descreva o motivo *"><textarea required minLength={3} maxLength={1000} rows={3} disabled={busy} value={note} onChange={event => setNote(event.target.value)} /></Field>}
      <fieldset className="choice-field"><legend>{lost ? "Entrar em contato novamente?" : "Deverá entrar em contato no futuro?"}</legend><div className="choice-row"><button type="button" className="button secondary" aria-pressed={answer === "nao"} disabled={busy} onClick={() => setAnswer("nao")}>Não</button><button type="button" className="button secondary" aria-pressed={answer === "sim"} disabled={busy} onClick={() => setAnswer("sim")}>Sim</button></div></fieldset>
      {answer === "sim" && lost && <Field label="Reativar em *"><input type="date" required min={todayKey()} disabled={busy} value={custom} onChange={event => setCustom(event.target.value)} /></Field>}
      {answer === "sim" && !lost && <>
        <fieldset className="choice-field"><legend>Tempo de retorno</legend><div className="choice-row"><button type="button" className="button secondary" aria-pressed={preset === "30"} disabled={busy} onClick={() => setPreset("30")}>30 dias</button><button type="button" className="button secondary" aria-pressed={preset === "60"} disabled={busy} onClick={() => setPreset("60")}>60 dias</button><button type="button" className="button secondary" aria-pressed={preset === "outra"} disabled={busy} onClick={() => setPreset("outra")}>Outra data</button></div></fieldset>
        {preset === "outra" && <Field label="Data do retorno"><input type="date" required min={todayKey()} disabled={busy} value={custom} onChange={event => setCustom(event.target.value)}/></Field>}
      </>}
      {error && <p role="alert" className="form-error">{error}</p>}
      <div className="modal-footer"><button type="button" className="button secondary" disabled={busy} onClick={onClose}>Cancelar</button><button className="button primary" disabled={busy || answer === "" || (lost && !reason) || (answer === "sim" && lost && !custom) || (answer === "sim" && !lost && preset === "")}>{busy ? "Salvando…" : "Confirmar"}</button></div>
    </form>
  </Modal>;
}
