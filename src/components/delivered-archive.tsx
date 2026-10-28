"use client";

import { useMemo, useState } from "react";
import { deliveredRecords } from "@/lib/production-board";
import { useGarro } from "@/lib/store";
import { formatMonth, formatPeriodDay, saoPauloDay } from "@/modules/reports/delivery-statement";
import { Modal } from "./Ui";

export function DeliveredArchive({ onClose }: { onClose: () => void }) {
  const { state } = useGarro();
  const [year, setYear] = useState("Todos");
  const [customerId, setCustomerId] = useState("Todos");
  const [picked, setPicked] = useState<string[]>([]);
  const rows = useMemo(
    () => deliveredRecords(state.demands, state.deliverables, state.customers),
    [state.demands, state.deliverables, state.customers],
  );
  const years = [...new Set(rows.map((row) => row.year).filter(Boolean))].sort().reverse();
  const clients = [...new Map(rows.map((row) => [row.customerId, row.customerName])).entries()]
    .sort((left, right) => left[1].localeCompare(right[1], "pt-BR"));
  const visible = rows.filter((row) => (year === "Todos" || row.year === year) && (customerId === "Todos" || row.customerId === customerId));
  const months = [...new Set(visible.map((row) => row.month || "sem-data"))].sort().reverse();

  function toggle(id: string) {
    setPicked((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function openPdf(ids: string[]) {
    if (!ids.length) return;
    const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
    const params = new URLSearchParams({ demandIds: ids.join(","), imprimir: "1" });
    window.open(`${base}/painel/extrato?${params}`, "_blank", "noopener");
  }

  return (
    <Modal title="Entregues" description="Nada é apagado. O quadro mostra o mês escolhido; aqui fica o histórico." onClose={onClose} width="720px">
      <div className="archive-filters">
        <select aria-label="Filtrar ano" value={year} onChange={(event) => setYear(event.target.value)}>
          <option value="Todos">Todos os anos</option>
          {years.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select aria-label="Filtrar cliente" value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
          <option value="Todos">Todos os clientes</option>
          {clients.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
      </div>
      {visible.length === 0 && <p className="empty-state">Nenhuma entrega neste filtro.</p>}
      {months.map((month) => (
        <section key={month}>
          <h3 className="archive-month">{month === "sem-data" ? "Sem data de entrega" : formatMonth(month)}</h3>
          {visible.filter((row) => (row.month || "sem-data") === month).map((row) => (
            <div className="archive-row" key={row.id}>
              <input type="checkbox" aria-label={`Selecionar ${row.title}`} checked={picked.includes(row.id)} onChange={() => toggle(row.id)} />
              <button type="button" className="archive-open" onClick={() => openPdf([row.id])}>
                <strong>{row.title}</strong>
                <span>{row.customerName} · {row.done}</span>
              </button>
              <time dateTime={row.deliveredAt}>{row.deliveredAt ? formatPeriodDay(saoPauloDay(row.deliveredAt)) : "—"}</time>
            </div>
          ))}
        </section>
      ))}
      <div className="modal-footer">
        <button type="button" className="button primary" disabled={!picked.length} onClick={() => openPdf(picked)}>Exportar seleção</button>
      </div>
    </Modal>
  );
}
