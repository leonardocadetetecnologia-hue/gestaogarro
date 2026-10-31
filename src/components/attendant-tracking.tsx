"use client";

import { useMemo, useState } from "react";
import type { Deliverable } from "@/lib/data";
import { productionStages } from "@/lib/data";
import { currentProductionMonth, productionCards, productionMonthOptions, deliveredRecords } from "@/lib/production-board";
import { formatMonth } from "@/modules/reports/delivery-statement";
import { useGarro } from "@/lib/store";
import { BoardScroll } from "./board-scroll";
import { DeliverableStatusBar } from "./deliverable-status";
import { Badge, Deadline, Empty, SearchBox, ViewTitle } from "./Ui";

function stepOf(task: Deliverable) {
  if (task.status === "Em revisão") return { label: "Revisão", at: task.reviewDue, done: false };
  if (task.status === "Aprovado") return { label: "Cliente", at: task.clientDue, done: true };
  return { label: task.status === "Correção" ? "Correção" : "Edição", at: task.editorDue, done: false };
}

export function AttendantTracking() {
  const { state, role } = useGarro();
  const [query, setQuery] = useState("");
  const [month, setMonth] = useState(currentProductionMonth);
  const names = useMemo(
    () => [...new Map(state.demands.map((demand) => [demand.customerId, { id: demand.customerId, name: demand.customerName || "Cliente" }])).values()],
    [state.demands],
  );
  const cards = useMemo(
    () => productionCards({ demands: state.demands, deliverables: state.deliverables, customers: names, split: "projeto", kind: "Todos", editorId: "Todos", query, month }),
    [state.demands, state.deliverables, names, query, month],
  );
  const monthOptions = useMemo(
    () => productionMonthOptions(deliveredRecords(state.demands, state.deliverables, names).map((row) => row.month)),
    [state.demands, state.deliverables, names],
  );
  if (role !== "ATENDENTE") return <div className="workspace"><Empty text="O acompanhamento é da atendente." /></div>;

  return <div className="workspace">
    <ViewTitle eyebrow="PRODUÇÃO" title="Acompanhamento" description="Consulta o quadro da Gestora. Dá para ver o que está sendo feito, em que etapa está e qual o prazo." />
    <div className="board-toolbar">
      <div className="toolbar-start"><p className="service-note">Somente visualização. A edição continua com a Gestora.</p></div>
      <div className="toolbar-end">
        <SearchBox value={query} onChange={setQuery} placeholder="Buscar cliente ou demanda" />
        <select aria-label="Filtrar mês" value={month} onChange={(event) => setMonth(event.target.value)}>
          {monthOptions.map((item) => <option key={item} value={item}>{formatMonth(item)}</option>)}
        </select>
      </div>
    </div>
    {cards.length === 0 && query ? <Empty text="Nenhuma demanda encontrada para essa busca." /> : null}
    <BoardScroll className="production-grid" label="Etapas da produção" columns={productionStages.length}>
      {productionStages.map((status) => {
        const column = cards.filter((card) => card.column === status && card.split === "projeto");
        return <section className="production-column" key={status}>
          <div className="production-heading"><strong>{status}</strong><Badge>{column.length}</Badge></div>
          {column.map((card) => card.split === "projeto" ? <article className="production-card" key={card.id}>
            <small>{card.demand.customerName || "Cliente"}</small>
            <strong>{card.demand.title}</strong>
            {card.demand.service && card.demand.service !== card.demand.title ? <span>{card.demand.service}</span> : null}
            <DeliverableStatusBar tasks={card.tasks} />
            <div className="production-three"><div><span>Prazo do cliente</span><Deadline at={card.demand.clientDue} done={card.demand.status === "Entregue"} /></div></div>
            {card.tasks.length > 0 && <ul className="tracking-tasks">
              {card.tasks.map((task) => {
                const step = stepOf(task);
                return <li key={task.id}><span>{task.title}</span><Badge>{task.status}</Badge><small>{step.label}</small><Deadline at={step.at} done={step.done} /></li>;
              })}
            </ul>}
          </article> : null)}
          {column.length === 0 && <div className="empty-drop">Sem demandas</div>}
        </section>;
      })}
    </BoardScroll>
  </div>;
}
