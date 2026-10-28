import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionUser } from "@/lib/auth";
import { assignAttendantTask, canCompleteAttendantTask, canDeleteAttendantTask, createPersonalTask, deleteAttendantTask } from "./attendant-task";

const { db } = vi.hoisted(() => {
  const db = {
    user: { findFirst: vi.fn() },
    scheduleEvent: { create: vi.fn(), findUnique: vi.fn(), delete: vi.fn(), update: vi.fn() },
    notification: { create: vi.fn() },
    auditLog: { create: vi.fn() },
    $transaction: vi.fn(),
  };
  db.$transaction.mockImplementation(async (work: (client: typeof db) => Promise<unknown>) => work(db));
  return { db };
});
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const gestora: SessionUser = { id: "gestora", name: "Gestora", email: "gestora@example.test", role: "GESTOR_GARRO" };
const ana: SessionUser = { id: "ana", name: "Ana", email: "ana@example.test", role: "ATENDENTE" };
const assigned = { type: "TAREFA_ATENDENTE", userId: "ana", createdById: "gestora", createdByRole: "GESTOR_GARRO" as const };
const personal = { type: "TAREFA_ATENDENTE", userId: "ana", createdById: "ana", createdByRole: "ATENDENTE" as const };

beforeEach(() => {
  vi.clearAllMocks();
  db.$transaction.mockImplementation(async (work: (client: typeof db) => Promise<unknown>) => work(db));
  db.user.findFirst.mockResolvedValue({ id: "ana", name: "Ana" });
  db.scheduleEvent.create.mockResolvedValue({ id: "evt" });
});

describe("função da atendente", () => {
  it("só a gestora exclui o que ela criou, e a atendente só exclui o compromisso pessoal", () => {
    expect(canDeleteAttendantTask(gestora, assigned)).toBe(true);
    expect(canDeleteAttendantTask(ana, assigned)).toBe(false);
    expect(canDeleteAttendantTask(ana, personal)).toBe(true);
    expect(canDeleteAttendantTask(gestora, personal)).toBe(false);
    expect(canCompleteAttendantTask(ana, assigned)).toBe(true);
    expect(canCompleteAttendantTask(gestora, personal)).toBe(false);
  });

  it("grava a função na agenda da atendente e avisa", async () => {
    await assignAttendantTask(gestora, { assigneeId: "ana", title: "Cobrar o contrato", date: "2026-11-02", time: "" });
    expect(db.scheduleEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ userId: "ana", createdById: "gestora", type: "TAREFA_ATENDENTE", title: "Cobrar o contrato" }),
    }));
    expect(db.notification.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ userId: "ana", title: "Nova função", message: "Cobrar o contrato", href: "/painel/agenda" }),
    }));
  });

  it("a atendente cria o compromisso pessoal sem aviso, e não apaga função da gestora", async () => {
    await createPersonalTask(ana, { title: "Revisar a semana", date: "2026-11-06", time: "09:00" });
    expect(db.scheduleEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ userId: "ana", createdById: "ana", title: "Revisar a semana" }),
    }));
    expect(db.notification.create).not.toHaveBeenCalled();
    db.scheduleEvent.findUnique.mockResolvedValue({ id: "evt", type: "TAREFA_ATENDENTE", userId: "ana", createdById: "gestora", status: "PENDENTE", createdBy: { role: "GESTOR_GARRO" } });
    await expect(deleteAttendantTask(ana, "evt")).rejects.toThrow(/Só quem criou/);
    expect(db.scheduleEvent.delete).not.toHaveBeenCalled();
  });
});
