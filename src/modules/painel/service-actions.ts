import { z } from "zod";
import type { SessionUser } from "@/lib/auth";
import { CrmFlowError } from "@/modules/crm/send-to-production";
import { archiveService, removeService, restoreService, reviewServiceProposal, saveService } from "@/modules/services/commands";
import { normalizeServiceInput } from "@/modules/services/rules";

const commandSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("save"), id: z.string(), service: z.unknown() }),
  z.object({ kind: z.literal("archive"), id: z.string().min(1) }),
  z.object({ kind: z.literal("restore"), id: z.string().min(1) }),
  z.object({ kind: z.literal("remove"), id: z.string().min(1) }),
  z.object({ kind: z.literal("review"), id: z.string().min(1), decision: z.enum(["autorizar", "recusar"]), comment: z.string() }),
]);

export async function executeServiceCommand(user: SessionUser, input: unknown) {
  const parsed = commandSchema.safeParse(input);
  if (!parsed.success) throw new CrmFlowError("Não foi possível ler esta alteração de serviço.");
  const command = parsed.data;
  const manager = user.role === "GESTOR_GARRO";
  if (command.kind === "save") {
    const snapshot = normalizeServiceInput(command.service, manager);
    await saveService(user, command.id, snapshot, manager);
    return;
  }
  if (command.kind === "archive") return archiveService(user, command.id);
  if (command.kind === "restore") return restoreService(user, command.id);
  if (command.kind === "remove") return removeService(user, command.id);
  await reviewServiceProposal(user, command.id, command.decision, command.comment);
}
