"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, ClipboardList, FolderOpen, Plus } from "lucide-react";
import { productionStages } from "@/lib/data";
import { demandMediaTypeLabel } from "@/lib/demand-media-type";
import { currentProductionMonth, productionCards, productionKindOptions, type ProductionCard, type ProductionKind, type ProductionSplit } from "@/lib/production-board";
import { useGarro } from "@/lib/store";
import { BoardScroll } from "./board-scroll";
import { DeliverableStatusBar } from "./deliverable-status";
import { DeliveredArchive } from "./delivered-archive";
import { NewDemandModal } from "./new-demand";
import { Badge, Deadline, Empty, SearchBox, ViewTitle } from "./Ui";

function statusTone(status: string) {
  if (status === "Correção") return "danger";
  if (status === "Aprovado" || status === "Aprovada" || status === "Entregue") return "success";
  if (status.includes("revisão")) return "attention";
  if (status.includes("produção") || status.includes("edição")) return "info";
  return "neutral";
}

function customerName(customers: { id: string; name: string }[], id: string) {
  return customers.find((item) => item.id === id)?.name || "Cliente não informado";
}

function typeSuffix(mediaType?: string | null) {
  const label = demandMediaTypeLabel(mediaType);
  return label ? ` · ${label}` : "";
}

export function ProductionBoard({
  initialSplit = "projeto",
  initialKind = "Todos",
  initialView = "kanban",
}: {
  initialSplit?: ProductionSplit;
  initialKind?: "Todos" | ProductionKind;
  initialView?: "kanban" | "lista";
}) {
  const [newOpen, setNewOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const { state, role } = useGarro();
  const router = useRouter();
  const [editorId, setEditorId] = useState("Todos");
  const [kind, setKind] = useState<"Todos" | ProductionKind>(initialKind);
  const [month, setMonth] = useState(currentProductionMonth);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"kanban" | "lista">(initialView);
  const [split, setSplit] = useState<ProductionSplit>(initialSplit);
  const cards = useMemo(
    () => productionCards({ demands: state.demands, deliverables: state.deliverables, customers: state.customers, split, kind, editorId, query, month }),
    [state.demands, state.deliverables, state.customers, split, kind, editorId, query, month],
  );
  const openDemand = (id: string) => router.push(`/painel/demanda?id=${id}`);

  return <div className="workspace">
    <ViewTitle eyebrow="GESTÃO / PRODUÇÃO" title="Demandas de Produção" description="Organize entregas, editores, revisão e compromissos com clientes." actions={<button className="button primary" onClick={() => setNewOpen(true)}><Plus size={16} />Nova demanda</button>} />
    <div className="board-toolbar">
      <div className="toolbar-start">
        <div className="segmented">
          <button type="button" className={view === "kanban" ? "active" : ""} onClick={() => setView("kanban")}>Kanban</button>
          <button type="button" className={view === "lista" ? "active" : ""} onClick={() => setView("lista")}>Lista</button>
        </div>
        <div className="segmented" aria-label="Separar por">
          <button type="button" className={split === "projeto" ? "active" : ""} onClick={() => setSplit("projeto")}>Projeto</button>
          <button type="button" className={split === "entregavel" ? "active" : ""} onClick={() => setSplit("entregavel")}>Entregável</button>
        </div>
        {role === "GESTOR_GARRO" && <button type="button" className="button secondary" onClick={() => setArchiveOpen(true)}>Entregues</button>}
      </div>
      <div className="toolbar-end">
        <SearchBox value={query} onChange={setQuery} placeholder={split === "entregavel" ? "Buscar entregável" : "Buscar demanda"} />
        <input aria-label="Filtrar mês" type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
        <select aria-label="Filtrar tipo" value={kind} onChange={(event) => setKind(event.target.value as "Todos" | ProductionKind)}>
          <option value="Todos">Todos os tipos</option>
          {productionKindOptions.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select aria-label="Filtrar editor" value={editorId} onChange={(event) => setEditorId(event.target.value)}>
          <option value="Todos">Todos os editores</option>
          {state.editors.map((editor) => <option key={editor.id} value={editor.id}>{editor.name}{editor.role === "GESTOR_GARRO" ? " (Gestora)" : ""}</option>)}
        </select>
      </div>
    </div>
    {view === "kanban" ? <BoardScroll className="production-grid" label="Etapas da produção">{productionStages.map((status) => {
      const column = cards.filter((card) => card.column === status);
      return <section className="production-column" key={status}>
        <div className="production-heading"><strong>{status}</strong><Badge>{column.length}</Badge></div>
        {column.map((card) => card.split === "projeto"
          ? <ProjectCard key={card.id} card={card} customer={customerName(state.customers, card.demand.customerId)} onOpen={openDemand} />
          : <DeliverableCard key={card.id} card={card} customer={customerName(state.customers, card.demand.customerId)} editorName={state.editors.find((editor) => editor.id === card.task.editorId)?.name} onOpen={openDemand} />)}
        {column.length === 0 && <div className="empty-drop">{split === "entregavel" ? "Sem entregáveis" : "Sem demandas"}</div>}
      </section>;
    })}</BoardScroll> : <div className="surface"><BoardList cards={cards} customers={state.customers} editors={state.editors} onOpen={openDemand} /></div>}
    {newOpen && <NewDemandModal onClose={() => setNewOpen(false)} />}
    {archiveOpen && <DeliveredArchive onClose={() => setArchiveOpen(false)} />}
  </div>;
}

function ProjectCard({ card, customer, onOpen }: { card: Extract<ProductionCard, { split: "projeto" }>; customer: string; onOpen: (id: string) => void }) {
  const { demand, tasks } = card;
  const count = `${tasks.length} ${tasks.length === 1 ? "entregável" : "entregáveis"}`;
  return <button type="button" className="production-card" onClick={() => onOpen(demand.id)}>
    <small>{customer}</small>
    <strong>{demand.title}</strong>
    <span>{count}{demand.service && demand.service !== demand.title ? ` · ${demand.service}` : ""}{typeSuffix(demand.mediaType)}</span>
    <DeliverableStatusBar tasks={tasks} />
    <div className="production-three">
      <div><span>Editor</span><Deadline at={tasks[0]?.editorDue} done={tasks[0]?.status === "Em revisão" || tasks[0]?.status === "Aprovado"} /></div>
      <div><span>Revisão</span><Deadline at={tasks[0]?.reviewDue} done={tasks[0]?.status === "Aprovado"} /></div>
      <div><span>Cliente</span><Deadline at={demand.clientDue} done={demand.status === "Entregue"} /></div>
    </div>
    <div className="production-card-foot"><span>Ver demanda</span><ChevronRight size={16} /></div>
  </button>;
}

function DeliverableCard({ card, customer, editorName, onOpen }: { card: Extract<ProductionCard, { split: "entregavel" }>; customer: string; editorName?: string; onOpen: (id: string) => void }) {
  const { demand, task } = card;
  const delivered = Boolean(task.clientDeliveredAt) || demand.status === "Entregue";
  return <button type="button" className="production-card" onClick={() => onOpen(demand.id)}>
    <small>{customer}</small>
    <strong>{task.title}</strong>
    <span>{demand.title}{typeSuffix(demand.mediaType)}{editorName ? ` · ${editorName}` : ""}</span>
    <div className="production-three">
      <div><span>Editor</span><Deadline at={task.editorDue} done={task.status === "Em revisão" || task.status === "Aprovado"} /></div>
      <div><span>Revisão</span><Deadline at={task.reviewDue} done={task.status === "Aprovado"} /></div>
      <div><span>Cliente</span><Deadline at={task.clientDue || demand.clientDue} done={delivered && task.status === "Aprovado"} /></div>
    </div>
    <div className="production-card-foot"><span>Ver demanda</span><ChevronRight size={16} /></div>
  </button>;
}

function BoardList({ cards, customers, editors, onOpen }: { cards: ProductionCard[]; customers: { id: string; name: string }[]; editors: { id: string; name: string }[]; onOpen: (id: string) => void }) {
  if (!cards.length) return <Empty text="Nenhum item com esse filtro." />;
  return <div className="list-stack">{cards.map((card) => {
    if (card.split === "projeto") {
      const tasks = card.tasks;
      return <button type="button" key={card.id} className="row-item clickable" onClick={() => onOpen(card.demand.id)}>
        <span className="circle-icon"><FolderOpen size={18} /></span>
        <div className="row-main">
          <strong>{card.demand.title}</strong>
          <span>{customerName(customers, card.demand.customerId)} · {tasks.length} {tasks.length === 1 ? "entregável" : "entregáveis"}{card.demand.service && card.demand.service !== card.demand.title ? ` · ${card.demand.service}` : ""}{typeSuffix(card.demand.mediaType)}</span>
          <DeliverableStatusBar tasks={tasks} />
        </div>
        <Badge kind={statusTone(card.demand.status)}>{card.demand.status}</Badge>
        <Deadline at={card.demand.clientDue} done={card.demand.status === "Entregue"} />
        <ChevronRight size={15} className="muted" />
      </button>;
    }
    const delivered = Boolean(card.task.clientDeliveredAt) || (card.task.status === "Aprovado" && card.demand.status === "Entregue");
    const label = delivered ? "Entregue" : card.task.status;
    const editorName = editors.find((editor) => editor.id === card.task.editorId)?.name;
    return <button type="button" key={card.id} className="row-item clickable" onClick={() => onOpen(card.demand.id)}>
      <span className="circle-icon"><ClipboardList size={18} /></span>
      <div className="row-main">
        <strong>{card.task.title}</strong>
        <span>{customerName(customers, card.demand.customerId)} · {card.demand.title}{typeSuffix(card.demand.mediaType)}{editorName ? ` · ${editorName}` : ""}</span>
      </div>
      <Badge kind={statusTone(label)}>{label}</Badge>
      <Deadline at={card.task.editorDue} done={card.task.status === "Aprovado"} />
      <ChevronRight size={15} className="muted" />
    </button>;
  })}</div>;
}
