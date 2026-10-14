"use client";
import {createContext,useCallback,useContext,useMemo,useState,type ReactNode} from "react";
import {type Role,type Customer,type Opportunity,type Stage,type TaskStatus,type ProductionStatus,type Editor,type State,seed} from "./data";

type ManualDemand = {customerId:string;title:string;description:string;clientDue:string;deliverables:string};
type Closing = {title:string;description:string;amount:number;due:string;deliverables:string};
type Ctx={state:State;role:Role|null;loggedIn:boolean;ready:boolean;activeEditorId:string;userName:string;login:(role:Role)=>void;logout:()=>void;updateCustomer:(c:Customer)=>void;addCustomer:(c:Customer,value:number|null)=>void;moveOpportunity:(id:string,stage:Stage)=>void;loseOpportunity:(id:string,reason:string)=>void;recordContact:(id:string,summary:string,waitingOn:Opportunity["waitingOn"],nextAction:string,nextAt:string)=>void;closeSale:(id:string,details:Closing)=>void;addManualDemand:(details:ManualDemand)=>void;sendMessage:(demandId:string,message:string)=>void;setTaskStatus:(id:string,status:TaskStatus)=>void;markDelivered:(demandId:string)=>void;assignEditor:(taskId:string,editorId:string)=>void;updateTaskDue:(taskId:string,field:"editorDue"|"reviewDue"|"clientDue",value:string)=>void;addEditor:(e:Editor)=>void;readAlert:(id:string)=>void;resetDemo:()=>void};
const Context=createContext<Ctx|null>(null);
export function GarroProvider({children,role:fixedRole,userName=""}:{children:ReactNode;role:Role;userName?:string}){
 const [state,setState]=useState<State>(seed);
 const role:Role|null=fixedRole;
 const ready=true;
 const userNameSafe=userName;
 const login=useCallback((next:Role)=>{void next},[]);
 const logout=useCallback(()=>{},[]);
 const updateCustomer=useCallback((customer:Customer)=>setState(s=>({...s,customers:s.customers.map(c=>c.id===customer.id?customer:c)})),[]);
 const addCustomer=useCallback((c:Customer,value:number|null)=>setState(s=>({...s,customers:[c,...s.customers],opportunities:[{id:crypto.randomUUID(),customerId:c.id,stage:"Novo contato" as Stage,value,priority:"Média" as const,lastActivity:new Date().toISOString(),waitingOn:"atendente" as const,waitingSince:new Date().toISOString(),nextAction:"Primeiro contato",history:[{at:new Date().toISOString(),description:"Cliente cadastrado."}]},...s.opportunities]})),[]);
 const moveOpportunity=useCallback((id:string,stage:Stage)=>setState(s=>({...s,opportunities:s.opportunities.map(o=>o.id===id?{...o,stage,lastActivity:new Date().toISOString(),history:[{at:new Date().toISOString(),description:`Movido para ${stage}.`},...o.history]}:o)})),[]);
 const loseOpportunity=useCallback((id:string,reason:string)=>setState(s=>({...s,opportunities:s.opportunities.map(o=>o.id===id?{...o,stage:"Perdido" as Stage,lastActivity:new Date().toISOString(),history:[{at:new Date().toISOString(),description:`Oportunidade perdida. Motivo: ${reason}`},...o.history]}:o)})),[]);
 const recordContact=useCallback((id:string,summary:string,waitingOn:Opportunity["waitingOn"],nextAction:string,nextAt:string)=>setState(s=>({...s,opportunities:s.opportunities.map(o=>o.id===id?{...o,lastActivity:new Date().toISOString(),waitingSince:waitingOn==="nenhum"?undefined:new Date().toISOString(),waitingOn,nextAction,nextAt:nextAt||undefined,history:[{at:new Date().toISOString(),description:summary},...o.history]}:o),schedule:nextAt?[...s.schedule,{id:crypto.randomUUID(),userId:"atendente",title:nextAction,at:nextAt,category:"Comercial" as const}]:s.schedule})),[]);
 const closeSale=useCallback((id:string,d:Closing)=>setState(s=>{const o=s.opportunities.find(i=>i.id===id);if(!o||o.stage==="Fechado")return s;const demandId=`GAR-${String(Date.now()).slice(-5)}`,now=new Date().toISOString();const deliverables=d.deliverables.split("\n").map(t=>t.trim()).filter(Boolean);return {...s,opportunities:s.opportunities.map(x=>x.id===id?{...x,stage:"Fechado" as Stage,value:d.amount,lastActivity:now,history:[{at:now,description:`Venda fechada: ${d.title}. Demanda ${demandId} gerada.`},...x.history]}:x),demands:[{id:demandId,customerId:o.customerId,title:d.title,description:d.description,status:"Nova demanda" as ProductionStatus,clientDue:d.due,briefing:d.description,links:"",createdAt:now,messages:[]},...s.demands],deliverables:[...deliverables.map((title,i)=>({id:`${demandId}-${i}`,demandId,title,editorId:"",status:"A iniciar" as const,editorDue:d.due,reviewDue:d.due,clientDue:d.due,progress:0})),...s.deliverables],schedule:[{id:crypto.randomUUID(),category:"Cliente" as const,userId:"gestor",title:`Entrega cliente: ${d.title}`,at:d.due,demandId},...s.schedule],alerts:[{id:crypto.randomUUID(),userId:"gestor",title:"Nova venda fechada",detail:`Demanda ${demandId} criada no CRM.`,at:now,read:false,demandId},...s.alerts]}}),[]);
 const addManualDemand=useCallback((d:ManualDemand)=>setState(s=>{
  const now=new Date().toISOString(),demandId=`GAR-${String(Date.now()).slice(-5)}`;
  const names=d.deliverables.split("\n").map(n=>n.trim()).filter(Boolean);
  const deliverables=names.map((title,i)=>({id:`${demandId}-${i}`,demandId,title,editorId:"",status:"A iniciar" as TaskStatus,editorDue:d.clientDue,reviewDue:d.clientDue,clientDue:d.clientDue,progress:0}));
  return {...s,demands:[{id:demandId,customerId:d.customerId,title:d.title,description:d.description,status:"Nova demanda" as ProductionStatus,clientDue:d.clientDue,briefing:d.description,links:"",createdAt:now,messages:[]},...s.demands],deliverables:[...deliverables,...s.deliverables],schedule:[...deliverables.flatMap(t=>[
    {id:`d${t.id}`,title:`Entrega editor: ${t.title}`,category:"Editor" as const,userId:"",at:t.editorDue,demandId},
    {id:`r${t.id}`,title:`Revisão Garro: ${t.title}`,category:"Revisão" as const,userId:"gestor",at:t.reviewDue,demandId}
  ]),{id:`c${demandId}`,category:"Cliente" as const,userId:"gestor",title:`Entrega cliente: ${d.title}`,at:d.clientDue,demandId},...s.schedule]};
 }),[]);
 const sendMessage=useCallback((demandId:string,message:string)=>setState(s=>{const d=s.demands.find(d=>d.id===demandId);if(!d)return s;const author=role==="GESTOR_GARRO"?"Garro Gestora":"Lucas Ferreira",recipient=role==="GESTOR_GARRO"?s.deliverables.find(t=>t.demandId===demandId)?.editorId||"e1":"gestor",at=new Date().toISOString();return {...s,demands:s.demands.map(x=>x.id===demandId?{...x,messages:[...x.messages,{id:crypto.randomUUID(),demandId,author,role:role||"EDITOR",message,createdAt:at}]}:x),alerts:[{id:crypto.randomUUID(),userId:recipient,title:"Nova mensagem na demanda",detail:message.slice(0,90),at,read:false,demandId},...s.alerts]}}),[role]);
 const setTaskStatus=useCallback((id:string,status:TaskStatus)=>setState(s=>{
    const task=s.deliverables.find(t=>t.id===id);
    if(!task) return s;
    const now=new Date().toISOString();
    const updated=s.deliverables.map(t=>t.id===id?{
      ...t,status,progress:status==="Aprovado"?100:status==="Em revisão"?100:status==="Em edição"?Math.max(t.progress,25):t.progress,
      editorDeliveredAt:status==="Em revisão"?now:t.editorDeliveredAt,
      managerApprovedAt:status==="Aprovado"?now:t.managerApprovedAt
    }:t);
    const related=updated.filter(t=>t.demandId===task.demandId);
    const demandStatus:ProductionStatus=related.every(t=>t.status==="Aprovado")?"Aprovada":related.some(t=>t.status==="Correção")?"Correção":related.some(t=>t.status==="Em revisão")?"Em revisão":related.some(t=>t.status==="Em edição")?"Em produção":"Planejamento";
    return {...s,deliverables:updated,demands:s.demands.map(d=>d.id===task.demandId?{...d,status:demandStatus}:d),alerts:[{
      id:crypto.randomUUID(),userId:role==="EDITOR"?"gestor":task.editorId||"e1",title:`Entregável: ${status}`,detail:task.title,at:now,read:false,demandId:task.demandId
    },...s.alerts]};
  }),[role]);
 const markDelivered=useCallback((demandId:string)=>setState(s=>{
   const related=s.deliverables.filter(t=>t.demandId===demandId);
   if(!related.length||!related.every(t=>t.status==="Aprovado"))return s;
   return {...s,demands:s.demands.map(d=>d.id===demandId?{...d,status:"Entregue" as ProductionStatus}:d),schedule:s.schedule.map(a=>a.demandId===demandId&&a.category==="Cliente"?{...a,done:true}:a)};
 }),[]);
 const assignEditor=useCallback((id:string,editorId:string)=>setState(s=>{const t=s.deliverables.find(t=>t.id===id);return {...s,deliverables:s.deliverables.map(t=>t.id===id?{...t,editorId}:t),schedule:s.schedule.map(a=>a.id===`d${id}`?{...a,userId:editorId}:a),alerts:t&&editorId?[{id:crypto.randomUUID(),userId:editorId,title:"Nova atribuição de edição",detail:t.title,at:new Date().toISOString(),read:false,demandId:t.demandId},...s.alerts]:s.alerts}}),[]);
 const updateTaskDue=useCallback((id:string,field:"editorDue"|"reviewDue"|"clientDue",value:string)=>setState(s=>({...s,deliverables:s.deliverables.map(t=>t.id===id?{...t,[field]:value}:t),schedule:s.schedule.map(a=>a.id===(field==="editorDue"?`d${id}`:field==="reviewDue"?`r${id}`:"never")?{...a,at:value}:a)})),[]);
 const addEditor=useCallback((e:Editor)=>setState(s=>({...s,editors:[...s.editors,e]})),[]);
 const readAlert=useCallback((id:string)=>setState(s=>({...s,alerts:s.alerts.map(n=>n.id===id?{...n,read:true}:n)})),[]);
 const resetDemo=useCallback(()=>{setState(seed())},[]);
 const value=useMemo(()=>({state,role,ready,loggedIn:!!role,activeEditorId:"e1",userName:userNameSafe,login,logout,updateCustomer,addCustomer,moveOpportunity,loseOpportunity,recordContact,closeSale,addManualDemand,sendMessage,setTaskStatus,markDelivered,assignEditor,updateTaskDue,addEditor,readAlert,resetDemo}),[state,role,ready,userNameSafe,login,logout,updateCustomer,addCustomer,moveOpportunity,loseOpportunity,recordContact,closeSale,addManualDemand,sendMessage,setTaskStatus,markDelivered,assignEditor,updateTaskDue,addEditor,readAlert,resetDemo]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useGarro(){const c=useContext(Context);if(!c)throw new Error("GarroProvider necessário");return c;}
