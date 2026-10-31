"use client";

import { useState, type FormEvent } from "react";
import type { CatalogService } from "@/lib/data";
import { dateFull } from "@/lib/data";
import { useGarro } from "@/lib/store";
import {
  categoryLabel, deliveryLabel, eventHourDiscount, moneyLabel, priceTypeLabel, recurrenceLabel,
  serviceCategories, servicePriceTypes, serviceRecurrences,
  type ServiceCategory, type ServicePriceType, type ServiceRecurrence, type ServiceSnapshot, type ServiceVariationInput,
} from "@/modules/services/model";
import { Badge, Empty, Field, Modal, ViewTitle } from "./Ui";

type Draft = {
  name: string;
  category: ServiceCategory;
  description: string;
  referencePrice: string;
  priceType: ServicePriceType;
  deliveryDays: string;
  hasSelection: boolean;
  selectionDays: string;
  recurrence: ServiceRecurrence;
  recurrenceDate: string;
  standardCost: string;
  variations: { name: string; referencePrice: string }[];
};

const blank = (): Draft => ({
  name: "", category: "ENSAIOS", description: "", referencePrice: "", priceType: "FECHADO",
  deliveryDays: "", hasSelection: false, selectionDays: "7", recurrence: "UMA_VEZ", recurrenceDate: "",
  standardCost: "", variations: [],
});

function moneyText(value: number | null) {
  return value == null ? "" : String(value);
}

function fromService(service: CatalogService): Draft {
  return {
    name: service.name, category: service.category, description: service.description,
    referencePrice: moneyText(service.referencePrice), priceType: service.priceType,
    deliveryDays: service.deliveryDays == null ? "" : String(service.deliveryDays),
    hasSelection: service.hasSelection, selectionDays: service.selectionDays == null ? "7" : String(service.selectionDays),
    recurrence: service.recurrence, recurrenceDate: service.recurrenceDate,
    standardCost: moneyText(service.standardCost),
    variations: service.variations.map((item) => ({ name: item.name, referencePrice: moneyText(item.referencePrice) })),
  };
}

function amount(value: string) {
  const text = value.trim().replace(",", ".");
  if (!text) return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : Number.NaN;
}

function days(value: string) {
  const text = value.trim();
  if (!text) return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : Number.NaN;
}

function snapshotOfDraft(draft: Draft, manager: boolean): ServiceSnapshot | string {
  const referencePrice = amount(draft.referencePrice);
  const standardCost = amount(draft.standardCost);
  const deliveryDays = days(draft.deliveryDays);
  const selectionDays = days(draft.selectionDays);
  if ([referencePrice, standardCost, deliveryDays, selectionDays].some((value) => Number.isNaN(value))) return "Use apenas números nos valores e nos prazos.";
  const variations: ServiceVariationInput[] = [];
  for (const variation of draft.variations) {
    if (!variation.name.trim() && !variation.referencePrice.trim()) continue;
    const price = amount(variation.referencePrice);
    if (Number.isNaN(price)) return "Use apenas números no preço da variação.";
    variations.push({ name: variation.name.trim(), referencePrice: price });
  }
  return {
    name: draft.name, category: draft.category, description: draft.description.trim(),
    referencePrice, priceType: draft.priceType, deliveryDays, hasSelection: draft.hasSelection,
    selectionDays: draft.hasSelection ? selectionDays ?? 7 : null,
    recurrence: draft.category === "PLANOS" ? draft.recurrence : "UMA_VEZ",
    recurrenceDate: draft.category === "PLANOS" && draft.recurrence === "DATA" ? draft.recurrenceDate : "",
    standardCost: manager ? standardCost : null,
    variations,
  };
}

function openSheet(id: string) {
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  window.open(`${base}/painel/servicos/ficha?id=${encodeURIComponent(id)}`, "_blank", "noopener");
}

function priceOf(service: CatalogService) {
  const hourly = service.priceType === "POR_HORA";
  if (service.variations.length) return service.variations.map((item) => `${item.name}: ${moneyLabel(item.referencePrice, hourly)}`).join(" · ");
  return moneyLabel(service.referencePrice, hourly);
}

export function ServicesPage() {
  const { state, role, busy, saveService, archiveService, restoreService, removeService, reviewServiceProposal } = useGarro();
  const manager = role === "GESTOR_GARRO";
  const attendant = role === "ATENDENTE";
  const [draft, setDraft] = useState<Draft | null>(null);
  const [editingId, setEditingId] = useState("");
  const [formError, setFormError] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [ask, setAsk] = useState<{ id: string; name: string; kind: "archive" | "restore" | "remove" } | null>(null);
  const services = state.services || [];
  const proposals = state.serviceProposals || [];
  if (!manager && !attendant) return <div className="workspace"><Empty text="Os serviços são do comercial." /></div>;

  function openForm(service?: CatalogService) {
    setFormError("");
    setEditingId(service?.id || "");
    setDraft(service ? fromService(service) : blank());
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;
    const snapshot = snapshotOfDraft(draft, manager);
    if (typeof snapshot === "string") { setFormError(snapshot); return; }
    const saved = await saveService(editingId, snapshot);
    if (saved) setDraft(null);
  }

  const active = serviceCategories.map((category) => ({
    category,
    items: services.filter((item) => item.category === category && item.status === "ATIVO"),
  })).filter((group) => group.items.length);
  const archived = services.filter((item) => item.status === "ARQUIVADO");

  return <div className="workspace">
    <ViewTitle eyebrow="CATÁLOGO" title="Serviços" description={manager ? "A Gestora cadastra, corrige, arquiva e gera o PDF de cada serviço." : "A tabela mostra o que está à venda. Uma alteração só entra depois da autorização da Gestora."} actions={<button className="button primary" type="button" onClick={() => openForm()}>{manager ? "Novo serviço" : "Propor serviço"}</button>} />
    {proposals.length > 0 && <section className="service-proposals">
      <h2>{manager ? "Alterações pendentes" : "Suas propostas"}</h2>
      {proposals.map((proposal) => <article key={proposal.id} className="proposal-card">
        <header>
          <strong>{proposal.serviceName}</strong>
          <Badge kind="attention">{proposal.actionLabel}</Badge>
          <span>{proposal.authorName} · {dateFull(proposal.createdAt)}</span>
        </header>
        <table>
          <thead><tr><th>Campo</th><th>Antes</th><th>Depois</th></tr></thead>
          <tbody>{proposal.changes.map((change) => <tr key={change.field}><td>{change.field}</td><td>{change.before}</td><td>{change.after}</td></tr>)}</tbody>
        </table>
        {manager ? <form className="proposal-review" onSubmit={(event) => { event.preventDefault(); void reviewServiceProposal(proposal.id, "autorizar", notes[proposal.id] || ""); }}>
          <Field label="Comentário para a atendente"><input value={notes[proposal.id] || ""} onChange={(event) => setNotes({ ...notes, [proposal.id]: event.target.value })} placeholder="Opcional na recusa" /></Field>
          <div className="service-actions">
            <button className="button primary" type="submit" disabled={busy}>Autorizar</button>
            <button className="button secondary" type="button" disabled={busy} onClick={() => void reviewServiceProposal(proposal.id, "recusar", notes[proposal.id] || "")}>Recusar</button>
          </div>
        </form> : <p>Aguardando a Gestora. O catálogo continua na versão atual.</p>}
      </article>)}
    </section>}
    {active.length === 0 && <Empty text="Nenhum serviço ativo no catálogo." />}
    <div className="service-groups">
      {active.map((group) => <section key={group.category}>
        <h2>{categoryLabel[group.category]}</h2>
        {group.category === "EVENTOS" && <div className="service-note">
          <p>Mínimo de 2h. O desconto vale só nas horas além das 2 primeiras.</p>
          <table><tbody>{eventHourDiscount.map((row) => <tr key={row.duration}><th>{row.duration}</th><td>{row.discount}</td></tr>)}</tbody></table>
        </div>}
        {group.category === "SERVICO_EXTRA" && <p className="service-note">Não é vendido sozinho. Entra somado a um serviço principal, e o valor é informado no fechamento.</p>}
        <ServiceTable items={group.items} manager={manager} busy={busy} onEdit={openForm} onAsk={setAsk} />
      </section>)}
    </div>
    {archived.length > 0 && <section className="service-archived">
      <h2>Arquivados</h2>
      <p className="service-note">Ficam fora das novas seleções. Projetos e contratos que já usaram o serviço continuam iguais.</p>
      <ServiceTable items={archived} manager={manager} busy={busy} archived onEdit={openForm} onAsk={setAsk} />
    </section>}
    {ask && <Modal title={ask.kind === "remove" ? (manager ? "Excluir serviço" : "Propor exclusão") : ask.kind === "restore" ? (manager ? "Desarquivar serviço" : "Propor desarquivamento") : (manager ? "Arquivar serviço" : "Propor arquivamento")} description={ask.name} onClose={() => setAsk(null)}>
      <div className="form-stack">
        <p className="service-note">{ask.kind === "remove" ? "Só sai de vez um serviço que nunca foi usado. Se já houve uso, o caminho é arquivar." : ask.kind === "restore" ? "Ele volta a aparecer nas novas seleções." : "Ele sai das novas seleções. O histórico e o que já foi vendido permanecem."}</p>
        <div className="service-actions">
          <button className="button primary" type="button" disabled={busy} onClick={() => {
            const action = ask.kind === "remove" ? removeService(ask.id) : ask.kind === "restore" ? restoreService(ask.id) : archiveService(ask.id);
            void action.then((saved) => { if (saved) setAsk(null); });
          }}>{manager ? "Confirmar" : "Enviar para autorização"}</button>
          <button className="button secondary" type="button" onClick={() => setAsk(null)}>Cancelar</button>
        </div>
      </div>
    </Modal>}
    {draft && <Modal title={editingId ? (manager ? "Editar serviço" : "Propor alteração") : (manager ? "Novo serviço" : "Propor serviço")} description={attendant ? "A proposta fica pendente até a Gestora autorizar." : undefined} onClose={() => setDraft(null)} width="760px">
      <form className="form-stack" onSubmit={(event) => void submit(event)}>
        {formError && <p className="form-error" role="alert">{formError}</p>}
        <div className="form-grid">
          <Field label="Nome"><input required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></Field>
          <Field label="Categoria"><select value={draft.category} onChange={(event) => {
            const category = event.target.value as ServiceCategory;
            setDraft({ ...draft, category, recurrence: category === "PLANOS" && draft.recurrence === "UMA_VEZ" ? "TRES_MESES" : draft.recurrence });
          }}>{serviceCategories.map((category) => <option key={category} value={category}>{categoryLabel[category]}</option>)}</select></Field>
        </div>
        <Field label="Descrição / o que inclui"><textarea rows={4} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></Field>
        <div className="form-grid">
          <Field label="Tipo de preço"><select value={draft.priceType} onChange={(event) => setDraft({ ...draft, priceType: event.target.value as ServicePriceType })}>{servicePriceTypes.map((type) => <option key={type} value={type}>{priceTypeLabel[type]}</option>)}</select></Field>
          <Field label="Preço de referência (R$)"><input type="number" min={0} step="0.01" disabled={draft.category === "SERVICO_EXTRA"} value={draft.category === "SERVICO_EXTRA" ? "" : draft.referencePrice} placeholder="Pode ficar vazio" onChange={(event) => setDraft({ ...draft, referencePrice: event.target.value })} /></Field>
          <Field label="Prazo padrão de entrega (dias úteis)"><input type="number" min={0} step={1} value={draft.deliveryDays} placeholder="Vazio, ou 0 para o mesmo dia" onChange={(event) => setDraft({ ...draft, deliveryDays: event.target.value })} /></Field>
          {manager && <Field label="Custo padrão (R$)"><input type="number" min={0} step="0.01" value={draft.standardCost} placeholder="Referência interna" onChange={(event) => setDraft({ ...draft, standardCost: event.target.value })} /></Field>}
        </div>
        {draft.category === "SERVICO_EXTRA" && <p className="service-note">Serviço extra não tem valor no catálogo. O valor entra no fechamento.</p>}
        <label className="check-line"><input type="checkbox" checked={draft.hasSelection} onChange={(event) => setDraft({ ...draft, hasSelection: event.target.checked })} /> Este serviço tem seleção pelo cliente</label>
        {draft.hasSelection && <Field label="Prazo de envio da seleção (dias)"><input type="number" min={0} step={1} value={draft.selectionDays} onChange={(event) => setDraft({ ...draft, selectionDays: event.target.value })} /></Field>}
        {draft.category === "PLANOS" && <div className="form-grid">
          <Field label="Recorrência"><select value={draft.recurrence} onChange={(event) => setDraft({ ...draft, recurrence: event.target.value as ServiceRecurrence })}>{serviceRecurrences.filter((item) => item !== "UMA_VEZ").map((item) => <option key={item} value={item}>{recurrenceLabel[item]}</option>)}</select></Field>
          {draft.recurrence === "DATA" && <Field label="Data da recorrência"><input type="date" required value={draft.recurrenceDate} onChange={(event) => setDraft({ ...draft, recurrenceDate: event.target.value })} /></Field>}
        </div>}
        <div className="variation-editor">
          <div className="service-actions"><strong>Variações</strong><button className="button secondary small" type="button" onClick={() => setDraft({ ...draft, variations: [...draft.variations, { name: "", referencePrice: "" }] })}>Adicionar variação</button></div>
          {draft.variations.map((variation, index) => <div className="variation-row" key={index}>
            <Field label="Nome da variação"><input value={variation.name} onChange={(event) => setDraft({ ...draft, variations: draft.variations.map((item, position) => position === index ? { ...item, name: event.target.value } : item) })} /></Field>
            <Field label="Preço de referência"><input type="number" min={0} step="0.01" disabled={draft.category === "SERVICO_EXTRA"} value={draft.category === "SERVICO_EXTRA" ? "" : variation.referencePrice} placeholder="Pode ficar vazio" onChange={(event) => setDraft({ ...draft, variations: draft.variations.map((item, position) => position === index ? { ...item, referencePrice: event.target.value } : item) })} /></Field>
            <button className="button secondary small" type="button" onClick={() => setDraft({ ...draft, variations: draft.variations.filter((_, position) => position !== index) })}>Remover</button>
          </div>)}
        </div>
        <div className="service-actions">
          <button className="button primary" type="submit" disabled={busy}>{manager ? "Salvar" : "Enviar para autorização"}</button>
          <button className="button secondary" type="button" onClick={() => setDraft(null)}>Cancelar</button>
        </div>
      </form>
    </Modal>}
  </div>;
}

function ServiceTable({ items, manager, busy, archived = false, onEdit, onAsk }: {
  items: CatalogService[];
  manager: boolean;
  busy: boolean;
  archived?: boolean;
  onEdit: (service: CatalogService) => void;
  onAsk: (action: { id: string; name: string; kind: "archive" | "restore" | "remove" }) => void;
}) {
  return <div className="surface table-wrapper"><div className="table-scroll"><table>
    <thead><tr>
      <th>Serviço</th><th>O que inclui</th><th>Preço</th><th>Prazo</th>{manager && <th>Custo</th>}<th>Ações</th>
    </tr></thead>
    <tbody>{items.map((service) => <tr key={service.id}>
      <td><strong>{service.name}</strong>{service.pending && <Badge kind="attention">Alteração pendente</Badge>}{service.priceType !== "FECHADO" && <small>{priceTypeLabel[service.priceType]}</small>}{service.category === "PLANOS" && <small>{recurrenceLabel[service.recurrence]}{service.recurrenceDate ? ` · ${service.recurrenceDate}` : ""}</small>}</td>
      <td>{service.description || "—"}{service.hasSelection && <small>Seleção em {service.selectionDays ?? 7} dias</small>}</td>
      <td className="service-price">{priceOf(service)}</td>
      <td>{deliveryLabel(service.deliveryDays)}</td>
      {manager && <td>{moneyLabel(service.standardCost)}</td>}
      <td><div className="service-actions">
        <button className="button secondary small" type="button" onClick={() => openSheet(service.id)}>PDF</button>
        {!service.pending && <button className="button secondary small" type="button" disabled={busy} onClick={() => onEdit(service)}>{manager ? "Editar" : "Propor alteração"}</button>}
        {!service.pending && !archived && <button className="button secondary small" type="button" disabled={busy} onClick={() => onAsk({ id: service.id, name: service.name, kind: "archive" })}>{manager ? "Arquivar" : "Propor arquivamento"}</button>}
        {!service.pending && archived && <button className="button secondary small" type="button" disabled={busy} onClick={() => onAsk({ id: service.id, name: service.name, kind: "restore" })}>{manager ? "Desarquivar" : "Propor desarquivamento"}</button>}
        {!service.pending && <button className="button secondary small" type="button" disabled={busy} onClick={() => onAsk({ id: service.id, name: service.name, kind: "remove" })}>{manager ? "Excluir" : "Propor exclusão"}</button>}
      </div></td>
    </tr>)}</tbody>
  </table></div></div>;
}
