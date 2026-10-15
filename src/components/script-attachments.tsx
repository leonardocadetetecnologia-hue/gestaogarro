"use client";
import { useRef, useState } from "react";
import { Download, Paperclip } from "lucide-react";
import type { Deliverable, ScriptAttachment } from "@/lib/data";
import { useGarro } from "@/lib/store";

export function ScriptAttachments({ task }: { task: Deliverable }) {
  const { role, busy } = useGarro();
  const canEdit = role === "GESTOR_GARRO";
  const [uploaded, setUploaded] = useState<ScriptAttachment[]>([]);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [failed, setFailed] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const files = [...new Map([...(task.attachments || []), ...uploaded].map(file => [file.id, file])).values()];
  async function upload() {
    const file = input.current?.files?.[0];
    if (!file) { setFailed(true); setFeedback("Selecione um arquivo .txt, .doc ou .pdf."); return; }
    if (!/\.(txt|doc|pdf)$/i.test(file.name) || !file.size || file.size > 10 * 1024 * 1024) {
      setFailed(true); setFeedback("Use um arquivo .txt, .doc ou .pdf de até 10 MB, com conteúdo."); return;
    }
    setPending(true); setFeedback(""); setFailed(false);
    try {
      const response = await fetch(`${base}/api/script-attachments`, { method: "POST", body: file,
        headers: { "Content-Type": "application/octet-stream", "X-File-Name": encodeURIComponent(file.name), "X-Deliverable-Id": task.id } });
      const data = await response.json();
      if (!response.ok || !data.attachment) throw new Error(data.error || "Não foi possível anexar o arquivo.");
      setUploaded(current => [...current, data.attachment]);
      if (input.current) input.current.value = "";
      setFeedback("Anexo salvo no script.");
    } catch (error) { setFailed(true); setFeedback(error instanceof Error ? error.message : "Não foi possível anexar. Tente novamente."); }
    finally { setPending(false); }
  }
  return <section className="script-attachments" aria-label={`Anexos do script de ${task.title}`} aria-busy={pending}>
    <h4><Paperclip size={17}/>Anexos do script</h4>
    {files.length ? <ul>{files.map(file => <li key={file.id}><a href={`${base}/api/script-attachments/${encodeURIComponent(file.id)}`} download><Download size={17}/><span>{file.fileName}<small>{(file.size / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} KB · Baixar anexo</small></span></a></li>)}</ul> : <p>Nenhum anexo neste script.</p>}
    {canEdit && <div className="script-attachment-upload"><label>Selecionar anexo (.txt, .doc ou .pdf, até 10 MB)<input ref={input} type="file" accept=".txt,.doc,.pdf" disabled={pending || busy}/></label><button type="button" className="button secondary small" disabled={pending || busy} onClick={upload}><Paperclip size={16}/>{pending ? "Anexando…" : "Anexar arquivo"}</button><small>O anexo é salvo separadamente do texto do Script.</small></div>}
    {feedback && <p className={failed ? "form-error" : "task-script-feedback"} role={failed ? "alert" : "status"}>{feedback}</p>}
  </section>;
}
