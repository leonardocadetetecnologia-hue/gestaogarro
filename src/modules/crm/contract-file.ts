import type { SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AttachmentError } from "@/modules/production/attachment-service";
import { canAccessOpportunity } from "./visibility";

const MAX_CONTRACT_FILE = 10 * 1024 * 1024;

export function contractMime(name: string, content: Uint8Array) {
  if (!name || name.length > 180 || /[\x00-\x1f\x7f/\\]/.test(name)) throw new AttachmentError("Nome de arquivo inválido.");
  if (!content.byteLength) throw new AttachmentError("O arquivo está vazio.");
  if (content.byteLength > MAX_CONTRACT_FILE) throw new AttachmentError("O contrato pode ter até 10 MB.", 413);
  const extension = name.toLowerCase().match(/\.(pdf|png|jpe?g|webp)$/)?.[1];
  const bytes = Buffer.from(content);
  if (extension === "pdf" && bytes.subarray(0, 5).toString("ascii") === "%PDF-") return "application/pdf";
  if ((extension === "jpg" || extension === "jpeg") && bytes[0] === 0xff && bytes[1] === 0xd8) return "image/jpeg";
  if (extension === "png" && bytes.subarray(0, 4).toString("hex") === "89504e47") return "image/png";
  if (extension === "webp" && bytes.subarray(0, 4).toString("ascii") === "RIFF") return "image/webp";
  throw new AttachmentError("Anexe um PDF ou uma imagem do contrato.", 415);
}

export async function saveContractFile(user: SessionUser, opportunityId: string, fileName: string, content: Uint8Array) {
  if (user.role === "EDITOR") throw new AttachmentError("O contrato é do comercial.", 403);
  const mimeType = contractMime(fileName, content);
  const opportunity = await prisma.opportunity.findUnique({ where: { id: opportunityId }, select: { id: true, responsibleId: true, stage: true } });
  if (!opportunity || !canAccessOpportunity(user, opportunity.responsibleId)) throw new AttachmentError("Oportunidade não encontrada.", 404);
  if (opportunity.stage !== "CONTRATO" && opportunity.stage !== "FECHADO") throw new AttachmentError("Anexe o contrato na etapa Contrato.");
  await prisma.opportunity.update({ where: { id: opportunity.id }, data: {
    contractFileName: fileName, contractMime: mimeType, contractFile: Buffer.from(content), stage: "CONTRATO", outcome: "GANHA",
  } });
  await prisma.auditLog.create({ data: { userId: user.id, action: "CONTRACT_FILE_SAVED", entityType: "Opportunity", entityId: opportunity.id, details: { size: content.byteLength } } });
  return { fileName };
}
