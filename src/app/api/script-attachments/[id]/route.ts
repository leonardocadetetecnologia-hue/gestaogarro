import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { AttachmentError, downloadScriptAttachment } from "@/modules/production/attachment-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Entre novamente para baixar o anexo." }, { status: 401, headers });
    const { id } = await params;
    const file = await downloadScriptAttachment(user, id);
    return new Response(new Uint8Array(file.content), { headers: { ...headers, "Content-Type": file.mimeType,
      "Content-Length": String(file.size), "Content-Disposition": `attachment; filename="anexo.${file.fileName.split(".").pop()?.toLowerCase()}"; filename*=UTF-8''${encodeURIComponent(file.fileName).replace(/['()*]/g, c => `%${c.charCodeAt(0).toString(16)}`)}` } });
  } catch (error) {
    if (error instanceof AttachmentError) return NextResponse.json({ error: error.message }, { status: error.status, headers });
    console.error("script_attachment_download_failed");
    return NextResponse.json({ error: "Não foi possível baixar o anexo. Tente novamente." }, { status: 500, headers });
  }
}
