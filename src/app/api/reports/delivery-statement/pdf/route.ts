import { getSessionUser } from "@/lib/auth";
import { renderDeliveryPdf } from "@/modules/reports/delivery-pdf";
import { formatDeliveredAt, loadDemandStatementForExport, parseStatementFilters, statementPeriodLabel, StatementError } from "@/modules/reports/delivery-statement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) throw new StatementError("Entre novamente para exportar o PDF.", 401);
    const filters = parseStatementFilters(new URL(request.url).searchParams);
    const statement = await loadDemandStatementForExport(user, filters);
    const bytes = await renderDeliveryPdf({
      project: statement.focus.title,
      customer: statement.focus.customerName,
      period: statementPeriodLabel(filters.month || "", filters.from, filters.to),
      issuedAt: formatDeliveredAt(new Date().toISOString()),
      sections: statement.sections,
      total: statement.total,
    });
    return new Response(Uint8Array.from(bytes), {
      headers: {
        ...headers,
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="relatorio-de-entrega-garro.pdf"',
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof StatementError) return Response.json({ error: error.message }, { status: error.status, headers });
    console.error("delivery_pdf_failed", error instanceof Error ? error.name : "unknown");
    return Response.json({ error: "Não foi possível exportar o PDF." }, { status: 500, headers });
  }
}
