"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { isRedirectError } from "@/lib/redirect";
import { CrmFlowError } from "@/modules/crm/send-to-production";
import { executeCrmCommand } from "./crm-service";
import { loadPanelState } from "./state";
import { executeProductionCommand } from "./production-service";

export async function refreshPanel() {
  return loadPanelState(await requireUser());
}

export async function mutateCrmPanel(input: unknown) {
  const user = await requireUser();
  try {
    await executeCrmCommand(user, input);
    revalidatePath("/painel", "layout");
    revalidatePath("/crm");
    revalidatePath("/demandas");
    return { state: await loadPanelState(user) };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { error: error instanceof CrmFlowError ? error.message : "Não foi possível salvar. Seus dados continuam no formulário; tente novamente." };
  }
}

export async function mutateProductionPanel(input: unknown) {
  const user = await requireUser();
  try {
    const createdId = await executeProductionCommand(user, input);
    return { state: await loadPanelState(user), ...(typeof createdId === "string" ? { createdId } : {}) };
  } catch (error) {
    if (isRedirectError(error) && typeof error === "object" && error !== null && "digest" in error) {
      const url = String(error.digest).split(";")[2];
      const message = new URL(url, "http://localhost").searchParams.get("erro");
      if (!message) throw error;
      return { error: message };
    }
    return { error: error instanceof CrmFlowError ? error.message : "Não foi possível salvar a alteração. Tente novamente." };
  }
}
