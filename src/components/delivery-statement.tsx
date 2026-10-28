"use client";

import { useEffect, useState } from "react";
import { FileDown } from "lucide-react";
import { GarroBrand } from "./garro-brand";
import { StatementEditor } from "./statement-editor";
import { formatDeliveredAt, periodEnding, type StatementGroup, type StatementSection } from "@/modules/reports/delivery-statement";

type StatementResponse = {
  customers: { id: string; name: string }[];
  services: string[];
  sections: StatementSection[];
  total: number;
  example?: boolean;
};

export function DeliveryStatement() {
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const [customerId, setCustomerId] = useState("");
  const [service, setService] = useState("");
  const [group, setGroup] = useState<StatementGroup>("cliente");
  const [span, setSpan] = useState("all");
  const [month, setMonth] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [statement, setStatement] = useState<StatementResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams({ group });
    if (customerId) params.set("customerId", customerId);
    if (service) params.set("service", service);
    if (span === "month") {
      if (month) params.set("month", month);
    } else {
      if (from) params.set("from", from);
      if (to) params.set("to", to);
    }
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
  }, [base, customerId, service, group, span, month, from, to]);

  function changeSpan(value: string) {
    setSpan(value);
    if (value === "all" || value === "month" || value === "custom") {
      setFrom("");
      setTo("");
      if (value !== "month") setMonth("");
      return;
    }
    setMonth("");
    const period = periodEnding(Number(value));
    setFrom(period.from);
    setTo(period.to);
  }

  return (
    <section className="surface statement-panel">
      <div className="statement-brand"><GarroBrand size={52} wordmarkWidth={176} /></div>
      <div className="section-head">
        <div>
          <h2>Extrato de entregas</h2>
          <span>Somente demandas concluídas na produção. O documento descreve o que foi entregue e quando.</span>
        </div>
        <button className="button primary" type="button" onClick={() => setEditorOpen(true)} disabled={loading || statement?.total === 0}>
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
          <span>Período</span>
          <select aria-label="Filtrar extrato por período" value={span} onChange={event => changeSpan(event.target.value)}>
            <option value="all">Todo o período</option>
            <option value="3">Últimos 3 meses</option>
            <option value="6">Últimos 6 meses</option>
            <option value="12">Últimos 12 meses</option>
            <option value="month">Um mês</option>
            <option value="custom">Datas específicas</option>
          </select>
        </label>
        {span === "month" && (
          <label className="field">
            <span>Mês</span>
            <input aria-label="Mês do extrato" type="month" value={month} onChange={event => setMonth(event.target.value)} />
          </label>
        )}
        {span === "custom" && <>
          <label className="field">
            <span>De</span>
            <input aria-label="Início do período" type="date" value={from} onChange={event => setFrom(event.target.value)} />
          </label>
          <label className="field">
            <span>Até</span>
            <input aria-label="Fim do período" type="date" value={to} onChange={event => setTo(event.target.value)} />
          </label>
        </>}
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
        {!loading && !error && statement?.example && <p className="statement-example">Modelo ilustrativo. Estes nomes não são clientes da Garro. Quando a primeira entrega for concluída, o extrato passa a usar os dados reais.</p>}
        {!loading && !error && !statement?.example && statement?.total === 0 && <p className="empty-state">Nenhuma entrega concluída neste filtro.</p>}
        {!loading && !error && statement?.sections.map(section => (
          <article key={section.label}>
            <h3>{section.label}</h3>
            <ul>
              {section.activities.map(activity => (
                <li key={activity.id}>
                  <div>
                    <strong>{activity.number ? `${activity.number}. ${activity.title}` : activity.title}</strong>
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
      {editorOpen && statement && <StatementEditor activities={statement.sections.flatMap((section) => section.activities)} onClose={() => setEditorOpen(false)} />}
    </section>
  );
}
