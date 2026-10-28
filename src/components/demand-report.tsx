"use client";

import { useState } from "react";
import { FileDown } from "lucide-react";

const dayPattern = /^\d{4}-\d{2}-\d{2}$/;
const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;

export function DemandDeliveryReport({ demandId }: { demandId: string }) {
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const [mode, setMode] = useState<"month" | "range">("month");
  const [month, setMonth] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const ready = mode === "month"
    ? monthPattern.test(month)
    : dayPattern.test(from) && dayPattern.test(to) && from <= to;

  function openPdf() {
    if (!ready) return;
    const params = new URLSearchParams({ demandId, imprimir: "1" });
    if (mode === "month") params.set("month", month);
    else {
      params.set("from", from);
      params.set("to", to);
    }
    window.open(`${base}/painel/extrato?${params}`, "_blank", "noopener");
  }

  return (
    <section className="demand-report" aria-label="Relatório de entrega">
      <div>
        <h3>Relatório de entrega</h3>
        <p>Somente o que já foi entregue ao cliente neste período.</p>
      </div>
      <div className="demand-report-filters">
        <label className="field">
          <span>Período</span>
          <select aria-label="Tipo de período do relatório" value={mode} onChange={event => setMode(event.target.value as "month" | "range")}>
            <option value="month">Mês</option>
            <option value="range">Intervalo de datas</option>
          </select>
        </label>
        {mode === "month" ? (
          <label className="field">
            <span>Mês</span>
            <input aria-label="Mês do relatório" type="month" value={month} onChange={event => setMonth(event.target.value)} />
          </label>
        ) : (
          <>
            <label className="field">
              <span>De</span>
              <input aria-label="Início do período" type="date" value={from} onChange={event => setFrom(event.target.value)} />
            </label>
            <label className="field">
              <span>Até</span>
              <input aria-label="Fim do período" type="date" value={to} onChange={event => setTo(event.target.value)} />
            </label>
          </>
        )}
        <button className="button primary" type="button" onClick={openPdf} disabled={!ready}>
          <FileDown size={16} />Exportar PDF
        </button>
      </div>
    </section>
  );
}
