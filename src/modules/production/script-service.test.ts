import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionUser } from "@/lib/auth";
const { tx, transaction } = vi.hoisted(() => ({ tx: {
  $queryRaw: vi.fn(), deliverable: { findUnique: vi.fn(), update: vi.fn() }, auditLog: { create: vi.fn() },
}, transaction: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: transaction } }));
import { saveDeliverableScript } from "./script-service";
const user: SessionUser = { id: "manager", name: "Gestora", email: "manager@example.test", role: "GESTOR_GARRO" };
beforeEach(() => {
  vi.resetAllMocks(); transaction.mockImplementation(async fn => fn(tx));
  tx.deliverable.findUnique.mockResolvedValue({ id: "task", description: null });
});
describe("script por entregável", () => {
  it("persiste 10.000 caracteres preservando linhas e acentos na mesma transação da auditoria", async () => {
    const script = "Ação\n".repeat(2000);
    await saveDeliverableScript(user, { id: "task", script, previous: "" });
    expect(tx.deliverable.update).toHaveBeenCalledWith({ where: { id: "task" }, data: { description: script } });
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ entityId: "task", details: { characters: 10000 } }) }));
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(tx.deliverable.findUnique.mock.invocationCallOrder[0]);
  });
  it("rejeita excesso de caracteres antes de gravar", async () => {
    await expect(saveDeliverableScript(user, { id: "task", script: "x".repeat(10001), previous: "" })).rejects.toThrow("10.000");
    expect(transaction).not.toHaveBeenCalled();
  });
  it.each(["EDITOR", "ATENDENTE"] as const)("bloqueia edição pelo perfil %s", async role => {
    await expect(saveDeliverableScript({ ...user, role }, { id: "task", script: "Roteiro", previous: "" })).rejects.toThrow("Somente a Gestora");
    expect(transaction).not.toHaveBeenCalled();
  });
  it("permite apagar o texto sem remover o entregável", async () => {
    tx.deliverable.findUnique.mockResolvedValue({ id: "task", description: "Antigo" });
    await saveDeliverableScript(user, { id: "task", script: "", previous: "Antigo" });
    expect(tx.deliverable.update).toHaveBeenCalledWith({ where: { id: "task" }, data: { description: null } });
  });
  it("não sobrescreve alteração de outra sessão", async () => {
    tx.deliverable.findUnique.mockResolvedValue({ id: "task", description: "Versão de outra sessão" });
    await expect(saveDeliverableScript(user, { id: "task", script: "Meu texto", previous: "" })).rejects.toThrow("outra sessão");
    expect(tx.deliverable.update).not.toHaveBeenCalled();
  });
  it("não repete a gravação quando o script já foi salvo", async () => {
    tx.deliverable.findUnique.mockResolvedValue({ id: "task", description: "Roteiro" });
    await saveDeliverableScript(user, { id: "task", script: "Roteiro", previous: "" });
    expect(tx.deliverable.update).not.toHaveBeenCalled(); expect(tx.auditLog.create).not.toHaveBeenCalled();
  });
  it("informa quando o entregável não existe", async () => {
    tx.deliverable.findUnique.mockResolvedValue(null);
    await expect(saveDeliverableScript(user, { id: "missing", script: "Roteiro", previous: "" })).rejects.toThrow("não encontrado");
  });
});
