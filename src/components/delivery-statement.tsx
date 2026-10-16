"use client";

import { useEffect, useState } from "react";
import { FileDown } from "lucide-react";
import { formatDeliveredAt, type StatementGroup, type StatementSection } from "@/modules/reports/delivery-statement";

type StatementResponse = {
  customers: { id: string; name: string }[];
  services: string[];
  sections: StatementSection[];
  total: number;
};

export function DeliveryStatement() {
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const [customerId, setCustomerId] = useState("");
  const [service, setService] = useState("");
  const [group, setGroup] = useState<StatementGroup>("cliente");
  const [statement, setStatement] = useState<StatementResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams({ group });
    if (customerId) params.set("customerId", customerId);
    if (service) params.set("service", service);
    const controller = new AbortController();
    setLoading(true);
    fetch(`${base}/api/reports/delivery-statement?${params}`, { cache: "no-store", signal: controller.signal })
      .then(async response => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || "Não foi possível carregar o extrato.");
        setStatement(body);
        setError("");
      })
      .catch(reason => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(reason instanceof Error ? reason.message : "Não foi possível carregar o extrato.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [base, customerId, service, group]);

  function openPdf() {
    const params = new URLSearchParams({ group, imprimir: "1" });
    if (customerId) params.set("customerId", customerId);
    if (service) params.set("service", service);
    window.open(`${base}/painel/extrato?${params}`, "_blank", "noopener");
  }

  return (
    <section className="surface statement-panel">
      <div className="section-head">
        <div>
          <h2>Extrato de entregas</h2>
          <span>Somente demandas concluídas na produção. O documento descreve o que foi entregue e quando.</span>
        </div>
        <button className="button primary" type="button" onClick={openPdf} disabled={loading || !statement?.total}>
          <FileDown size={16} />Gerar PDF
        </button>
      </div>
      <div className="statement-filters">
        <label className="field">
          <span>Cliente</span>
          <select aria-label="Filtrar extrato por cliente" value={customerId} onChange={event => setCustomerId(event.target.value)}>
            <option value="">Todos os clientes</option>
            {statement?.customers.map(customer => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Tipo de entrega</span>
          <select aria-label="Filtrar extrato por tipo de entrega" value={service} onChange={event => setService(event.target.value)}>
            <option value="">Todos os tipos</option>
            {statement?.services.map(item => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Agrupar</span>
          <select aria-label="Agrupar extrato" value={group} onChange={event => setGroup(event.target.value as StatementGroup)}>
            <option value="cliente">Por cliente</option>
            <option value="servico">Por tipo de entrega</option>
          </select>
        </label>
      </div>
      <div className="statement-body">
        {error && <p className="form-error">{error}</p>}
        {loading && <p className="muted">Carregando entregas concluídas…</p>}
        {!loading && !error && statement?.total === 0 && <p className="empty-state">Nenhuma entrega concluída neste filtro.</p>}
        {!loading && !error && statement?.sections.map(section => (
          <article key={section.label}>
            <h3>{section.label}</h3>
            <ul>
              {section.activities.map(activity => (
                <li key={activity.id}>
                  <div>
                    <strong>{activity.title}</strong>
                    <span>{group === "cliente" ? activity.service : activity.customerName}</span>
                  </div>
                  <p>{activity.description}</p>
                  <time dateTime={activity.deliveredAt}>{formatDeliveredAt(activity.deliveredAt)}</time>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
