"use client";

import { useMemo, useState } from "react";
import { GarroBrand } from "./garro-brand";
import { draftsFromActivities, formatReportPeriod, reportDocuments, type DraftDelivery, type DraftLine, type ReportMode } from "@/lib/statement-draft";
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
  return line.title.trim() || "Item";
}

export function StatementEditor({ activities, onClose }: { activities: StatementActivity[]; onClose: () => void }) {
  const [drafts, setDrafts] = useState(() => draftsFromActivities(activities));
  const [mode, setMode] = useState<ReportMode>("junto");
  const [periodKind, setPeriodKind] = useState<"texto" | "datas">("texto");
  const [periodText, setPeriodText] = useState("");
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");
  const [preview, setPreview] = useState(false);
  const period = formatReportPeriod(periodKind, periodText, periodFrom, periodTo);
  const documents = useMemo(() => preview ? reportDocuments(drafts, mode, period) : [], [preview, drafts, mode, period]);

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
          <div className="statement-field">
            <span>Período</span>
            <select aria-label="Formato do período" value={periodKind} onChange={(event) => setPeriodKind(event.target.value as "texto" | "datas")}>
              <option value="texto">Texto</option>
              <option value="datas">Datas</option>
            </select>
            {periodKind === "texto" ? (
              <input aria-label="Período em texto" value={periodText} maxLength={160} placeholder="Ex.: outubro de 2026" onChange={(event) => setPeriodText(event.target.value)} />
            ) : (
              <div className="statement-dates">
                <input aria-label="Início do período" type="date" value={periodFrom} onChange={(event) => setPeriodFrom(event.target.value)} />
                <input aria-label="Fim do período" type="date" value={periodTo} onChange={(event) => setPeriodTo(event.target.value)} />
              </div>
            )}
          </div>
          <div className="statement-drafts">
            {drafts.map((draft) => (
              <article className="statement-draft" key={draft.demandId}>
                <label className="statement-flag">
                  <input type="checkbox" checked={draft.include} onChange={(event) => setDrafts((current) => patchDelivery(current, draft.demandId, { include: event.target.checked }))} />
                  <strong>{draft.label}</strong>
                </label>
                {draft.include && draft.lines.map((line) => (
                  <div className="statement-line" key={line.id}>
                    <label className="statement-flag">
                      <input type="checkbox" checked={line.showTitle} aria-label={`Informação de ${lineName(line)}`} onChange={(event) => setDrafts((current) => patchLine(current, draft.demandId, line.id, { showTitle: event.target.checked }))} />
                      <span>Informação</span>
                    </label>
                    <input aria-label={`Texto de ${lineName(line)}`} value={line.title} maxLength={200} disabled={!line.showTitle} onChange={(event) => setDrafts((current) => patchLine(current, draft.demandId, line.id, { title: event.target.value, showTitle: true }))} />
                    <label className="statement-flag">
                      <input type="checkbox" checked={!draft.omitDate} aria-label={`Mostrar data de ${lineName(line)}`} onChange={(event) => setDrafts((current) => patchDelivery(current, draft.demandId, { omitDate: !event.target.checked }))} />
                      <span>Data</span>
                    </label>
                    <input aria-label={`Data de ${lineName(line)}`} type="date" value={draft.date} disabled={draft.omitDate} onChange={(event) => setDrafts((current) => patchDelivery(current, draft.demandId, { date: event.target.value, omitDate: false }))} />
                    <label className="statement-field">
                      <span>Descrição</span>
                      <textarea aria-label={`Descrição de ${lineName(line)}`} rows={2} maxLength={4000} value={line.description} onChange={(event) => setDrafts((current) => patchLine(current, draft.demandId, line.id, { description: event.target.value, showDescription: true }))} />
                    </label>
                  </div>
                ))}
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
                  {mode === "cada" && <h1>{document.title}</h1>}
                  {document.period && <p className="statement-note">Período: {document.period}</p>}
                </div>
              </header>
              {document.parts.map((part) => (
                <section key={part.key}>
                  {part.date && <p className="statement-note">{part.date}</p>}
                  {part.lines.map((line) => (
                    <article key={line.id}>
                      {line.heading && <h3>{line.heading}</h3>}
                      {line.description && <p>{line.description}</p>}
                    </article>
                  ))}
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
