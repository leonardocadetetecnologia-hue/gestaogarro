"use client";

import { useState } from "react";
import { FileDown } from "lucide-react";
import { saoPauloDay } from "@/modules/reports/delivery-statement";

const dayPattern = /^\d{4}-\d{2}-\d{2}$/;
const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;

const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export function DemandDeliveryReport({ demandId, available, deliveredAt }: { demandId: string; available: boolean; deliveredAt?: string }) {
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const [mode, setMode] = useState<"month" | "range">("month");
  const [initialYear, initialMonth] = saoPauloDay(deliveredAt || new Date().toISOString()).split("-");
  const [year, setYear] = useState(initialYear);
  const [monthNumber, setMonthNumber] = useState(initialMonth);
  const month = `${year}-${monthNumber}`;
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const ready = available && (mode === "month"
    ? monthPattern.test(month)
    : dayPattern.test(from) && dayPattern.test(to) && from <= to);

  async function openPdf() {
    if (!ready || busy) return;
    const params = new URLSearchParams({ demandId });
    if (mode === "month") params.set("month", month);
    else {
      params.set("from", from);
      params.set("to", to);
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`${base}/api/reports/delivery-statement/pdf?${params}`);
      if (!response.ok || !response.headers.get("content-type")?.startsWith("application/pdf")) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Não foi possível exportar o PDF.");
      }
      const url = URL.createObjectURL(await response.blob());
      const download = document.createElement("a");
      download.href = url;
      download.download = "relatorio-de-entrega-garro.pdf";
      document.body.append(download);
      download.click();
      download.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível exportar o PDF.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="demand-report" aria-label="Relatório de entrega">
      <div>
        <h3>Relatório de entrega</h3>
        <p>{available ? "Somente o que já foi entregue ao cliente neste período." : "O PDF fica disponível depois que a entrega ao cliente é registrada."}</p>
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
          <div className="statement-dates">
            <label className="field">
              <span>Mês</span>
              <select aria-label="Mês do relatório" value={monthNumber} onChange={event => setMonthNumber(event.target.value)}>
                {months.map((label, index) => <option key={label} value={String(index + 1).padStart(2, "0")}>{label}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Ano</span>
              <input aria-label="Ano do relatório" type="number" min="1900" max="9999" value={year} onChange={event => setYear(event.target.value)} />
            </label>
          </div>
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
        <button className="button primary" type="button" onClick={() => void openPdf()} disabled={!ready || busy}>
          <FileDown size={16} />{busy ? "Gerando PDF…" : "Exportar PDF"}
        </button>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
    </section>
  );
}
