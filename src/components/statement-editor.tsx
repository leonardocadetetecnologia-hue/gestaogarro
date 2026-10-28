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
                      <label className="statement-flag"><input type="checkbox" checked={line.include} aria-label={`Incluir ${line.title}`} onChange={(event) => setDrafts((current) => patchLine(current, draft.demandId, line.id, { include: event.target.checked }))} />Incluir este item</label>
                      {line.include && <>
                        <div className="statement-field">
                          <label className="statement-flag"><input type="checkbox" checked={line.showTitle} aria-label={`Mostrar o que foi feito em ${line.title}`} onChange={(event) => setDrafts((current) => patchLine(current, draft.demandId, line.id, { showTitle: event.target.checked }))} />O que foi feito</label>
                          <input aria-label={`Texto de ${line.title}`} value={line.title} maxLength={200} disabled={!line.showTitle} onChange={(event) => setDrafts((current) => patchLine(current, draft.demandId, line.id, { title: event.target.value }))} />
                          {line.number != null && <label className="statement-flag"><input type="checkbox" checked={line.showNumber} aria-label={`Mostrar número de ${line.title}`} onChange={(event) => setDrafts((current) => patchLine(current, draft.demandId, line.id, { showNumber: event.target.checked }))} />Número</label>}
                        </div>
                        <div className="statement-field">
                          <label className="statement-flag"><input type="checkbox" checked={line.showDescription} aria-label={`Mostrar descrição de ${line.title}`} onChange={(event) => setDrafts((current) => patchLine(current, draft.demandId, line.id, { showDescription: event.target.checked }))} />Descrição</label>
                          <textarea aria-label={`Descrição de ${line.title}`} rows={2} maxLength={4000} value={line.description} disabled={!line.showDescription} onChange={(event) => setDrafts((current) => patchLine(current, draft.demandId, line.id, { description: event.target.value }))} />
                        </div>
                        <div className="statement-field">
                          <label className="statement-flag"><input type="checkbox" checked={line.showService} aria-label={`Mostrar tipo de ${line.title}`} onChange={(event) => setDrafts((current) => patchLine(current, draft.demandId, line.id, { showService: event.target.checked }))} />Tipo</label>
                          <input aria-label={`Tipo de ${line.title}`} value={line.service} maxLength={120} disabled={!line.showService} onChange={(event) => setDrafts((current) => patchLine(current, draft.demandId, line.id, { service: event.target.value }))} />
                        </div>
                      </>}
                    </div>
                  ))}
                  <label className="statement-flag"><input type="checkbox" checked={draft.showNote} aria-label={`Inserir observação em ${draft.label}`} onChange={(event) => setDrafts((current) => patchDelivery(current, draft.demandId, { showNote: event.target.checked }))} />Inserir observação</label>
                  {draft.showNote && <textarea aria-label={`Observação de ${draft.label}`} rows={3} maxLength={2000} value={draft.note} placeholder="Informação extra desta entrega" onChange={(event) => setDrafts((current) => patchDelivery(current, draft.demandId, { note: event.target.value }))} />}
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
