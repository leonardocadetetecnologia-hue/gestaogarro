import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { AttachmentError } from "@/modules/production/attachment-service";
import { saveContractFile } from "@/modules/crm/contract-file";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Entre novamente para anexar o contrato." }, { status: 401, headers });
    const origin = request.headers.get("origin");
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
    let sameOrigin = false;
    try { sameOrigin = !!origin && !!host && new URL(origin).host.toLowerCase() === host.toLowerCase(); } catch {}
    if (!sameOrigin) throw new AttachmentError("Origem do acesso inválida. Abra o sistema novamente.", 403);
    const opportunityId = request.headers.get("x-opportunity-id") || "";
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(opportunityId)) throw new AttachmentError("Contrato inválido.");
    let fileName: string;
    try { fileName = decodeURIComponent(request.headers.get("x-file-name") || ""); } catch { throw new AttachmentError("Nome de arquivo inválido."); }
    const reader = request.body?.getReader();
    if (!reader) throw new AttachmentError("Selecione um arquivo.");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 10 * 1024 * 1024) { await reader.cancel(); throw new AttachmentError("O contrato pode ter até 10 MB.", 413); }
      chunks.push(chunk.value);
    }
    const saved = await saveContractFile(user, opportunityId, fileName, Buffer.concat(chunks));
    return NextResponse.json(saved, { status: 201, headers });
  } catch (error) {
    if (error instanceof AttachmentError) return NextResponse.json({ error: error.message }, { status: error.status, headers });
    console.error("contract_upload_failed");
    return NextResponse.json({ error: "Não foi possível anexar o contrato. Tente novamente." }, { status: 500, headers });
  }
}
