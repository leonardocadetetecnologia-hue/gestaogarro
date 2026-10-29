"use client";

import { useMemo, useState } from "react";
import { dateFull, type AttendantActivity } from "@/lib/data";
import { monitorSummary } from "@/modules/painel/attendant-monitor";
import { useGarro } from "@/lib/store";
import { Badge, Empty, Metric, ViewTitle } from "./Ui";

const kinds = [
  { id: "tudo", label: "Tudo" },
  { id: "acesso", label: "Acesso" },
  { id: "movimentacao", label: "Movimento" },
  { id: "inclusao", label: "Inclusão" },
  { id: "alteracao", label: "Alteração" },
] as const;

const periods = [
  { id: "1", label: "Hoje", days: 1 },
  { id: "7", label: "7 dias", days: 7 },
  { id: "30", label: "30 dias", days: 30 },
  { id: "90", label: "90 dias", days: 90 },
] as const;

const kindLabel: Record<AttendantActivity["kind"], string> = {
  acesso: "Acesso",
  movimentacao: "Movimento",
  inclusao: "Inclusão",
  alteracao: "Alteração",
};

function periodStart(days: number) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const start = new Date(`${today}T00:00:00-03:00`);
  start.setTime(start.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
  return start;
}

export function AttendantMonitor() {
  const { role, state } = useGarro();
  const [period, setPeriod] = useState<(typeof periods)[number]["id"]>("7");
  const [attendant, setAttendant] = useState("Todas");
  const [kind, setKind] = useState<(typeof kinds)[number]["id"]>("tudo");
  const activity = state.activity ?? [];
  const days = periods.find((item) => item.id === period)?.days ?? 7;
  const visible = useMemo(() => {
    const start = periodStart(days).getTime();
    return activity.filter((item) => Date.parse(item.at) >= start && (attendant === "Todas" || item.attendantName === attendant) && (kind === "tudo" || item.kind === kind));
  }, [activity, days, attendant, kind]);
  if (role !== "GESTOR_GARRO") return <div className="workspace"><ViewTitle eyebrow="GESTÃO" title="Monitoramento" description="Disponível somente para a Gestora."/><Empty text="Este acompanhamento não está disponível para este perfil."/></div>;
  const people = monitorSummary(visible);
  const names = ["Todas", ...new Set(activity.map((item) => item.attendantName))];
  return <div className="workspace">
    <ViewTitle eyebrow="GESTÃO / ACOMPANHAMENTO" title="Monitoramento" description="Entrada, saída e o que cada atendente incluiu, alterou ou moveu no Kanban. A saída aparece quando ela clica em Sair. Os últimos 90 dias."/>
    <div className="metric-grid five">
      <Metric name="Entradas" value={visible.filter((item) => item.title === "Entrou").length} foot="Logins no período"/>
      <Metric name="Saídas" value={visible.filter((item) => item.title === "Saiu").length} foot="Cliques em Sair"/>
      <Metric name="Movimentos" value={visible.filter((item) => item.kind === "movimentacao").length} foot="Cards e conclusões"/>
      <Metric name="Inclusões" value={visible.filter((item) => item.kind === "inclusao").length} foot="Contatos e registros"/>
      <Metric name="Alterações" value={visible.filter((item) => item.kind === "alteracao").length} foot="Cadastro, valor e retorno"/>
    </div>
    <div className="board-toolbar">
      <div className="segmented" aria-label="Período">
        {periods.map((item) => <button type="button" key={item.id} className={period === item.id ? "active" : ""} onClick={() => setPeriod(item.id)}>{item.label}</button>)}
      </div>
      <select aria-label="Filtrar atendente" value={attendant} onChange={(event) => setAttendant(event.target.value)}>{names.map((item) => <option key={item}>{item}</option>)}</select>
      <select aria-label="Filtrar tipo" value={kind} onChange={(event) => setKind(event.target.value as (typeof kinds)[number]["id"])}>{kinds.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
    </div>
    <div className="monitor-people">
      {people.map((person) => <article key={person.id} className="surface">
        <strong>{person.name}</strong>
        <span>Última entrada: {dateFull(person.lastLogin)}</span>
        <span>Última saída: {dateFull(person.lastLogout)}</span>
        <span>{person.moves} movimentos · {person.inclusions} inclusões · {person.edits} alterações</span>
      </article>)}
      {people.length === 0 && <Empty text="Nenhuma atendente com movimento neste recorte."/>}
    </div>
    <div className="surface table-wrapper">
      <div className="table-scroll"><table>
        <thead><tr><th>Quando</th><th>Atendente</th><th>Tipo</th><th>O que aconteceu</th></tr></thead>
        <tbody>
          {visible.map((item) => <tr key={item.id}>
            <td>{dateFull(item.at)}</td>
            <td>{item.attendantName}</td>
            <td><Badge>{kindLabel[item.kind]}</Badge></td>
            <td><strong>{item.title}</strong>{item.detail ? <small>{item.detail}</small> : null}</td>
          </tr>)}
          {visible.length === 0 && <tr><td colSpan={4}><Empty text="Nenhum movimento neste recorte."/></td></tr>}
        </tbody>
      </table></div>
    </div>
  </div>;
}
