import { IntegrationConfigError, bearerMatches, consumeRateLimit, parseLimit, rateLimitKey, readFeed } from "@/lib/integration-feed";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "cache-control": "no-store" };

function json(status: number, body: Record<string, unknown>, extra: Record<string, string> = {}) {
  return Response.json(body, { status, headers: { ...noStore, ...extra } });
}

async function guarded(request: Request) {
  const header = request.headers.get("authorization");
  const limit = consumeRateLimit(rateLimitKey(header));
  if (!limit.allowed) return json(429, { error: "rate_limited" }, { "retry-after": String(limit.retryAfter) });
  try {
    if (!bearerMatches(header)) return json(401, { error: "unauthorized" });
    const limitParam = parseLimit(new URL(request.url).searchParams.get("limit"));
    if (limitParam == null) return json(400, { error: "invalid_limit" });
    const page = await readFeed(new URL(request.url).searchParams.get("cursor"), limitParam);
    if ("error" in page) {
      return page.error === "incompatible" ? json(410, { error: "cursor_expired" }) : json(400, { error: "invalid_cursor" });
    }
    return json(200, page);
  } catch (error) {
    if (error instanceof IntegrationConfigError) return json(503, { error: "unavailable" });
    throw error;
  }
}

export function GET(request: Request) {
  return guarded(request);
}

export function POST() {
  return json(405, { error: "method_not_allowed" });
}

export function PUT() {
  return json(405, { error: "method_not_allowed" });
}

export function PATCH() {
  return json(405, { error: "method_not_allowed" });
}

export function DELETE() {
  return json(405, { error: "method_not_allowed" });
}
