"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, ChevronLeft, ChevronRight, Clock3, Search, UserRound } from "lucide-react";
import { agendaDayKey, agendaOriginLink, agendaTiming, calendarDays, nextCalendarFocus, type AgendaMode } from "@/lib/agenda";
import { dateFull, type ScheduleItem } from "@/lib/data";
import { useGarro } from "@/lib/store";
import { AttendantTaskActions, PersonalTaskButton } from "./attendant-tasks";
import { Empty, Metric, Modal, ViewTitle } from "./Ui";
import styles from "./agenda.module.css";

const modes: { key: AgendaMode; label: string }[] = [{ key: "dia", label: "Dia" }, { key: "semana", label: "Semana" }, { key: "mes", label: "Mês" }, { key: "lista", label: "Lista" }];
const categories = ["Comercial", "Editor", "Revisão", "Cliente", "Gestão"] as const;
const categoryStyle = { Comercial: "commercial", Editor: "editor", Revisão: "review", Cliente: "client", Gestão: "management" };
const time = (value: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
const labelDate = (key: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("pt-BR", { ...options, timeZone: "UTC" }).format(new Date(`${key}T12:00:00Z`));
const searchText = (text: string) => text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const responsibleLabel = (event: ScheduleItem) => `${event.responsibleRole === "GESTOR_GARRO" ? "Gestora" : event.responsibleRole === "ATENDENTE" ? "Atendente" : event.responsibleRole === "EDITOR" ? "Editor" : "Responsável"} · ${event.responsibleName || "Não informado"}`;

function EventCard({ event, onOpen, compact = false }: { event: ScheduleItem; onOpen: () => void; compact?: boolean }) {
  const status = agendaTiming(event);
  return <button type="button" className={`${styles.event} ${styles[categoryStyle[event.category]]} ${compact ? styles.compact : ""}`} onClick={onOpen} aria-label={`Ver detalhes: ${event.title}, ${dateFull(event.at)}`}>
    <span className={styles.eventTop}><span className={styles.eventTime}><Clock3 size={12}/>{time(event.at)}</span><span className={`${styles.status} ${status.tone === "neutral" ? "" : styles[status.tone]}`}>{status.label}</span></span>
    <strong className={styles.eventTitle}>{event.title}</strong>
    <span className={styles.eventMeta}>{event.typeLabel || event.category}{event.customerName ? ` · ${event.customerName}` : ""}</span>
    <span className={styles.eventBottom}><span>{event.origin || "Agenda"}</span>{event.responsibleName && <span className={styles.responsible}><UserRound size={12}/>{responsibleLabel(event)}</span>}</span>
  </button>;
}

export function AgendaView() {
  const { state, role, activeEditorId } = useGarro();
  const [mode, setMode] = useState<AgendaMode>("semana");
  const [focus, setFocus] = useState(() => agendaDayKey(new Date()));
  const [filter, setFilter] = useState("Todos");
  const [responsible, setResponsible] = useState("Todos");
  const [query, setQuery] = useState("");
  const [showDone, setShowDone] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    const saved = Number(localStorage.getItem("garro-agenda-zoom"));
    if (saved >= 0.8 && saved <= 1.2) setZoom(saved);
  }, []);
  function changeZoom(value: number) {
    const next = Math.min(1.2, Math.max(0.8, value));
    setZoom(next);
    localStorage.setItem("garro-agenda-zoom", String(next));
  }
  useEffect(() => { if (window.matchMedia("(max-width: 767px)").matches) setMode("lista"); }, []);
  const allowed = state.schedule.filter(e => role === "GESTOR_GARRO" || e.userId === activeEditorId);
  const items = allowed.filter(e => (showDone || !e.done) && (filter === "Todos" || e.category === filter) && (responsible === "Todos" || e.userId === responsible) && searchText(`${e.title} ${e.customerName || ""} ${e.responsibleName || ""} ${e.origin || ""}`).includes(searchText(query))).sort((a,b) => a.at.localeCompare(b.at));
  const days = useMemo(() => calendarDays(focus, mode), [focus, mode]);
  const today = agendaDayKey(new Date());
  const owners = [...new Map(allowed.map(e => [e.userId, e.responsibleName || "Responsável"])).entries()];
  const event = state.schedule.find(e => e.id === selected);
  const origin = event ? agendaOriginLink(event) : null;
  const period = mode === "semana" ? `${labelDate(days[0], { day: "2-digit", month: "short" })} — ${labelDate(days[6], { day: "2-digit", month: "short", year: "numeric" })}` : labelDate(focus, mode === "mes" ? { month: "long", year: "numeric" } : { day: "2-digit", month: "long", year: "numeric" });
  const listGroups = [...new Set(items.map(e => agendaDayKey(e.at)))];

  return <div className={`workspace ${styles.workspace}`}>
    <ViewTitle eyebrow="PRAZOS / COMPROMISSOS" title={role === "GESTOR_GARRO" ? "Agenda Global" : role === "ATENDENTE" ? "Agenda Comercial" : "Minha Agenda"} description="Compromissos claros, responsáveis e acesso ao registro de origem." actions={<PersonalTaskButton />}/>
    <div className={`metric-grid three ${styles.metrics}`}>
      <Metric name="Compromissos pendentes" value={allowed.filter(e => !e.done).length}/>
      <Metric name="Atrasados" value={allowed.filter(e => !e.done && new Date(e.at).getTime() < Date.now()).length}/>
      <Metric name="Hoje" value={allowed.filter(e => !e.done && agendaDayKey(e.at) === today).length}/>
    </div>
    <section className={`surface ${styles.surface}`} style={{ ["--agenda-zoom" as string]: zoom }}>
      <div className={styles.toolbar}>
        <div className={styles.calendarTitle}><CalendarDays size={25}/><div><h2>Calendário de compromissos</h2><p>Clique em um compromisso para ver detalhes e origem.</p></div></div>
        <div className={styles.toolbarEnd}>
          <label className={styles.zoom}>Zoom<input aria-label="Zoom da agenda" type="range" min="0.8" max="1.2" step="0.05" value={zoom} onChange={e => changeZoom(Number(e.target.value))}/></label>
          <div className={styles.modeBar} role="group" aria-label="Visualização da agenda">{modes.map(item => <button type="button" key={item.key} aria-pressed={mode === item.key} className={mode === item.key ? styles.activeMode : ""} onClick={() => setMode(item.key)}>{item.label}</button>)}</div>
        </div>
      </div>
      <div className={styles.filters}>
        <label className={styles.search}><Search size={18}/><input aria-label="Buscar compromisso, cliente ou responsável" placeholder="Buscar compromisso, cliente ou responsável" value={query} onChange={e => setQuery(e.target.value)}/></label>
        <select aria-label="Filtrar tipo de compromisso" value={filter} onChange={e => setFilter(e.target.value)}><option value="Todos">Todos os tipos</option>{categories.map(c => <option key={c}>{c}</option>)}</select>
        {role === "GESTOR_GARRO" && <select aria-label="Filtrar responsável" value={responsible} onChange={e => setResponsible(e.target.value)}><option value="Todos">Todos os responsáveis</option>{owners.map(([id, name]) => <option value={id} key={id}>{name}</option>)}</select>}
        <label className={styles.doneFilter}><input type="checkbox" checked={showDone} onChange={e => setShowDone(e.target.checked)}/>Exibir concluídos</label>
      </div>
      <div className={styles.navigation}>
        <div className={styles.navigateButtons}><button type="button" className="icon-button" aria-label="Período anterior" onClick={() => setFocus(nextCalendarFocus(focus, mode, -1))}><ChevronLeft size={20}/></button><button type="button" className="button secondary" onClick={() => setFocus(today)}>Hoje</button><button type="button" className="icon-button" aria-label="Próximo período" onClick={() => setFocus(nextCalendarFocus(focus, mode, 1))}><ChevronRight size={20}/></button></div>
        <h3>{mode === "lista" ? "Compromissos por data" : period}</h3>
        <div className={styles.legend}>{categories.map(c => <span key={c}><i className={styles[categoryStyle[c]]}/>{c}</span>)}</div>
      </div>
      {mode === "lista" ? <div className={styles.list}>
        {listGroups.length === 0 && <Empty text="Nenhum compromisso encontrado para estes filtros."/>}
        {listGroups.map(key => <section className={styles.listDay} key={key}><h3>{labelDate(key, { weekday: "long", day: "2-digit", month: "long" })}{key === today && <span>Hoje</span>}</h3><div className={styles.listEvents}>{items.filter(e => agendaDayKey(e.at) === key).map(e => <EventCard key={e.id} event={e} onOpen={() => setSelected(e.id)}/>)}</div></section>)}
      </div> : <div className={styles.calendarScroll}>
        <div className={`${styles.calendar} ${mode === "mes" ? styles.month : mode === "dia" ? styles.day : styles.week}`}>
          {days.map(key => {
            const events = items.filter(e => agendaDayKey(e.at) === key);
            return <section className={`${styles.dayColumn} ${key === today ? styles.today : ""} ${mode === "mes" && key.slice(0,7) !== focus.slice(0,7) ? styles.otherMonth : ""}`} key={key}>
              <header className={styles.dayHeader}><span>{labelDate(key, { weekday: "short" })}</span><strong>{Number(key.slice(-2))}</strong><small>{events.length} {events.length === 1 ? "compromisso" : "compromissos"}</small></header>
              <div className={styles.dayEvents}>
                {events.map(e => <EventCard key={e.id} event={e} compact={mode === "mes"} onOpen={() => setSelected(e.id)}/>)}
                {events.length === 0 && <p className={styles.emptyDay}>Sem compromissos</p>}
              </div>
            </section>;
          })}
        </div>
      </div>}
    </section>
    {event && <Modal title="Detalhes do compromisso" description={event.typeLabel || event.category} width="700px" onClose={() => setSelected(null)}>
      <div className={styles.eventDetail}>
        <div className={styles.detailHeading}><h3>{event.title}</h3><span className={`${styles.status} ${agendaTiming(event).tone === "neutral" ? "" : styles[agendaTiming(event).tone]}`}>{agendaTiming(event).label}</span></div>
        <dl className={styles.detailGrid}>
          <div><dt>Data e horário de Brasília</dt><dd>{dateFull(event.at)}</dd></div>
          <div><dt>Responsável</dt><dd>{responsibleLabel(event)}</dd></div>
          <div><dt>Cliente</dt><dd>{event.customerName || "Não vinculado"}</dd></div>
          <div><dt>Origem</dt><dd>{event.origin || "Agenda"} · {event.typeLabel || event.category}</dd></div>
          {event.createdAt && <div><dt>Registro criado em</dt><dd>{dateFull(event.createdAt)}</dd></div>}
        </dl>
        {event.context && <div className={styles.context}><h4>Contexto do atendimento ou projeto</h4><p>{event.context}</p></div>}
        <div className="modal-footer"><button type="button" className="button secondary" onClick={() => setSelected(null)}>Fechar detalhes</button><AttendantTaskActions event={event} onDone={() => setSelected(null)} />{origin && <Link className="button primary" href={origin.href} onClick={() => setSelected(null)}>{origin.label}<ArrowUpRight size={17}/></Link>}</div>
      </div>
    </Modal>}
  </div>;
}
