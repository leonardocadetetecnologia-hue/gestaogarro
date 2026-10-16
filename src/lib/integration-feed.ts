import { createHash, createHmac, randomUUID, timingSafeEqual } from "crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export class IntegrationConfigError extends Error {}

export const FEED_SCHEMA_VERSION = 1;
export const CURSOR_VERSION = 1;
const COUNTER_ID = "feed";
const TOKEN_HEADER_MAX = 512;
const CURSOR_MAX = 512;
const RATE_WINDOW_MS = 60_000;
const AUTHENTICATED_LIMIT = 60;
const ANONYMOUS_LIMIT = 20;

const captureModes = ["disabled", "sale_closed", "production_requested"] as const;
export type CaptureMode = (typeof captureModes)[number];

const eventDataSchema = z.object({
  opportunityId: z.string().min(1).max(80),
  saleId: z.string().min(1).max(80).nullable(),
  demandId: z.string().min(1).max(80).nullable(),
  customerName: z.string().min(1).max(200),
  serviceTitle: z.string().min(1).max(200),
  clientDueAt: z.string().datetime().nullable(),
  source: z.literal("CRM"),
  demandPath: z.string().min(1).max(300).nullable(),
}).strict();
export type EventData = z.infer<typeof eventDataSchema>;

type Attempt = { count: number; reset: number };
const attempts = new Map<string, Attempt>();

export function resetIntegrationRateLimit() {
  attempts.clear();
}

export function captureMode(): CaptureMode {
  const raw = process.env.GARRO_EVENT_CAPTURE_MODE;
  if (raw == null || raw.trim() === "") return "disabled";
  if ((captureModes as readonly string[]).includes(raw)) return raw as CaptureMode;
  throw new IntegrationConfigError("Modo de captura inválido.");
}

// Ausente, disabled ou inválido não entra na transação de negócio. Só os dois modos explícitos capturam.
function armedCapture() {
  const raw = process.env.GARRO_EVENT_CAPTURE_MODE;
  if (raw === "sale_closed" || raw === "production_requested") return raw;
  return null;
}

function requiredEnv(name: string) {
  const value = process.env[name]?.trim() || "";
  if (!value) throw new IntegrationConfigError(`${name} ausente.`);
  return value;
}

export function feedScope() {
  const scope = requiredEnv("GARRO_EVENTS_SCOPE");
  if (!/^[A-Za-z0-9._-]{1,80}$/.test(scope)) throw new IntegrationConfigError("Escopo do feed inválido.");
  return scope;
}

function tokenHash() {
  const hash = requiredEnv("GARRO_EVENTS_TOKEN_SHA256").toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(hash)) throw new IntegrationConfigError("Hash do token inválido.");
  return hash;
}

function cursorSecret() {
  const secret = requiredEnv("GARRO_EVENTS_CURSOR_SECRET");
  if (secret.length < 32 || secret.includes("change-me")) throw new IntegrationConfigError("Segredo do cursor inválido.");
  return secret;
}

export function readFeedConfig() {
  return { mode: captureMode(), scope: feedScope(), tokenHash: tokenHash(), cursorSecret: cursorSecret() };
}

function digestToken(token: string) {
  return createHash("sha256").update(token).digest();
}

export function bearerMatches(header: string | null) {
  if (!header || header.length > TOKEN_HEADER_MAX || !header.startsWith("Bearer ")) return false;
  const token = header.slice("Bearer ".length);
  if (!token || /\s/.test(token)) return false;
  const actual = digestToken(token);
  const expected = Buffer.from(tokenHash(), "hex");
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export function rateLimitKey(header: string | null) {
  if (!header || header.length > TOKEN_HEADER_MAX) return "anonymous";
  return createHash("sha256").update(header).digest("hex");
}

export function consumeRateLimit(key: string, now = Date.now()) {
  const limit = key === "anonymous" ? ANONYMOUS_LIMIT : AUTHENTICATED_LIMIT;
  const current = attempts.get(key);
  if (!current || current.reset <= now) {
    attempts.set(key, { count: 1, reset: now + RATE_WINDOW_MS });
    return { allowed: true, retryAfter: 0 };
  }
  if (current.count >= limit) return { allowed: false, retryAfter: Math.max(1, Math.ceil((current.reset - now) / 1000)) };
  current.count += 1;
  return { allowed: true, retryAfter: 0 };
}

function demandPath(demandId: string) {
  const base = (process.env.BASE_PATH || "").trim().replace(/\/$/, "");
  const prefix = !base || base === "/" ? "" : base.startsWith("/") ? base : `/${base}`;
  return `${prefix}/painel/demanda?id=${encodeURIComponent(demandId)}`;
}

export function signCursor(scope: string, sequence: bigint, secret = cursorSecret()) {
  const payload = `${CURSOR_VERSION}.${scope}.${sequence.toString()}`;
  const mac = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${Buffer.from(payload).toString("base64url")}.${mac}`;
}

export function openCursor(token: string | null, scope: string): { sequence: bigint } | { error: "invalid" | "incompatible" } {
  if (!token) return { sequence: BigInt(0) };
  if (token.length > CURSOR_MAX) return { error: "invalid" };
  const [encoded, mac] = token.split(".");
  if (!encoded || !mac || token.split(".").length !== 2) return { error: "invalid" };
  let payload: string;
  try {
    payload = Buffer.from(encoded, "base64url").toString("utf8");
  } catch {
    return { error: "invalid" };
  }
  const expected = createHmac("sha256", cursorSecret()).update(payload).digest("base64url");
  const actual = Buffer.from(mac);
  const wanted = Buffer.from(expected);
  if (actual.length !== wanted.length || !timingSafeEqual(actual, wanted)) return { error: "invalid" };
  const [version, cursorScope, sequence] = payload.split(".");
  if (!version || !cursorScope || !sequence || !/^\d+$/.test(sequence)) return { error: "invalid" };
  if (version !== String(CURSOR_VERSION) || cursorScope !== scope) return { error: "incompatible" };
  return { sequence: BigInt(sequence) };
}

type FeedDraft = {
  type: "crm.sale_closed.v1" | "crm.production_requested.v1";
  opportunityId: string;
  saleId: string | null;
  demandId: string | null;
  customerName: string;
  serviceTitle: string;
  clientDueAt: Date | null;
  deduplicationKey: string;
};

async function writeEvent(tx: Prisma.TransactionClient, draft: FeedDraft) {
  const scope = feedScope();
  await tx.$queryRaw`SELECT "id" FROM "IntegrationFeedCounter" WHERE "id" = ${COUNTER_ID} FOR UPDATE`;
  const rows = await tx.$queryRaw<Array<{ value: bigint }>>`
    UPDATE "IntegrationFeedCounter" SET "value" = "value" + 1 WHERE "id" = ${COUNTER_ID} RETURNING "value"
  `;
  const sequence = rows[0]?.value;
  if (sequence == null) throw new IntegrationConfigError("Contador do feed ausente.");
  const data = eventDataSchema.parse({
    opportunityId: draft.opportunityId,
    saleId: draft.saleId,
    demandId: draft.demandId,
    customerName: draft.customerName,
    serviceTitle: draft.serviceTitle,
    clientDueAt: draft.clientDueAt ? draft.clientDueAt.toISOString() : null,
    source: "CRM",
    demandPath: draft.demandId ? demandPath(draft.demandId) : null,
  });
  const eventId = randomUUID();
  await tx.integrationEvent.create({
    data: {
      id: eventId,
      eventId,
      type: draft.type,
      schemaVersion: FEED_SCHEMA_VERSION,
      occurredAt: new Date(),
      payload: data,
      deduplicationKey: draft.type === "crm.sale_closed.v1"
        ? `${draft.type}:${draft.opportunityId}:${sequence.toString()}`
        : draft.deduplicationKey,
      scope,
      sequence,
    },
  });
}

export async function captureSaleClosed(tx: Prisma.TransactionClient, input: {
  opportunityId: string;
  customerName: string;
  serviceTitle: string;
  previousStage: string;
}) {
  if (armedCapture() !== "sale_closed" || input.previousStage === "FECHADO") return;
  await writeEvent(tx, {
    type: "crm.sale_closed.v1",
    opportunityId: input.opportunityId,
    saleId: null,
    demandId: null,
    customerName: input.customerName,
    serviceTitle: input.serviceTitle,
    clientDueAt: null,
    deduplicationKey: "crm.sale_closed.v1",
  });
}

export async function captureProductionRequested(tx: Prisma.TransactionClient, input: {
  opportunityId: string;
  saleId: string;
  demandId: string;
  customerName: string;
  serviceTitle: string;
  clientDueAt: Date;
}) {
  if (armedCapture() !== "production_requested") return;
  await writeEvent(tx, {
    type: "crm.production_requested.v1",
    opportunityId: input.opportunityId,
    saleId: input.saleId,
    demandId: input.demandId,
    customerName: input.customerName,
    serviceTitle: input.serviceTitle,
    clientDueAt: input.clientDueAt,
    deduplicationKey: `crm.production_requested.v1:${input.demandId}`,
  });
}

async function publish(work: (tx: Prisma.TransactionClient) => Promise<void>) {
  try {
    await prisma.$transaction(work);
  } catch {
    return;
  }
}

export function publishSaleClosed(input: {
  opportunityId: string;
  customerName: string;
  serviceTitle: string;
  previousStage: string;
}) {
  if (armedCapture() !== "sale_closed" || input.previousStage === "FECHADO") return;
  return publish(tx => captureSaleClosed(tx, input));
}

export function publishProductionRequested(input: {
  opportunityId: string;
  saleId: string;
  demandId: string;
  customerName: string;
  serviceTitle: string;
  clientDueAt: Date;
}) {
  if (armedCapture() !== "production_requested") return;
  return publish(tx => captureProductionRequested(tx, input));
}

export function parseLimit(value: string | null) {
  if (value == null || value === "") return 50;
  if (!/^\d+$/.test(value)) return null;
  const limit = Number(value);
  if (limit < 1 || limit > 100) return null;
  return limit;
}

export async function readFeed(cursor: string | null, limit: number) {
  const config = readFeedConfig();
  const opened = openCursor(cursor, config.scope);
  if ("error" in opened) return opened;
  const rows = await prisma.integrationEvent.findMany({
    where: { scope: config.scope, sequence: { gt: opened.sequence } },
    orderBy: { sequence: "asc" },
    take: limit + 1,
    select: { eventId: true, type: true, schemaVersion: true, occurredAt: true, payload: true, sequence: true },
  });
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const events = page.map(row => ({
    eventId: row.eventId,
    type: row.type,
    schemaVersion: row.schemaVersion,
    occurredAt: row.occurredAt.toISOString(),
    data: eventDataSchema.parse(row.payload),
  }));
  const last = page.at(-1);
  const nextCursor = last ? signCursor(config.scope, last.sequence, config.cursorSecret) : cursor ?? signCursor(config.scope, BigInt(0), config.cursorSecret);
  return { schemaVersion: FEED_SCHEMA_VERSION, captureMode: config.mode, events, nextCursor, hasMore };
}
