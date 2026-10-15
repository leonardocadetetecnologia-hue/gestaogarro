import { NextResponse } from "next/server";
import { signIn } from "@/modules/auth/sign-in";
import { sessionCookiePath } from "@/lib/public-path";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const origin = request.headers.get("origin");
  let sameOrigin = false;
  try { sameOrigin = !!host && !!origin && new URL(origin).host.toLowerCase() === host.toLowerCase(); } catch {}
  if (!sameOrigin) return NextResponse.json({ error: "Origem do acesso inválida. Abra o sistema novamente." }, { status: 403, headers });
  if (!request.headers.get("content-type")?.startsWith("application/json")) return NextResponse.json({ error: "Formato de acesso inválido." }, { status: 415, headers });
  let input: unknown;
  try {
    const reader = request.body?.getReader();
    if (!reader) throw new Error("Corpo ausente");
    const decoder = new TextDecoder(); let size = 0; let text = "";
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > 8192) {
        await reader.cancel();
        return NextResponse.json({ error: "Dados de acesso muito longos." }, { status: 413, headers });
      }
      text += decoder.decode(part.value, { stream: true });
    }
    input = JSON.parse(text + decoder.decode());
  } catch { return NextResponse.json({ error: "Informe usuário e senha válidos." }, { status: 400, headers }); }
  try {
    const remember = typeof input === "object" && input !== null && "rememberMe" in input && input.rememberMe === true;
    const result = await signIn(input, remember);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 401, headers });
    const base = sessionCookiePath().replace(/\/$/, "");
    return NextResponse.json({ redirectTo: `${base}/painel` }, { headers });
  } catch { return NextResponse.json({ error: "Não foi possível entrar. Tente novamente." }, { status: 500, headers }); }
}
