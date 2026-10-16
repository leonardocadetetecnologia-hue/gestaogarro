import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { captureProductionRequested } from "./integration-feed";

const url = process.env.TEST_DATABASE_URL ?? "";
const localTestDatabase = /^postgres(?:ql)?:\/\/[^@]+@(?:127\.0\.0\.1|localhost)(?::\d+)?\/[^?\s]*test/i.test(url);

describe.skipIf(!localTestDatabase)("feed em PostgreSQL isolado", () => {
  const prisma = new PrismaClient({ datasources: { db: { url: localTestDatabase ? url : "postgresql://localhost:5432/garro_test" } } });

  beforeAll(async () => {
    process.env.GARRO_EVENT_CAPTURE_MODE = "production_requested";
    process.env.GARRO_EVENTS_SCOPE = "empresa-a";
    process.env.GARRO_EVENTS_CURSOR_SECRET = "segredo-de-cursor-com-pelo-menos-32-caracteres";
    process.env.GARRO_EVENTS_TOKEN_SHA256 = "a".repeat(64);
    await prisma.$queryRaw`SELECT "id" FROM "IntegrationFeedCounter" WHERE "id" = 'feed'`;
    await prisma.integrationEvent.deleteMany();
    await prisma.$executeRaw`UPDATE "IntegrationFeedCounter" SET "value" = 0 WHERE "id" = 'feed'`;
  });

  afterAll(async () => {
    delete process.env.GARRO_EVENT_CAPTURE_MODE;
    await prisma.$disconnect();
  });

  async function record(demandId: string, holdMs = 0) {
    await prisma.$transaction(async tx => {
      await captureProductionRequested(tx, {
        opportunityId: "op", saleId: "sale", demandId, customerName: "Ana", serviceTitle: "Vídeo", clientDueAt: new Date("2026-11-01T18:00:00.000Z"),
      });
      if (holdMs) await new Promise(resolve => setTimeout(resolve, holdMs));
    });
  }

  it("não publica a transação rápida antes da lenta e desfaz o incremento no rollback", async () => {
    let release: () => void = () => {};
    const hold = new Promise<void>(resolve => { release = resolve; });
    const slow = prisma.$transaction(async tx => {
      await captureProductionRequested(tx, {
        opportunityId: "op", saleId: "sale", demandId: "lenta", customerName: "Ana", serviceTitle: "Vídeo", clientDueAt: new Date("2026-11-01T18:00:00.000Z"),
      });
      await hold;
    });
    await new Promise(resolve => setTimeout(resolve, 100));
    const fast = record("rapida");
    expect(await prisma.integrationEvent.count()).toBe(0);
    release();
    await Promise.all([slow, fast]);
    const committed = await prisma.integrationEvent.findMany({ orderBy: { sequence: "asc" } });
    expect(committed.map(event => event.deduplicationKey)).toEqual([
      "crm.production_requested.v1:lenta",
      "crm.production_requested.v1:rapida",
    ]);

    await prisma.integrationEvent.deleteMany();
    await prisma.$executeRaw`UPDATE "IntegrationFeedCounter" SET "value" = 0 WHERE "id" = 'feed'`;
    const rolled = prisma.$transaction(async tx => {
      await captureProductionRequested(tx, {
        opportunityId: "op", saleId: "sale", demandId: "cancelada", customerName: "Ana", serviceTitle: "Vídeo", clientDueAt: new Date("2026-11-01T18:00:00.000Z"),
      });
      throw new Error("rollback");
    }).catch(() => undefined);
    await Promise.all([rolled, record("mantida")]);
    const left = await prisma.integrationEvent.findMany();
    expect(left.map(event => event.deduplicationKey)).toEqual(["crm.production_requested.v1:mantida"]);
    expect(left[0]?.sequence).toBe(BigInt(1));
  });
});
