import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionUser } from "@/lib/auth";

const { db } = vi.hoisted(() => ({
  db: { notification: { updateMany: vi.fn() } },
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));
import { executeProductionCommand } from "./production-service";

const pessoa: SessionUser = { id: "pessoa", name: "Pessoa", email: "pessoa@example.test", role: "ATENDENTE" };

beforeEach(() => {
  db.notification.updateMany.mockReset();
  db.notification.updateMany.mockResolvedValue({ count: 0 });
});

describe("marcar notificações como lidas", () => {
  it("marca todas as não lidas visíveis da pessoa, sem limitar às da tela", async () => {
    await executeProductionCommand(pessoa, { kind: "readAll" });
    expect(db.notification.updateMany).toHaveBeenCalledTimes(1);
    const query = db.notification.updateMany.mock.calls[0][0];
    expect(query.where).toEqual({
      userId: "pessoa",
      readAt: null,
      OR: [{ visibleAt: null }, { visibleAt: { lte: expect.any(Date) } }],
    });
    expect(query.where).not.toHaveProperty("id");
    expect(query).not.toHaveProperty("take");
    expect(query.data.readAt).toBeInstanceOf(Date);
    const cutoff = query.where.OR[1].visibleAt.lte as Date;
    expect(Math.abs(cutoff.getTime() - Date.now())).toBeLessThan(5000);
  });

  it("marca só as escolhidas da pessoa logada e ignora outro usuário no filtro", async () => {
    await executeProductionCommand(pessoa, { kind: "readSelected", ids: ["minha", "de-outra"] });
    expect(db.notification.updateMany).toHaveBeenCalledWith({
      where: { userId: "pessoa", id: { in: ["minha", "de-outra"] } },
      data: { readAt: expect.any(Date) },
    });
  });

  it("é idempotente quando a notificação já está lida e vale para atendente e editor", async () => {
    await expect(executeProductionCommand(pessoa, { kind: "read", id: "ja-lida" })).resolves.toBeUndefined();
    await expect(executeProductionCommand(pessoa, { kind: "readAll" })).resolves.toBeUndefined();
    await expect(executeProductionCommand({ ...pessoa, role: "EDITOR" }, { kind: "readSelected", ids: ["ja-lida"] })).resolves.toBeUndefined();
    expect(db.notification.updateMany).toHaveBeenCalledTimes(3);
  });

  it("não grava seleção vazia", async () => {
    await expect(executeProductionCommand(pessoa, { kind: "readSelected", ids: [] })).rejects.toThrow(/ao menos uma/);
    expect(db.notification.updateMany).not.toHaveBeenCalled();
  });
});
