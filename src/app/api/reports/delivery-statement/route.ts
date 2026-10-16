import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { loadDeliveryStatement, parseStatementFilters, StatementError } from "@/modules/reports/delivery-statement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Entre novamente para consultar o extrato." }, { status: 401, headers });
    const statement = await loadDeliveryStatement(user, parseStatementFilters(new URL(request.url).searchParams));
    return NextResponse.json(statement, { headers });
  } catch (error) {
    if (error instanceof StatementError) return NextResponse.json({ error: error.message }, { status: error.status, headers });
    console.error("delivery_statement_failed");
    return NextResponse.json({ error: "Não foi possível montar o extrato." }, { status: 500, headers });
  }
}
