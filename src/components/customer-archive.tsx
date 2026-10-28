"use client";

import { useMemo, useState } from "react";
import { dateFull } from "@/lib/data";
import { archiveMatches, buildArchive, matchesServiceGroup, serviceGroups } from "@/modules/painel/customer-archive";
import { useGarro } from "@/lib/store";
import { Badge, Empty, Metric, SearchBox, ViewTitle } from "./Ui";

const filters = ["Todos", "Leads", "Clientes", "No funil", "Fechado com sucesso", "Fechado sem sucesso", "Com entrega"];

export function CustomerArchive() {
  const { state, role } = useGarro();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Todos");
  const [origin, setOrigin] = useState("Todas");
  const [attendant, setAttendant] = useState("Todas");
  const [service, setService] = useState("Todos");
  const [selected, setSelected] = useState<string | null>(null);
  const rows = useMemo(() => buildArchive(state), [state]);
  if (role !== "GESTOR_GARRO") return <div className="workspace"><ViewTitle eyebrow="GESTÃO" title="Banco de dados" description="Disponível somente para a Gestora."/><Empty text="Este mapa de contatos não está disponível para este perfil."/></div>;
  const origins = ["Todas", ...new Set(rows.map(item => item.origin).filter(Boolean))];
  const attendants = ["Todas", ...new Set(rows.flatMap(item => item.attendants))];
  const visible = rows.filter(item => {
    const text = `${item.name} ${item.phone} ${item.email} ${item.services.join(" ")} ${item.origin}`.toLowerCase();
    return archiveMatches(item, filter) && matchesServiceGroup(item.services, service) && text.includes(query.toLowerCase()) && (origin === "Todas" || item.origin === origin) && (attendant === "Todas" || item.attendants.includes(attendant));
  });
  const current = visible.find(item => item.id === selected) || null;
  const byOrigin = origins.filter(item => item !== "Todas").map(item => ({ item, count: rows.filter(row => row.origin === item).length }));
  return <div className="workspace">
    <ViewTitle eyebrow="GESTÃO / MEMÓRIA" title="Banco de dados" description="Todos os leads e clientes que passaram pela Garro, com o histórico do kanban até a entrega."/>
    <div className="metric-grid five">
      <Metric name="Contatos" value={rows.length} foot="Leads e clientes"/>
      <Metric name="Leads" value={rows.filter(item => item.kind === "Lead").length} foot="Ainda não contrataram"/>
      <Metric name="Clientes" value={rows.filter(item => item.kind === "Cliente").length} foot="Já contrataram"/>
      <Metric name="Com entrega" value={rows.filter(item => item.situation === "Entregue").length} foot="Produção entregue"/>
      <Metric name="Sem sucesso" value={rows.filter(item => item.situation === "Fechado sem sucesso").length} foot="Base para resgate"/>
    </div>
    <section className="surface archive-segments" aria-label="Segmentos para campanha">
      <h2>Segmentos</h2>
      <div className="archive-chips">{byOrigin.map(item => <span key={item.item}>{item.item}<strong>{item.count}</strong></span>)}{byOrigin.length === 0 && <span>Nenhuma origem registrada</span>}</div>
    </section>
    <div className="board-toolbar">
      <SearchBox value={query} onChange={setQuery} placeholder="Buscar nome, telefone, e-mail ou serviço"/>
      <select aria-label="Filtrar situação" value={filter} onChange={event => setFilter(event.target.value)}>{filters.map(item => <option key={item}>{item}</option>)}</select>
      <select aria-label="Filtrar origem" value={origin} onChange={event => setOrigin(event.target.value)}>{origins.map(item => <option key={item}>{item}</option>)}</select>
      <select aria-label="Filtrar atendente" value={attendant} onChange={event => setAttendant(event.target.value)}>{attendants.map(item => <option key={item}>{item}</option>)}</select>
      <select aria-label="Filtrar serviço" value={service} onChange={event => setService(event.target.value)}><option value="Todos">Serviço</option>{serviceGroups.map(item => <option key={item.label} value={item.label}>{item.label}</option>)}</select>
    </div>
    <div className="archive-layout">
      <div className="surface table-wrapper">
        <div className="table-scroll"><table>
          <thead><tr><th>Contato</th><th>Situação</th><th>Origem</th><th>Atendente</th><th>Último registro</th></tr></thead>
          <tbody>{visible.map(item => <tr key={item.id} className={item.id === current?.id ? "archive-selected" : ""} onClick={() => setSelected(item.id)}>
            <td><strong>{item.name}</strong><small>{item.kind}{item.phone ? ` · ${item.phone}` : ""}</small></td>
            <td><Badge>{item.situation}</Badge></td>
            <td>{item.origin}</td>
            <td>{item.attendants.join(", ") || "—"}</td>
            <td>{dateFull(item.lastAt)}</td>
          </tr>)}{visible.length === 0 && <tr><td colSpan={5}><Empty text="Nenhum contato neste recorte."/></td></tr>}</tbody>
        </table></div>
      </div>
      <aside className="surface archive-detail">{current ? <>
        <div className="eyebrow">HISTÓRICO</div>
        <h2>{current.name}</h2>
        <p>{[current.email, current.phone, current.company].filter(Boolean).join(" · ") || "Sem telefone ou e-mail"}</p>
        <div className="archive-facts"><span>{current.kind}</span><span>{current.origin}</span><span>{current.situation}</span></div>
        {current.services.length > 0 && <p>Serviços: {current.services.join(", ")}</p>}
        {current.notes && <p>{current.notes}</p>}
        <div className="archive-timeline">{current.events.map((event, index) => <article key={`${event.at}-${index}`}>
          <small>{dateFull(event.at)} · {event.label}{event.author ? ` · ${event.author}` : ""}</small>
          <p>{event.detail}</p>
        </article>)}{current.events.length === 0 && <Empty text="Ainda não há movimento no kanban para este contato."/>}</div>
      </> : <Empty text="Selecione um contato para ver o caminho dele na Garro."/>}</aside>
    </div>
  </div>;
}
