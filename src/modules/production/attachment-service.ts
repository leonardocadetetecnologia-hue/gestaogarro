import type { SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const MAX_SCRIPT_FILE_SIZE = 10 * 1024 * 1024;
export const attachmentSelect = { id: true, fileName: true, size: true, createdAt: true } as const;

export class AttachmentError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export function validateScriptFile(name: string, content: Uint8Array) {
  if (!name || name.length > 180 || /[\x00-\x1f\x7f/\\]/.test(name)) throw new AttachmentError("Nome de arquivo inválido.");
  if (!content.byteLength) throw new AttachmentError("O arquivo está vazio.");
  if (content.byteLength > MAX_SCRIPT_FILE_SIZE) throw new AttachmentError("Cada anexo pode ter até 10 MB.", 413);
  const extension = name.toLowerCase().match(/\.(txt|doc|pdf)$/)?.[1];
  if (!extension) throw new AttachmentError("Selecione um arquivo .txt, .doc ou .pdf.", 415);
  const bytes = Buffer.from(content);
  if (extension === "pdf" && bytes.subarray(0, 5).toString("ascii") === "%PDF-") return "application/pdf";
  if (extension === "doc" && bytes.subarray(0, 8).equals(Buffer.from("d0cf11e0a1b11ae1", "hex"))) return "application/msword";
  if (extension === "txt") {
    try {
      const utf16 = (bytes[0] === 0xff && bytes[1] === 0xfe) || (bytes[0] === 0xfe && bytes[1] === 0xff);
      const text = new TextDecoder(utf16 ? bytes[0] === 0xff ? "utf-16le" : "utf-16be" : "utf-8", { fatal: true }).decode(bytes);
      if (!/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(text)) return "text/plain";
    } catch { /* Invalid text is rejected below. */ }
  }
  throw new AttachmentError("O conteúdo não corresponde ao formato do arquivo. Use um TXT, DOC ou PDF válido.", 415);
}

export async function uploadScriptAttachment(user: SessionUser, deliverableId: string, fileName: string, content: Uint8Array) {
  if (user.role !== "GESTOR_GARRO") throw new AttachmentError("Somente a Gestora pode anexar arquivos ao script.", 403);
  const mimeType = validateScriptFile(fileName, content);
  return prisma.$transaction(async tx => {
    const task = await tx.deliverable.findUnique({ where: { id: deliverableId }, select: { id: true } });
    if (!task) throw new AttachmentError("Entregável não encontrado.", 404);
    // Small briefing documents stay in PostgreSQL so metadata, bytes and audit commit together and share the database backup.
    const attachment = await tx.scriptAttachment.create({ data: {
      deliverableId, uploadedById: user.id, fileName, mimeType, size: content.byteLength, content: Buffer.from(content),
    }, select: attachmentSelect });
    await tx.auditLog.create({ data: { userId: user.id, action: "DELIVERABLE_SCRIPT_ATTACHED", entityType: "Deliverable", entityId: deliverableId,
      details: { attachmentId: attachment.id, size: attachment.size, mimeType } } });
    return { ...attachment, createdAt: attachment.createdAt.toISOString() };
  });
}

export async function downloadScriptAttachment(user: SessionUser, id: string) {
  if (user.role === "ATENDENTE") throw new AttachmentError("Acesso não permitido.", 403);
  const attachment = await prisma.scriptAttachment.findFirst({
    where: { id, ...(user.role === "EDITOR" ? { deliverable: { editorId: user.id } } : {}) },
    select: { fileName: true, mimeType: true, size: true, content: true },
  });
  if (!attachment) throw new AttachmentError("Anexo não encontrado ou acesso não permitido.", 404);
  return attachment;
}
