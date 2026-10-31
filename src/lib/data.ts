export type Role = "GESTOR_GARRO" | "ATENDENTE" | "EDITOR";
export type Stage = "Lead" | "Tentativa de contato" | "Em tratativa" | "Sem interesse" | "Reunião agendada" | "Reunião realizada" | "Bolo" | "Fechado sem sucesso" | "Fechado com sucesso" | "Contrato";
export type ProductionStatus = "Nova demanda" | "Planejamento" | "Em produção" | "Em revisão" | "Correção" | "Aprovada" | "Entregue";
export type TaskStatus = "A iniciar" | "Em edição" | "Em revisão" | "Correção" | "Aprovado";
export type CustomerBirthday = {name:string;birthDate:string};
export type Customer = {id:string;kind?:"LEAD"|"CLIENTE";name:string;phone:string;email:string;origin:string;company:string;city:string;service:string;notes:string;instagram?:string;personType?:"PESSOA_FISICA"|"EMPRESA"|"";zip?:string;street?:string;addressNumber?:string;complement?:string;district?:string;addressCity?:string;state?:string;birthDate?:string;birthdays?:CustomerBirthday[];attendantId?:string;attendantName?:string;createdAt?:string};
export type ContractLineView = {id?:string;serviceId?:string;serviceName:string;variationName:string;extra:boolean;amount:number|null;serviceDate?:string;captureTime?:string;capturePlace?:string;proposedDays?:number|null};
export type Opportunity = {id:string;customerId:string;service?:string;demandId?:string;responsibleId?:string;responsibleName?:string;stage:Stage;value:number|null;estimated?:number|null;proposal?:number|null;closed?:number|null;priority:"Alta"|"Média"|"Baixa";lastActivity:string;waitingSince?:string;waitingOn:"atendente"|"cliente"|"nenhum";nextAction:string;nextAt?:string;lostAt?:string;lossReason?:string;lossNote?:string;contractSigned?:boolean|null;contractSignedAt?:string;contractFileName?:string;contractPending?:boolean;lines?:ContractLineView[];returnResponsibleId?:string;returnResponsibleName?:string;history:{at:string;description:string;author?:string}[]};
export type Assignee = {id:string;name:string;role:Role};
export type Editor = {id:string;name:string;email:string;active:boolean;role?:Role};
export type ScriptAttachment = {id:string;fileName:string;size:number;createdAt:string};
export type Deliverable = {id:string;demandId:string;title:string;script?:string;attachments?:ScriptAttachment[];editorId:string;status:TaskStatus;editorDue:string;reviewDue:string;clientDue:string;progress:number;editorDeliveredAt?:string;managerApprovedAt?:string;clientDeliveredAt?:string;archivedAt?:string;createdAt?:string;number?:number};
export type Message = {id:string;demandId:string;author:string;role:Role;message:string;createdAt:string};
export type Demand = {id:string;customerId:string;customerName?:string;title:string;service?:string;mediaType?:"VIDEO"|"FOTO"|"FOTO_E_VIDEO";description:string;status:ProductionStatus;clientDue:string;clientDuePaused?:boolean;briefing:string;links:string;hd?:string;drive?:string;deliveryLinks?:string[];createdAt:string;messages:Message[]};
export type ScheduleItem = {id:string;title:string;category:"Comercial"|"Editor"|"Revisão"|"Cliente"|"Gestão"|"Captações"|"Entregas";userId:string;at:string;place?:string;customerId?:string;demandId?:string;opportunityId?:string;deliverableId?:string;done?:boolean;status?:"Pendente"|"Concluído"|"Cancelado";responsibleName?:string;responsibleRole?:Role;customerName?:string;typeLabel?:string;origin?:"CRM"|"Produção"|"Agenda";context?:string;createdAt?:string;createdById?:string;assignment?:"gestora"|"pessoal"};
export type Alert = {id:string;userId:string;title:string;detail:string;at:string;read:boolean;demandId?:string;href?:string};
export type AttendantActivity = {id:string;at:string;attendantId:string;attendantName:string;kind:"acesso"|"movimentacao"|"inclusao"|"alteracao";title:string;detail:string;contact:string};
export type CatalogVariation = {name:string;referencePrice:number|null};
export type CatalogService = {
  id:string;name:string;category:"ENSAIOS"|"CAPTACAO"|"EVENTOS"|"PLANOS"|"CAMPANHAS"|"ESCALAVEIS"|"SERVICO_EXTRA";
  description:string;referencePrice:number|null;priceType:"FECHADO"|"POR_HORA"|"MENSAL";
  deliveryDays:number|null;hasSelection:boolean;selectionDays:number|null;
  recurrence:"UMA_VEZ"|"TRES_MESES"|"SEIS_MESES"|"UM_ANO"|"DATA";recurrenceDate:string;
  standardCost:number|null;variations:CatalogVariation[];status:"ATIVO"|"ARQUIVADO";used:boolean;pending:boolean;
};
export type ServiceProposalView = {
  id:string;serviceId:string;serviceName:string;action:"CRIAR"|"EDITAR"|"ARQUIVAR"|"DESARQUIVAR"|"EXCLUIR";
  actionLabel:string;authorId:string;authorName:string;createdAt:string;changes:{field:string;before:string;after:string}[];
};
export type State = {customers:Customer[]; opportunities:Opportunity[]; editors:Editor[]; demands:Demand[]; deliverables:Deliverable[]; schedule:ScheduleItem[]; alerts:Alert[]; kanbanLabels?: Partial<Record<Stage, string>>; assignees?: Assignee[]; activity?: AttendantActivity[]; services?: CatalogService[]; serviceProposals?: ServiceProposalView[]; holidays?: string[]};
export const stages: Stage[] = ["Lead","Tentativa de contato","Em tratativa","Sem interesse","Reunião agendada","Reunião realizada","Bolo","Fechado sem sucesso","Fechado com sucesso","Contrato"];
export const settledStages: Stage[] = ["Fechado com sucesso","Contrato","Fechado sem sucesso"];
export const stageLabel = (stage: Stage, labels?: Partial<Record<Stage, string>>) => labels?.[stage]?.trim() || stage;
export function kanbanLabelsFrom(saved: { stage: string; label: string }[]) {
  const labels = Object.fromEntries(stages.map(stage => [stage, stage])) as Record<Stage, string>;
  for (const row of saved) {
    if ((stages as string[]).includes(row.stage) && row.label.trim()) labels[row.stage as Stage] = row.label.trim();
  }
  return labels;
}
export const productionStages: ProductionStatus[] = ["Nova demanda","Planejamento","Em produção","Em revisão","Correção","Aprovada","Entregue"];
export const relativeDate = (offsetHours: number) => new Date(Date.now() + offsetHours * 3600000).toISOString();
export const currency = (value:number|null|undefined) => value === null || value === undefined ? "Valor não definido" : new Intl.NumberFormat("pt-BR", {style:"currency",currency:"BRL",maximumFractionDigits:2}).format(value);
export const dateShort = (date?:string) => date ? new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit",timeZone:"America/Sao_Paulo"}).format(new Date(date)) : "—";
export const dateFull = (date?:string) => date ? new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit",timeZone:"America/Sao_Paulo"}).format(new Date(date)) : "—";
export const elapsedTimer = (since?:string, now=Date.now()) => {
  if (!since) return {text:"Sem registro",status:"neutral"};
  const hours=Math.max(0,Math.floor((now-new Date(since).getTime())/3600000));
  const status=hours>=48?"danger":hours>=24?"warning":hours>=4?"attention":"success";
  return {text:hours>=24?`${Math.floor(hours/24)}d ${hours%24}h`:`${hours}h`,status};
};
export const countDown = (date?:string, now=Date.now(), complete=false) => { if (complete) return {text:"Concluído",status:"success"}; if (!date) return {text:"A definir",status:"neutral"}; const h = (new Date(date).getTime()-now)/3600000; if(h < 0) return {text:`Atrasado ${Math.ceil(-h)}h`,status:"danger"}; if(h < 24) return {text:`Faltam ${Math.max(1,Math.ceil(h))}h`,status:"warning"}; if(h < 72) return {text:`Faltam ${Math.ceil(h/24)}d`,status:"attention"}; return {text:`Faltam ${Math.ceil(h/24)}d`,status:"success"};};
