import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { AttachmentError, MAX_SCRIPT_FILE_SIZE, uploadScriptAttachment } from "@/modules/production/attachment-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Entre novamente para anexar arquivos." }, { status: 401, headers });
    if (user.role !== "GESTOR_GARRO") throw new AttachmentError("Somente a Gestora pode anexar arquivos ao script.", 403);
    const origin = request.headers.get("origin");
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
    let sameOrigin = false;
    try { sameOrigin = !!origin && !!host && new URL(origin).host.toLowerCase() === host.toLowerCase(); } catch {}
    if (!sameOrigin) throw new AttachmentError("Origem do acesso inválida. Abra o sistema novamente.", 403);
    const deliverableId = request.headers.get("x-deliverable-id") || "";
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(deliverableId)) throw new AttachmentError("Entregável inválido.");
    let fileName: string;
    try { fileName = decodeURIComponent(request.headers.get("x-file-name") || ""); } catch { throw new AttachmentError("Nome de arquivo inválido."); }
    if (Number(request.headers.get("content-length")) > MAX_SCRIPT_FILE_SIZE) throw new AttachmentError("Cada anexo pode ter até 10 MB.", 413);
    const reader = request.body?.getReader();
    if (!reader) throw new AttachmentError("Selecione um arquivo.");
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > MAX_SCRIPT_FILE_SIZE) { await reader.cancel(); throw new AttachmentError("Cada anexo pode ter até 10 MB.", 413); }
      chunks.push(chunk.value);
    }
    const attachment = await uploadScriptAttachment(user, deliverableId, fileName, Buffer.concat(chunks));
    return NextResponse.json({ attachment }, { status: 201, headers });
  } catch (error) {
    if (error instanceof AttachmentError) return NextResponse.json({ error: error.message }, { status: error.status, headers });
    console.error("script_attachment_upload_failed");
    return NextResponse.json({ error: "Não foi possível anexar o arquivo. Tente novamente." }, { status: 500, headers });
  }
}
