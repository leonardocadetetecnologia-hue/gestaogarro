"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Role, Customer, Opportunity, Stage, TaskStatus, State } from "./data";
type FutureInput = { futureContact: "sim" | "nao"; futureAt: string; responsibleId?: string; reason?: string };
import { mutateCrmPanel, mutateProductionPanel, refreshPanel } from "@/modules/painel/actions";
import type { CrmCommand } from "@/modules/painel/crm-service";
import type { ProductionCommand } from "@/modules/painel/production-service";
import type { DemandMediaType } from "@/lib/demand-media-type";
import type { DirectDemandInput } from "@/modules/production/create-demand";

type Save = Promise<boolean>;
type Closing = { title: string; description: string; amount: string; due: string; deliverables: string; mediaType: DemandMediaType };
type Ctx = {
  state: State; role: Role; ready: boolean; activeEditorId: string; userName: string;
  busy: boolean; error: string;
  updateCustomer: (c: Customer) => Save;
  addCustomer: (c: Customer, value: number | null) => Save;
  addOpportunity: (customerId: string, service: string) => Save;
  updateOpportunityValue: (id: string, value: number | null) => Save;
  createDemand: (input: DirectDemandInput) => Promise<string | false>;
  updateDemand: (input: { id: string; title: string; description: string; due: string; links: string }) => Save;
  saveDemandMedia: (input: { id: string; hd: string; drive: string }) => Save;
  addDeliverable: (demandId: string, title: string) => Save;
  renameDeliverable: (id: string, title: string) => Save;
  moveOpportunity: (id: string, stage: Stage, future?: { futureContact: "sim" | "nao"; futureAt: string }) => Save;
  loseOpportunity: (id: string, input: { reason: string; futureContact: "sim" | "nao"; futureAt: string; responsibleId: string }) => Save;
  saveFutureContact: (id: string, input: FutureInput) => Save;
  saveKanbanLabels: (labels: { stage: Stage; label: string }[]) => Save;
  recordContact: (id: string, summary: string, waitingOn: Opportunity["waitingOn"], nextAction: string, nextAt: string) => Save;
  closeSale: (id: string, input: Closing) => Save;
  sendMessage: (id: string, message: string) => Save;
  setTaskStatus: (id: string, status: TaskStatus) => Save;
  saveTaskScript: (id: string, script: string, previous: string) => Save;
  markDelivered: (id: string) => Save;
  assignEditor: (id: string, editorId: string, editorDue?: string, reviewDue?: string) => Save;
  assignMany: (input: { demandId: string; deliverableIds: string[]; editorId: string; editorDue: string; reviewDue: string }) => Save;
  updateTaskDue: (id: string, field: "editorDue" | "reviewDue" | "clientDue", value: string) => Save;
  readAlert: (id: string) => Save;
};
const Context = createContext<Ctx | null>(null);

export function GarroProvider({ children, role, userName, userId, initialState }: {
  children: ReactNode; role: Role; userName: string; userId: string; initialState: State;
}) {
  const [state, setState] = useState(initialState);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const revision = useRef(0);
  useEffect(() => { setState(initialState); }, [initialState]);

  const refresh = useCallback(async () => {
    if (busyRef.current || document.visibilityState !== "visible") return;
    const current = revision.current;
    try {
      const next = await refreshPanel();
      if (!busyRef.current && current === revision.current) setState(next);
    } catch { /* A próxima atualização tenta novamente; uma gravação sempre informa falhas. */ }
  }, []);
  useEffect(() => {
    const handleFocus = () => { void refresh(); };
    window.addEventListener("focus", handleFocus);
    const timer = window.setInterval(handleFocus, 30000);
    return () => { window.removeEventListener("focus", handleFocus); window.clearInterval(timer); };
  }, [refresh]);

  async function save(command: CrmCommand | ProductionCommand, production = false) {
    if (busyRef.current) return { ok: false as const };
    busyRef.current = true; revision.current += 1; setBusy(true); setError(""); setNotice("");
    try {
      const result = await (production ? mutateProductionPanel(command) : mutateCrmPanel(command));
      if ("error" in result) { setError(result.error || "Não foi possível salvar."); return { ok: false as const }; }
      setState(result.state);
      if (command.kind === "send") setNotice("Enviado para produção. A demanda está disponível para a Gestora.");
      const createdId = "createdId" in result && typeof result.createdId === "string" ? result.createdId : undefined;
      return { ok: true as const, createdId };
    } catch { setError("Não foi possível salvar. Confira sua conexão e tente novamente."); return { ok: false as const }; }
    finally { busyRef.current = false; setBusy(false); }
  }
  const done = (work: ReturnType<typeof save>): Save => work.then((result) => result.ok);

  const value: Ctx = {
    state, role, ready: true, activeEditorId: userId, userName, busy, error,
    updateCustomer: customer => done(save({ kind: "updateCustomer", customer: { ...customer, kind: customer.kind || "LEAD", birthDate: customer.birthDate || "" } })),
    addCustomer: (customer, amount) => done(save({ kind: "createCustomer", customer: { ...customer, kind: customer.kind || "LEAD", birthDate: customer.birthDate || "" }, value: amount })),
    addOpportunity: (customerId, service) => done(save({ kind: "createOpportunity", customerId, service })),
    updateOpportunityValue: (id, amount) => done(save({ kind: "value", id, value: amount })),
    createDemand: async input => {
      const result = await save({ kind: "createDemand", input }, true);
      return result.ok && result.createdId ? result.createdId : false;
    },
    updateDemand: input => done(save({ kind: "updateDemand", input }, true)),
    saveDemandMedia: input => done(save({ kind: "demandMedia", input }, true)),
    addDeliverable: (demandId, title) => done(save({ kind: "addDeliverable", input: { demandId, title } }, true)),
    renameDeliverable: (id, title) => done(save({ kind: "renameDeliverable", input: { id, title } }, true)),
    moveOpportunity: (id, stage, future) => done(save({ kind: "move", id, stage, ...future })),
    loseOpportunity: (id, input) => done(save({ kind: "lose", id, ...input })),
    saveFutureContact: (id, input) => done(save({ kind: "futureContact", id, futureContact: input.futureContact, futureAt: input.futureAt, responsibleId: input.responsibleId || "", reason: input.reason || "" })),
    saveKanbanLabels: labels => done(save({ kind: "kanbanLabels", labels })),
    recordContact: (id, summary, waitingOn, nextAction, nextAt) => done(save({ kind: "contact", id, summary, waitingOn, nextAction, nextAt })),
    closeSale: (opportunityId, input) => done(save({ kind: "send", submission: {
      opportunityId, title: input.title, description: input.description, amount: input.amount,
      mediaType: input.mediaType, due: input.due, deliverables: input.deliverables.split("\n").map(t => t.trim()).filter(Boolean),
    } })),
    sendMessage: (id, message) => done(save({ kind: "message", id, message }, true)),
    setTaskStatus: (id, status) => done(save({ kind: "status", id, status }, true)),
    saveTaskScript: (id, script, previous) => done(save({ kind: "script", input: { id, script, previous } }, true)),
    markDelivered: id => done(save({ kind: "delivered", id }, true)),
    assignEditor: (id, editorId, editorDue, reviewDue) => done(save({ kind: "assign", id, editorId, editorDue, reviewDue }, true)),
    assignMany: input => done(save({ kind: "assignMany", ...input }, true)),
    updateTaskDue: (id, field, input) => done(save({ kind: "due", id, field, value: input }, true)),
    readAlert: id => done(save({ kind: "read", id }, true)),
  };
  return <Context.Provider value={value}>
    {(error || notice) && <div className={`panel-feedback ${error ? "panel-feedback-error" : ""}`} role={error ? "alert" : "status"}>
      <span>{error || notice}</span><button type="button" className="icon-button" aria-label="Fechar aviso" onClick={() => { setError(""); setNotice(""); }}>×</button>
    </div>}
    {children}
  </Context.Provider>;
}
export function useGarro() {
  const value = useContext(Context);
  if (!value) throw new Error("GarroProvider necessário");
  return value;
}
