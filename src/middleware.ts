import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (
    pathname === "/login" ||
    pathname === "/api/auth/login" ||
    pathname === "/recuperar-senha" ||
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/images/")
  ) {
    return NextResponse.next();
  }
  if (!request.cookies.get("garro_session")) {
    if (pathname.startsWith("/api/script-attachments")) return NextResponse.json({ error: "Entre novamente para acessar os anexos." }, { status: 401, headers: { "Cache-Control": "no-store" } });
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
