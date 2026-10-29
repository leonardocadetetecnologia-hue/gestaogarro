"use client";

import { useMemo, useState } from "react";
import { GarroBrand } from "./garro-brand";
import { draftsFromActivities, reportDocuments, type DraftDelivery, type ReportMode } from "@/lib/statement-draft";
import type { StatementActivity } from "@/modules/reports/delivery-statement";
import { Modal } from "./Ui";

function patchDelivery(drafts: DraftDelivery[], demandId: string, patch: Partial<DraftDelivery>) {
  return drafts.map((draft) => draft.demandId === demandId ? { ...draft, ...patch } : draft);
}

function descriptionOf(draft: DraftDelivery) {
  return draft.lines.map((line) => line.description.trim()).filter(Boolean).join("\n\n");
}

function setDescription(drafts: DraftDelivery[], demandId: string, text: string) {
  return drafts.map((draft) => draft.demandId !== demandId ? draft : {
    ...draft,
    lines: draft.lines.length ? draft.lines.map((line, index) => index === 0
      ? { ...line, description: text, showDescription: true, include: true }
      : { ...line, description: "", showDescription: false, include: false }) : [{
        id: `${demandId}-texto`, include: true, showNumber: false, title: "", showTitle: false,
        description: text, showDescription: true, service: "", showService: false,
      }],
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
                  <input type="checkbox" checked={draft.include} aria-label={`Incluir ${draft.customerName || "entrega"}`} onChange={(event) => setDrafts((current) => patchDelivery(current, draft.demandId, { include: event.target.checked }))} />
                  Incluir
                </label>
                {draft.include && <>
                  <label className="statement-field">
                    <span>Nome do cliente</span>
                    <input aria-label={`Nome do cliente ${draft.customerName}`} value={draft.customerName} maxLength={200} onChange={(event) => setDrafts((current) => patchDelivery(current, draft.demandId, { customerName: event.target.value, showCustomer: true }))} />
                  </label>
                  <label className="statement-field">
                    <span>Descrição</span>
                    <textarea aria-label={`Descrição de ${draft.customerName || "entrega"}`} rows={3} maxLength={4000} value={descriptionOf(draft)} onChange={(event) => setDrafts((current) => setDescription(current, draft.demandId, event.target.value))} />
                  </label>
                  <label className="statement-field">
                    <span>Data de entrega</span>
                    <input aria-label={`Data de entrega de ${draft.customerName || "entrega"}`} type="date" value={draft.date} onChange={(event) => setDrafts((current) => patchDelivery(current, draft.demandId, { date: event.target.value, omitDate: false }))} />
                  </label>
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
                  <p>Relatório de entrega</p>
                </div>
              </header>
              {document.parts.map((part) => (
                <section key={part.key}>
                  {part.customer && <h2>{part.customer}</h2>}
                  {part.date && <p className="statement-note">Data de entrega: {part.date}</p>}
                  {part.lines.map((line) => line.description && <p key={line.id}>{line.description}</p>)}
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
