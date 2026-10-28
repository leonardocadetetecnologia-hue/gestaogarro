"use client";

import { useMemo, useState } from "react";
import { GarroBrand } from "./garro-brand";
import { draftsFromActivities, reportDocuments, type DraftDelivery, type DraftLine, type ReportMode } from "@/lib/statement-draft";
import type { StatementActivity } from "@/modules/reports/delivery-statement";
import { Modal } from "./Ui";

function patchDelivery(drafts: DraftDelivery[], demandId: string, patch: Partial<DraftDelivery>) {
  return drafts.map((draft) => draft.demandId === demandId ? { ...draft, ...patch } : draft);
}

function patchLine(drafts: DraftDelivery[], demandId: string, lineId: string, patch: Partial<DraftLine>) {
  return drafts.map((draft) => draft.demandId !== demandId ? draft : {
    ...draft,
    lines: draft.lines.map((line) => line.id === lineId ? { ...line, ...patch } : line),
  });
}

function lineName(line: DraftLine) {
  const title = line.title.trim();
  if (line.number != null && title) return `${line.number}. ${title}`;
  return title || line.service.trim() || "Item";
}

function addNote(drafts: DraftDelivery[], demandId: string) {
  return drafts.map((draft) => draft.demandId !== demandId ? draft : {
    ...draft,
    notes: [...draft.notes, { id: `${demandId}-nota-${draft.notes.length + 1}`, text: "" }],
  });
}

function patchNote(drafts: DraftDelivery[], demandId: string, noteId: string, text: string) {
  return drafts.map((draft) => draft.demandId !== demandId ? draft : {
    ...draft,
    notes: draft.notes.map((note) => note.id === noteId ? { ...note, text } : note),
  });
}

function removeNote(drafts: DraftDelivery[], demandId: string, noteId: string) {
  return drafts.map((draft) => draft.demandId !== demandId ? draft : {
    ...draft,
    notes: draft.notes.filter((note) => note.id !== noteId),
  });
}

export function StatementEditor({ activities, onClose }: { activities: StatementActivity[]; onClose: () => void }) {
  const [drafts, setDrafts] = useState(() => draftsFromActivities(activities));
  const [mode, setMode] = useState<ReportMode>("junto");
  const [preview, setPreview] = useState(false);
  const documents = useMemo(() => preview ? reportDocuments(drafts, mode) : [], [preview, drafts, mode]);

  function printPreview() {
    if (!documents.length) return;
    document.body.classList.add("garro-statement-print");
    const done = () => document.body.classList.remove("garro-statement-print");
    window.addEventListener("afterprint", done, { once: true });
    window.print();
  }

  return (
    <Modal title="Ajustar o relatório" description="A prévia não altera o que está gravado. Escolha as entregas, edite o texto e tire o que não deve sair." width="960px" onClose={onClose}>
      <div className="statement-editor">
        <div className="statement-editor-ui">
          <div className="segmented" role="group" aria-label="Formato do relatório">
            <button type="button" className={mode === "junto" ? "active" : ""} onClick={() => setMode("junto")}>Um relatório só</button>
            <button type="button" className={mode === "cada" ? "active" : ""} onClick={() => setMode("cada")}>Um para cada entrega</button>
          </div>
          <div className="statement-drafts">
            {drafts.map((draft) => (
              <article className="statement-draft" key={draft.demandId}>
                <label className="statement-flag">
                  <input type="checkbox" checked={draft.include} onChange={(event) => setDrafts((current) => patchDelivery(current, draft.demandId, { include: event.target.checked }))} />
                  <strong>{draft.label}</strong>
                </label>
                {draft.include && <>
                  <div className="statement-field">
                    <label className="statement-flag"><input type="checkbox" checked={draft.showCustomer} aria-label={`Mostrar cliente de ${draft.label}`} onChange={(event) => setDrafts((current) => patchDelivery(current, draft.demandId, { showCustomer: event.target.checked }))} />Cliente</label>
                    <input aria-label={`Cliente de ${draft.label}`} value={draft.customerName} maxLength={200} disabled={!draft.showCustomer} onChange={(event) => setDrafts((current) => patchDelivery(current, draft.demandId, { customerName: event.target.value }))} />
                  </div>
                  <div className="statement-field">
                    <label className="statement-flag"><input type="checkbox" checked={!draft.omitDate} aria-label={`Mostrar data de ${draft.label}`} onChange={(event) => setDrafts((current) => patchDelivery(current, draft.demandId, { omitDate: !event.target.checked }))} />Data de entrega</label>
                    <input aria-label={`Data de entrega de ${draft.label}`} type="date" value={draft.date} disabled={draft.omitDate} onChange={(event) => setDrafts((current) => patchDelivery(current, draft.demandId, { date: event.target.value, omitDate: false }))} />
                    <label className="statement-flag"><input type="checkbox" checked={draft.omitDate} aria-label={`Sem data de entrega de ${draft.label}`} onChange={(event) => setDrafts((current) => patchDelivery(current, draft.demandId, { omitDate: event.target.checked }))} />Sem data de entrega</label>
                  </div>
                  {draft.lines.map((line) => (
                    <div className="statement-line" key={line.id}>
                      <label className="statement-flag">
                        <input type="checkbox" checked={line.include} aria-label={`Incluir ${lineName(line)}`} onChange={(event) => setDrafts((current) => patchLine(current, draft.demandId, line.id, { include: event.target.checked }))} />
                        <span>{lineName(line)}</span>
                      </label>
                      {line.include && <>
                        <label className="statement-field">
                          <span>O que foi feito</span>
                          <input aria-label={`Texto de ${lineName(line)}`} value={line.title} maxLength={200} onChange={(event) => setDrafts((current) => patchLine(current, draft.demandId, line.id, { title: event.target.value, showTitle: true }))} />
                        </label>
                        {(line.description.trim() || line.showDescription) && <label className="statement-field">
                          <span>Descrição</span>
                          <textarea aria-label={`Descrição de ${lineName(line)}`} rows={2} maxLength={4000} value={line.description} onChange={(event) => setDrafts((current) => patchLine(current, draft.demandId, line.id, { description: event.target.value, showDescription: true }))} />
                        </label>}
                        {(line.service.trim() || line.showService) && <label className="statement-field">
                          <span>Tipo</span>
                          <input aria-label={`Tipo de ${lineName(line)}`} value={line.service} maxLength={120} onChange={(event) => setDrafts((current) => patchLine(current, draft.demandId, line.id, { service: event.target.value, showService: true }))} />
                        </label>}
                      </>}
                    </div>
                  ))}
                  {draft.notes.map((note, index) => (
                    <div className="statement-field" key={note.id}>
                      <span>{draft.notes.length > 1 ? `Observação ${index + 1}` : "Observação"} <button type="button" className="text-link" onClick={() => setDrafts((current) => removeNote(current, draft.demandId, note.id))}>Tirar</button></span>
                      <textarea aria-label={`Observação ${index + 1} de ${draft.label}`} rows={3} maxLength={2000} value={note.text} placeholder="Informação extra desta entrega" onChange={(event) => setDrafts((current) => patchNote(current, draft.demandId, note.id, event.target.value))} />
                    </div>
                  ))}
                  <button type="button" className="button secondary small" onClick={() => setDrafts((current) => addNote(current, draft.demandId))}>{draft.notes.length ? "Outra observação" : "Inserir observação"}</button>
                </>}
              </article>
            ))}
          </div>
          <div className="modal-footer">
            <button type="button" className="button secondary" onClick={onClose}>Fechar</button>
            <button type="button" className="button secondary" onClick={() => setPreview(true)}>Gerar prévia</button>
            <button type="button" className="button primary" disabled={!documents.length} onClick={printPreview}>Gerar PDF</button>
          </div>
        </div>
        {preview && <div className="statement-preview" aria-label="Prévia do relatório">
          {documents.length === 0 && <p className="empty-state">Nada selecionado para o relatório.</p>}
          {documents.map((document) => (
            <main className="statement-sheet" key={document.key}>
              <header>
                <GarroBrand size={56} wordmarkWidth={180} />
                <div>
                  <p>{mode === "cada" ? "Relatório de entrega" : "Extrato de entregas"}</p>
                  <h1>{document.title}</h1>
                </div>
              </header>
              {document.parts.map((part) => (
                <section key={part.key}>
                  {part.customer && <h2>{part.customer}</h2>}
                  {part.date && <p className="statement-note">Entrega em {part.date}</p>}
                  {part.lines.map((line) => (
                    <article key={line.id}>
                      <div>
                        {line.heading && <h3>{line.heading}</h3>}
                        {line.service && <p>{line.service}</p>}
                      </div>
                      {line.description && <p>{line.description}</p>}
                    </article>
                  ))}
                  {part.note && <p className="statement-note">{part.note}</p>}
                </section>
              ))}
              <footer>Garro Produtora · extrato de produção concluída</footer>
            </main>
          ))}
        </div>}
      </div>
    </Modal>
  );
}
