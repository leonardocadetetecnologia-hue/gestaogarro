"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Role, Customer, Opportunity, Stage, TaskStatus, State } from "./data";
type FutureInput = { futureContact: "sim" | "nao"; futureAt: string; responsibleId?: string; reason?: string; note?: string };
import { mutateCrmPanel, mutateProductionPanel, mutateServicePanel, refreshPanel } from "@/modules/painel/actions";
import type { ServiceSnapshot } from "@/modules/services/model";
import type { CrmCommand } from "@/modules/painel/crm-service";
import type { ProductionCommand } from "@/modules/painel/production-service";
import type { DemandMediaType } from "@/lib/demand-media-type";
import type { DirectDemandInput } from "@/modules/production/create-demand";

type Save = Promise<boolean>;
type Closing = { title: string; description: string; amount: string; due: string; deliverables: string; mediaType: DemandMediaType };
type CloseWon = {
  personType: "PESSOA_FISICA" | "EMPRESA";
  zip: string; street: string; addressNumber: string; complement: string; district: string; addressCity: string; state: string;
  birthdays: { name: string; birthDate: string }[];
  lines: { serviceId: string; variationName: string; amount: number | null }[];
};
type Ctx = {
  state: State; role: Role; ready: boolean; activeEditorId: string; userName: string;
  busy: boolean; error: string; reload: () => Promise<void>;
  updateCustomer: (c: Customer) => Save;
  addCustomer: (c: Customer, value: number | null) => Save;
  addOpportunity: (customerId: string, service: string) => Save;
  updateOpportunityValue: (id: string, value: number | null) => Save;
  createDemand: (input: DirectDemandInput) => Promise<string | false>;
  updateDemand: (input: { id: string; title: string; description: string; due: string; links: string; mediaType?: DemandMediaType | "" }) => Save;
  saveDemandMedia: (input: { id: string; hd: string; drive: string }) => Save;
  saveDeliveryLinks: (input: { id: string; links: string[] }) => Save;
  addDeliverable: (demandId: string, title: string) => Save;
  renameDeliverable: (id: string, title: string) => Save;
  archiveDeliverable: (id: string) => Save;
  restoreDeliverable: (id: string) => Save;
  moveOpportunity: (id: string, stage: Stage, future?: { futureContact: "sim" | "nao"; futureAt: string }) => Save;
  loseOpportunity: (id: string, input: { reason: string; note?: string; futureContact: "sim" | "nao"; futureAt: string; responsibleId: string }) => Save;
  saveFutureContact: (id: string, input: FutureInput) => Save;
  saveKanbanLabels: (labels: { stage: Stage; label: string }[]) => Save;
  recordContact: (id: string, summary: string, waitingOn: Opportunity["waitingOn"], nextAction: string, nextAt: string) => Save;
  closeSale: (id: string, input: Closing) => Save;
  closeWon: (id: string, input: CloseWon) => Save;
  saveContract: (id: string, input: { signed: boolean; signedAt: string }) => Save;
  saveServiceDates: (id: string, lines: { id: string; serviceDate: string; captureTime: string; capturePlace: string; proposedDays: number | null }[]) => Save;
  transferContract: (id: string, responsibleId: string) => Save;
  sendMessage: (id: string, message: string) => Save;
  setTaskStatus: (id: string, status: TaskStatus) => Save;
  saveTaskScript: (id: string, script: string, previous: string) => Save;
  markDelivered: (id: string) => Save;
  assignEditor: (id: string, editorId: string, editorDue?: string, reviewDue?: string) => Save;
  assignMany: (input: { demandId: string; deliverableIds: string[]; editorId: string; editorDue: string; reviewDue: string }) => Save;
  updateTaskDue: (id: string, field: "editorDue" | "reviewDue" | "clientDue", value: string) => Save;
  pauseClientDue: (id: string) => Save;
  confirmSelectionReturn: (id: string, returnDate: string) => Save;
  readAlert: (id: string) => Save;
  readSelectedAlerts: (ids: string[]) => Save;
  readAllAlerts: () => Save;
  assignAttendantTask: (input: { assigneeId: string; title: string; date: string; time: string }) => Save;
  createPersonalTask: (input: { title: string; date: string; time: string }) => Save;
  deleteAttendantTask: (id: string) => Save;
  completeAttendantTask: (id: string) => Save;
  saveService: (id: string, service: ServiceSnapshot) => Save;
  archiveService: (id: string) => Save;
  restoreService: (id: string) => Save;
  removeService: (id: string) => Save;
  reviewServiceProposal: (id: string, decision: "autorizar" | "recusar", comment: string) => Save;
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

  async function save(command: CrmCommand | ProductionCommand | { kind: "save" | "archive" | "restore" | "remove" | "review"; [key: string]: unknown }, channel: "crm" | "production" | "service" = "crm") {
    if (busyRef.current) return { ok: false as const };
    busyRef.current = true; revision.current += 1; setBusy(true); setError(""); setNotice("");
    try {
      const result = await (channel === "production" ? mutateProductionPanel(command) : channel === "service" ? mutateServicePanel(command) : mutateCrmPanel(command));
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
    reload: async () => { const next = await refreshPanel(); setState(next); },
    updateCustomer: customer => done(save({ kind: "updateCustomer", customer: { ...customer, kind: customer.kind || "LEAD", birthDate: customer.birthDate || "", instagram: customer.instagram || "" } })),
    addCustomer: (customer, amount) => done(save({ kind: "createCustomer", customer: { ...customer, kind: customer.kind || "LEAD", birthDate: customer.birthDate || "", instagram: customer.instagram || "" }, value: amount })),
    addOpportunity: (customerId, service) => done(save({ kind: "createOpportunity", customerId, service })),
    updateOpportunityValue: (id, amount) => done(save({ kind: "value", id, value: amount })),
    createDemand: async input => {
      const result = await save({ kind: "createDemand", input }, "production");
      return result.ok && result.createdId ? result.createdId : false;
    },
    updateDemand: input => done(save({ kind: "updateDemand", input }, "production")),
    saveDemandMedia: input => done(save({ kind: "demandMedia", input }, "production")),
    saveDeliveryLinks: input => done(save({ kind: "deliveryLinks", input }, "production")),
    addDeliverable: (demandId, title) => done(save({ kind: "addDeliverable", input: { demandId, title } }, "production")),
    renameDeliverable: (id, title) => done(save({ kind: "renameDeliverable", input: { id, title } }, "production")),
    archiveDeliverable: id => done(save({ kind: "archiveDeliverable", id }, "production")),
    restoreDeliverable: id => done(save({ kind: "restoreDeliverable", id }, "production")),
    moveOpportunity: (id, stage, future) => done(save({ kind: "move", id, stage, ...future })),
    loseOpportunity: (id, input) => done(save({ kind: "lose", id, ...input, note: input.note || "" })),
    closeWon: (id, input) => done(save({ kind: "closeWon", id, ...input })),
    saveContract: (id, input) => done(save({ kind: "contract", id, ...input })),
    saveServiceDates: (id, lines) => done(save({ kind: "serviceDates", id, lines })),
    transferContract: (id, responsibleId) => done(save({ kind: "transfer", id, responsibleId })),
    saveFutureContact: (id, input) => done(save({ kind: "futureContact", id, futureContact: input.futureContact, futureAt: input.futureAt, responsibleId: input.responsibleId || "", reason: input.reason || "", note: input.note || "" })),
    saveKanbanLabels: labels => done(save({ kind: "kanbanLabels", labels })),
    recordContact: (id, summary, waitingOn, nextAction, nextAt) => done(save({ kind: "contact", id, summary, waitingOn, nextAction, nextAt })),
    closeSale: (opportunityId, input) => done(save({ kind: "send", submission: {
      opportunityId, title: input.title, description: input.description, amount: input.amount,
      mediaType: input.mediaType, due: input.due, deliverables: input.deliverables.split("\n").map(t => t.trim()).filter(Boolean),
    } })),
    sendMessage: (id, message) => done(save({ kind: "message", id, message }, "production")),
    setTaskStatus: (id, status) => done(save({ kind: "status", id, status }, "production")),
    saveTaskScript: (id, script, previous) => done(save({ kind: "script", input: { id, script, previous } }, "production")),
    markDelivered: id => done(save({ kind: "delivered", id }, "production")),
    assignEditor: (id, editorId, editorDue, reviewDue) => done(save({ kind: "assign", id, editorId, editorDue, reviewDue }, "production")),
    assignMany: input => done(save({ kind: "assignMany", ...input }, "production")),
    updateTaskDue: (id, field, input) => done(save({ kind: "due", id, field, value: input }, "production")),
    pauseClientDue: id => done(save({ kind: "pauseClientDue", id }, "production")),
    confirmSelectionReturn: (id, returnDate) => done(save({ kind: "selectionReturn", id, returnDate }, "production")),
    readAlert: id => done(save({ kind: "read", id }, "production")),
    readSelectedAlerts: ids => done(save({ kind: "readSelected", ids }, "production")),
    readAllAlerts: () => done(save({ kind: "readAll" }, "production")),
    assignAttendantTask: input => done(save({ kind: "attendantTask", ...input }, "production")),
    createPersonalTask: input => done(save({ kind: "personalTask", ...input }, "production")),
    deleteAttendantTask: id => done(save({ kind: "deleteAttendantTask", id }, "production")),
    completeAttendantTask: id => done(save({ kind: "completeAttendantTask", id }, "production")),
    saveService: (id, service) => done(save({ kind: "save", id, service }, "service")),
    archiveService: id => done(save({ kind: "archive", id }, "service")),
    restoreService: id => done(save({ kind: "restore", id }, "service")),
    removeService: id => done(save({ kind: "remove", id }, "service")),
    reviewServiceProposal: (id, decision, comment) => done(save({ kind: "review", id, decision, comment }, "service")),
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
