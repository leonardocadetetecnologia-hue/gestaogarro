"use client";

import { useState, type FormEvent } from "react";
import type { Demand } from "@/lib/data";
import { useGarro } from "@/lib/store";
import { Field } from "./Ui";

export function SelectionReturn({ demand }: { demand: Demand }) {
  const { state, role, pauseClientDue, confirmSelectionReturn, busy } = useGarro();
  const [returnDate, setReturnDate] = useState("");
  if (role !== "GESTOR_GARRO" || demand.status === "Entregue") return null;
  const opportunity = state.opportunities.find(item => item.demandId === demand.id);
  const waitsForPhotos = (opportunity?.lines || []).some(line => !line.extra && state.services?.some(service => service.id === line.serviceId && service.hasSelection));
  if (!waitsForPhotos) return null;
  if (!demand.clientDuePaused) {
    return <button type="button" className="button secondary" disabled={busy} onClick={() => void pauseClientDue(demand.id)}>Seleção enviada ao cliente</button>;
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    void confirmSelectionReturn(demand.id, returnDate);
  }
  return <form className="form-stack" onSubmit={submit}>
    <p className="service-note">O prazo parou de contar enquanto o cliente escolhe as fotos.</p>
    <Field label="Seleção devolvida em *"><input type="date" required value={returnDate} onChange={(event) => setReturnDate(event.target.value)} /></Field>
    <button className="button primary" disabled={busy}>Confirmar volta e recalcular</button>
  </form>;
}
