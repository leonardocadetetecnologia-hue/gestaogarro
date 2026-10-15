"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Role, Customer, Opportunity, Stage, TaskStatus, State } from "./data";
import { mutateCrmPanel, mutateProductionPanel, refreshPanel } from "@/modules/painel/actions";
import type { CrmCommand } from "@/modules/painel/crm-service";
import type { ProductionCommand } from "@/modules/painel/production-service";
import type { DirectDemandInput } from "@/modules/production/create-demand";

type Save = Promise<boolean>;
type Closing = { title: string; description: string; amount: string; due: string; deliverables: string };
type Ctx = {
  state: State; role: Role; ready: boolean; activeEditorId: string; userName: string;
  busy: boolean; error: string;
  updateCustomer: (c: Customer) => Save;
  addCustomer: (c: Customer, value: number | null) => Save;
  addOpportunity: (customerId: string, service: string) => Save;
  createDemand: (input: DirectDemandInput) => Save;
  moveOpportunity: (id: string, stage: Stage) => Save;
  loseOpportunity: (id: string, reason: string) => Save;
  recordContact: (id: string, summary: string, waitingOn: Opportunity["waitingOn"], nextAction: string, nextAt: string) => Save;
  closeSale: (id: string, input: Closing) => Save;
  sendMessage: (id: string, message: string) => Save;
  setTaskStatus: (id: string, status: TaskStatus) => Save;
  markDelivered: (id: string) => Save;
  assignEditor: (id: string, editorId: string, editorDue?: string, reviewDue?: string) => Save;
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

  async function save(command: CrmCommand | ProductionCommand, production = false): Save {
    if (busyRef.current) return false;
    busyRef.current = true; revision.current += 1; setBusy(true); setError(""); setNotice("");
    try {
      const result = await (production ? mutateProductionPanel(command) : mutateCrmPanel(command));
      if ("error" in result) { setError(result.error || "Não foi possível salvar."); return false; }
      setState(result.state);
      if (command.kind === "send") setNotice("Enviado para produção. A demanda está disponível para a Gestora.");
      return true;
    } catch { setError("Não foi possível salvar. Confira sua conexão e tente novamente."); return false; }
    finally { busyRef.current = false; setBusy(false); }
  }

  const value: Ctx = {
    state, role, ready: true, activeEditorId: userId, userName, busy, error,
    updateCustomer: customer => save({ kind: "updateCustomer", customer: { ...customer, kind: customer.kind || "LEAD" } }),
    addCustomer: (customer, amount) => save({ kind: "createCustomer", customer: { ...customer, kind: customer.kind || "LEAD" }, value: amount }),
    addOpportunity: (customerId, service) => save({ kind: "createOpportunity", customerId, service }),
    createDemand: input => save({ kind: "createDemand", input }, true),
    moveOpportunity: (id, stage) => save({ kind: "move", id, stage }),
    loseOpportunity: (id, reason) => save({ kind: "lose", id, reason }),
    recordContact: (id, summary, waitingOn, nextAction, nextAt) => save({ kind: "contact", id, summary, waitingOn, nextAction, nextAt }),
    closeSale: (opportunityId, input) => save({ kind: "send", submission: {
      opportunityId, title: input.title, description: input.description, amount: input.amount,
      due: input.due, deliverables: input.deliverables.split("\n").map(t => t.trim()).filter(Boolean),
    } }),
    sendMessage: (id, message) => save({ kind: "message", id, message }, true),
    setTaskStatus: (id, status) => save({ kind: "status", id, status }, true),
    markDelivered: id => save({ kind: "delivered", id }, true),
    assignEditor: (id, editorId, editorDue, reviewDue) => save({ kind: "assign", id, editorId, editorDue, reviewDue }, true),
    updateTaskDue: (id, field, input) => save({ kind: "due", id, field, value: input }, true),
    readAlert: id => save({ kind: "read", id }, true),
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
