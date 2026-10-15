import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionUser } from "@/lib/auth";
const { tx, transaction, findFirst } = vi.hoisted(() => ({ tx: { deliverable: { findUnique: vi.fn() }, scriptAttachment: { create: vi.fn() }, auditLog: { create: vi.fn() } }, transaction: vi.fn(), findFirst: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: transaction, scriptAttachment: { findFirst } } }));
import { MAX_SCRIPT_FILE_SIZE, validateScriptFile, uploadScriptAttachment, downloadScriptAttachment } from "./attachment-service";
const manager: SessionUser = { id: "manager", name: "Gestora", email: "manager@example.test", role: "GESTOR_GARRO" };
const text = Buffer.from("Ação\nRoteiro com informação adicional.");
beforeEach(() => {
  vi.resetAllMocks(); transaction.mockImplementation(fn => fn(tx)); tx.deliverable.findUnique.mockResolvedValue({ id: "task" });
  tx.scriptAttachment.create.mockResolvedValue({ id: "attachment", fileName: "ação.txt", size: text.length, createdAt: new Date() });
});
describe("anexos privados de Script", () => {
  it("aceita TXT UTF-8 e UTF-16, PDF e DOC com assinaturas compatíveis", () => {
    expect(validateScriptFile("ação.TXT", text)).toBe("text/plain");
    expect(validateScriptFile("windows.txt", Buffer.concat([Buffer.from([255, 254]), Buffer.from("Ação", "utf16le")]))).toBe("text/plain");
    expect(validateScriptFile("roteiro.pdf", Buffer.from("%PDF-1.7\n"))).toBe("application/pdf");
    expect(validateScriptFile("roteiro.doc", Buffer.from("d0cf11e0a1b11ae100000000", "hex"))).toBe("application/msword");
  });
  it.each(["arquivo.exe", "arquivo.docx", "../arquivo.txt", "pasta\\arquivo.txt", "arquivo\n.txt"])("rejeita extensão ou nome inseguro: %s", name => expect(() => validateScriptFile(name, text)).toThrow());
  it.each(["falso.pdf", "falso.doc"])("rejeita arquivo disfarçado: %s", name => expect(() => validateScriptFile(name, text)).toThrow("conteúdo"));
  it("rejeita texto binário, arquivo vazio e excesso de tamanho", () => {
    expect(() => validateScriptFile("binario.txt", Buffer.from([0, 1, 2]))).toThrow("conteúdo");
    expect(() => validateScriptFile("vazio.txt", Buffer.alloc(0))).toThrow("vazio");
    expect(() => validateScriptFile("grande.txt", Buffer.alloc(MAX_SCRIPT_FILE_SIZE + 1))).toThrow("10 MB");
    expect(validateScriptFile("limite.txt", Buffer.alloc(MAX_SCRIPT_FILE_SIZE, 65))).toBe("text/plain");
  });
  it.each(["EDITOR", "ATENDENTE"] as const)("bloqueia upload por %s antes de acessar o banco", async role => {
    await expect(uploadScriptAttachment({ ...manager, role }, "task", "ação.txt", text)).rejects.toMatchObject({ status: 403 });
    expect(transaction).not.toHaveBeenCalled();
  });
  it("salva bytes e metadados com auditoria na mesma transação sem devolver conteúdo", async () => {
    const result = await uploadScriptAttachment(manager, "task", "ação.txt", text);
    expect(tx.scriptAttachment.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ content: text, deliverableId: "task", uploadedById: manager.id }) }));
    expect(tx.auditLog.create).toHaveBeenCalled(); expect(result).not.toHaveProperty("content");
  });
  it("não grava quando o entregável não existe", async () => {
    tx.deliverable.findUnique.mockResolvedValue(null);
    await expect(uploadScriptAttachment(manager, "missing", "ação.txt", text)).rejects.toMatchObject({ status: 404 });
    expect(tx.scriptAttachment.create).not.toHaveBeenCalled();
  });
  it("atendente não baixa e editor só consulta arquivo com atribuição própria", async () => {
    await expect(downloadScriptAttachment({ ...manager, role: "ATENDENTE" }, "attachment")).rejects.toMatchObject({ status: 403 });
    expect(findFirst).not.toHaveBeenCalled();
    findFirst.mockResolvedValue(null);
    await expect(downloadScriptAttachment({ ...manager, id: "editor", role: "EDITOR" }, "attachment")).rejects.toMatchObject({ status: 404 });
    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "attachment", deliverable: { editorId: "editor" } } }));
  });
});
