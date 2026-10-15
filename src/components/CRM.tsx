"use client";
/* eslint-disable @typescript-eslint/no-unused-vars */
import {useEffect,useMemo,useState,type FormEvent} from "react";
import {CalendarClock,Check,ChevronRight,Clock3,Columns3,LayoutList,Plus,Save,Search,SlidersHorizontal,TrendingUp,X} from "lucide-react";
import {type Customer,type Opportunity,type Stage,stages,currency,dateFull,dateShort,elapsedTimer,relativeDate} from "@/lib/data";
import {useGarro} from "@/lib/store";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { parseSaoPaulo } from "@/lib/deadlines";
import {Badge,Deadline,Empty,Field,Metric,Modal,SearchBox,SectionHead,ViewTitle} from "./Ui";

const stageKind:Record<Stage,string>={"Lead":"neutral","Follow-up":"warning","Sem interesse":"attention","Reunião agendada":"info","Reunião realizada":"info","Bolo":"attention","Fechado com sucesso":"success","Fechado sem sucesso":"danger"};
const initialForm:Customer={id:"",name:"",phone:"",email:"",origin:"Instagram",company:"",city:"",service:"",notes:""};
const serviceOptions=["Ensaio PESSOAL","Ensaio REPOSICIONAMENTO","Campanha make + foto","Captação de foto e vídeo","Captação de vídeo","Cobertura de evento","Cobertura em tempo real","Consultoria de posicionamento","Workshop","Curso e mentoria para fotógrafos","Aluguel estúdio"];
export function CustomerForm({customer,onClose,value,kind="LEAD"}:{customer?:Customer;onClose:()=>void;value?:number|null;kind?:"LEAD"|"CLIENTE"}){
 const {updateCustomer,addCustomer,busy}=useGarro();const storageKey=`garro-form-draft-customer-${customer?.id||kind}`;
 const [form,setForm]=useState<Customer>(()=>{if(typeof window!=="undefined"){try{const d=localStorage.getItem(storageKey);if(d)return JSON.parse(d)}catch{}}return customer||{...initialForm,kind,id:crypto.randomUUID()}});
 const [estimated,setEstimated]=useState(value===null||value===undefined?"":String(value));
 const [saved,setSaved]=useState(false);
 useEffect(()=>{const handle=setTimeout(()=>{localStorage.setItem(storageKey,JSON.stringify(form));setSaved(true)},400);return ()=>clearTimeout(handle)},[form,storageKey]);
 async function save(e:FormEvent){e.preventDefault();const saved=customer?await updateCustomer(form):await addCustomer({...form,kind},estimated.trim()?Number(estimated):null);if(saved){localStorage.removeItem(storageKey);onClose()}}
 return <Modal title={customer?"Editar contato":kind==="CLIENTE"?"Novo cliente":"Novo lead"} description="Os dados são guardados como rascunho enquanto você digita." onClose={onClose}>
  <form className="form-stack" onSubmit={save}><div className="form-grid">
  <Field label="Nome do contato *"><input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Nome completo"/></Field>
  <Field label="Telefone"><input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="(31) 99999-9999"/></Field>
  <Field label="E-mail"><input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></Field>
  <Field label="Origem"><select value={form.origin} onChange={e=>setForm({...form,origin:e.target.value})}>{["Instagram","Indicação","WhatsApp","Site","Google","Outro"].map(o=><option key={o}>{o}</option>)}</select></Field>
  {!customer&&kind==="LEAD"&&<Field label="Serviço de interesse"><select value={form.service} disabled={busy} onChange={e=>setForm({...form,service:e.target.value})}><option value="">Selecione um serviço</option>{form.service&&!serviceOptions.includes(form.service)&&<option value={form.service}>{form.service}</option>}{serviceOptions.map(service=><option key={service} value={service}>{service}</option>)}</select></Field>}
  <Field label="Empresa"><input value={form.company} onChange={e=>setForm({...form,company:e.target.value})}/></Field>
  {!customer&&kind==="LEAD"&&<Field label="Valor estimado (R$)"><input type="number" min={0} step="0.01" value={estimated} onChange={e=>setEstimated(e.target.value)} placeholder="Pode ficar em branco"/></Field>}
  </div><Field label="Observações"><textarea rows={3} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Detalhes importantes deste contato"/></Field>
  <div className="draft-note"><Check size={15}/> {saved?"Rascunho salvo automaticamente":"Salvando alterações..."}</div>
  <div className="modal-footer"><button className="button secondary" type="button" onClick={()=>{localStorage.setItem(storageKey,JSON.stringify(form));onClose()}}>Salvar rascunho e sair</button><button type="submit" className="button primary" disabled={busy}><Save size={15}/> {busy?"Salvando…":"Salvar cadastro"}</button></div></form>
 </Modal>
}
function InteractionModal({opportunity,onClose}:{opportunity:Opportunity;onClose:()=>void}){
 const {recordContact}=useGarro();const [summary,setSummary]=useState("");const [waiting,setWaiting]=useState<Opportunity["waitingOn"]>("cliente");const [action,setAction]=useState("Retornar contato");const [date,setDate]=useState("");const key=`garro-contact-draft-${opportunity.id}`;
 useEffect(()=>{try{const data=localStorage.getItem(key);if(data){const v=JSON.parse(data);setSummary(v.summary||"");setWaiting(v.waiting||"cliente");setAction(v.action||"");setDate(v.date||"")}}catch{}},[key]);
 useEffect(()=>{const h=setTimeout(()=>localStorage.setItem(key,JSON.stringify({summary,waiting,action,date})),300);return()=>clearTimeout(h)},[summary,waiting,action,date,key]);
 async function save(e:FormEvent){e.preventDefault();if(await recordContact(opportunity.id,summary,waiting,action,parseSaoPaulo(date)?.toISOString()||"")){localStorage.removeItem(key);onClose()}}
 return <Modal title="Registrar contato" description="Registre manualmente o que aconteceu na conversa." onClose={onClose}><form className="form-stack" onSubmit={save}><Field label="Resumo do contato *"><textarea required rows={5} value={summary} onChange={e=>setSummary(e.target.value)} placeholder="O que foi conversado ou combinado?"/></Field><div className="form-grid"><Field label="Quem precisa responder?"><select value={waiting} onChange={e=>setWaiting(e.target.value as Opportunity["waitingOn"])}><option value="cliente">Cliente</option><option value="atendente">Atendente</option><option value="nenhum">Ninguém</option></select></Field><Field label="Próxima ação"><input value={action} onChange={e=>setAction(e.target.value)}/></Field><Field label="Data da próxima ação"><input type="datetime-local" value={date} onChange={e=>setDate(e.target.value)}/></Field></div><div className="draft-note"><Check size={15}/>Rascunho preservado mesmo se sair da janela.</div><div className="modal-footer"><button className="button secondary" type="button" onClick={onClose}>Voltar</button><button className="button primary" type="submit">Registrar contato</button></div></form></Modal>
}
export function ClosingModal({opportunity,onClose}:{opportunity:Opportunity;onClose:()=>void}) {
 const {state,closeSale,busy,error}=useGarro();
 const customer=state.customers.find(c=>c.id===opportunity.customerId)!;
 const [title,setTitle]=useState(opportunity.service||customer.service||"");
 const [description,setDescription]=useState("");
 const [amount,setAmount]=useState(opportunity.value===null?"":String(opportunity.value));
 const [due,setDue]=useState("");
 const [items,setItems]=useState("");
 const key=`garro-closing-draft-${opportunity.id}`;
 useEffect(()=>{
  try {
   const saved=localStorage.getItem(key);
   if(saved){const v=JSON.parse(saved);setTitle(v.title||"");setDescription(v.description||"");setAmount(v.amount||"");setDue(v.due||"");setItems(v.items||"")}
  } catch {}
 },[key]);
 useEffect(()=>{
  const timer=setTimeout(()=>localStorage.setItem(key,JSON.stringify({title,description,amount,due,items})),300);
  return()=>clearTimeout(timer);
 },[title,description,amount,due,items,key]);
 async function submit(event:FormEvent) {
  event.preventDefault();
  const date=parseSaoPaulo(due);
  if(!date)return;
  if(await closeSale(opportunity.id,{title,description,amount,due:date.toISOString(),deliverables:items})){
   localStorage.removeItem(key);onClose();
  }
 }
 return <Modal title="Enviar para produção" width="670px" description={`${customer.name} · venda fechada com sucesso`} onClose={()=>{if(!busy)onClose()}}>
  <form onSubmit={submit} className="form-stack" aria-busy={busy}>
   <div className="form-grid">
    <Field label="Serviço contratado *"><input required minLength={2} maxLength={200} disabled={busy} value={title} onChange={e=>setTitle(e.target.value)}/></Field>
    <Field label="Valor fechado (R$) *"><input type="number" required min="0.01" step="0.01" disabled={busy} value={amount} onChange={e=>setAmount(e.target.value)}/></Field>
    <Field label="Prazo do cliente (horário de Brasília) *"><input type="datetime-local" required disabled={busy} value={due} onChange={e=>setDue(e.target.value)}/></Field>
   </div>
   <Field label="Briefing e detalhes da produção *"><textarea required minLength={3} disabled={busy} rows={4} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Descreva o que foi combinado com o cliente."/></Field>
   <Field label="Entregáveis (um por linha) *"><textarea required disabled={busy} rows={4} value={items} onChange={e=>setItems(e.target.value)} placeholder={"Vídeo principal\nReel para redes sociais"}/></Field>
   <div className="info-note">A demanda será criada na trilha de produção da Gestora, com briefing, entregáveis e prazo. A atribuição aos editores será feita pela Gestora.</div>
   {error&&<p role="alert" className="form-error">{error}</p>}
   <div className="draft-note"><Check size={15}/>Rascunho salvo automaticamente</div>
   <div className="modal-footer">
    <button type="button" className="button secondary" disabled={busy} onClick={onClose}>Salvar rascunho e voltar</button>
    <button type="submit" className="button primary" disabled={busy}>{busy?"Enviando…":"Confirmar envio para produção"}</button>
   </div>
  </form>
 </Modal>;
}
function LossModal({opportunity,onClose}:{opportunity:Opportunity;onClose:()=>void}) {
 const {loseOpportunity,busy,error}=useGarro();const [reason,setReason]=useState("");
 async function submit(e:FormEvent){e.preventDefault();if(await loseOpportunity(opportunity.id,reason))onClose()}
 return <Modal title="Fechado sem sucesso" description="Registre o motivo para encerrar a oportunidade." onClose={()=>{if(!busy)onClose()}}>
  <form className="form-stack" onSubmit={submit} aria-busy={busy}>
   <Field label="Motivo do fechamento sem sucesso *"><textarea required minLength={3} maxLength={1000} disabled={busy} value={reason} onChange={e=>setReason(e.target.value)} rows={3}/></Field>
   {error&&<p role="alert" className="form-error">{error}</p>}
   <div className="modal-footer"><button type="button" className="button secondary" disabled={busy} onClick={onClose}>Cancelar</button><button type="submit" className="button primary" disabled={busy}>{busy?"Salvando…":"Confirmar encerramento"}</button></div>
  </form>
 </Modal>;
}
function CustomerDrawer({opportunity,onClose}:{opportunity:Opportunity;onClose:()=>void}){
 const {state,moveOpportunity,updateOpportunityValue,role,busy}=useGarro();const baseCustomer=state.customers.find(c=>c.id===opportunity.customerId)!;const c={...baseCustomer,service:opportunity.service||baseCustomer.service};const [tab,setTab]=useState<"resumo"|"historico">("resumo");const [modal,setModal]=useState<"edit"|"contact"|"close"|"lost"|null>(null);const [editingValue,setEditingValue]=useState(false);const [amount,setAmount]=useState(opportunity.value===null?"":String(opportunity.value));
 const timer=elapsedTimer(opportunity.waitingSince);
 async function saveValue(event:FormEvent){event.preventDefault();const parsed=amount.trim()===""?null:Number(amount);if(parsed!==null&&(!Number.isFinite(parsed)||parsed<0))return;if(await updateOpportunityValue(opportunity.id,parsed))setEditingValue(false)}
 return <><aside className="detail-drawer"><div className="drawer-top"><div><div className="eyebrow">CONTATO / CRM</div><h2>{c.name}</h2><Badge kind={stageKind[opportunity.stage]}>{opportunity.stage}</Badge></div><button className="icon-button" onClick={onClose} aria-label="Fechar painel"><X size={20}/></button></div><div className="drawer-highlight"><small>VALOR EM NEGOCIAÇÃO</small><strong>{currency(opportunity.value)}</strong><span>Origem: {c.origin}</span></div>{!opportunity.demandId&&<>{editingValue?<form className="drawer-value-editor" onSubmit={saveValue}><Field label="Valor estimado / em negociação (R$)"><input autoFocus type="number" min="0" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0,00"/></Field><div className="drawer-value-actions"><button type="button" className="button secondary small" disabled={busy} onClick={()=>setEditingValue(false)}>Cancelar</button><button type="submit" className="button primary small" disabled={busy}>{busy?"Salvando...":"Salvar valor"}</button></div><small className="drawer-value-hint">Deixe em branco para limpar o valor.</small></form>:<div className="drawer-value-action"><button type="button" className="button secondary small" onClick={()=>{setAmount(opportunity.value===null?"":String(opportunity.value));setEditingValue(true)}}>{opportunity.value===null?"Definir valor":"Editar valor"}</button></div>}</>}<div className="tabs"><button className={tab==="resumo"?"active":""} onClick={()=>setTab("resumo")}>Resumo</button><button className={tab==="historico"?"active":""} onClick={()=>setTab("historico")}>Histórico</button></div><div className="drawer-body">{tab==="resumo"?<><div className="info-list">{[["Telefone",c.phone],["E-mail",c.email],["Serviço",c.service],["Empresa",c.company||"Não informado"],["Último contato",dateFull(opportunity.lastActivity)],["Próxima ação",opportunity.nextAction]].map(([key,val])=><div key={key}><span>{key}</span><strong>{val}</strong></div>)}</div><div className="alert-box"><Clock3 size={18}/><div><strong>{opportunity.waitingOn==="cliente"?"Aguardando cliente":opportunity.waitingOn==="atendente"?"Aguardando atendente":"Em acompanhamento"}</strong><p>{timer.text} sem registro de resposta ou atualização</p></div></div><div className="note-box"><h3>Observações</h3><p>{c.notes}</p></div><div className="note-box"><h3>Próxima ação</h3><p>{opportunity.nextAction}</p>{opportunity.nextAt&&<Deadline at={opportunity.nextAt}/>}</div><Field label="Etapa comercial"><select disabled={busy||!!opportunity.demandId} value={opportunity.stage} onChange={e=>{const stage=e.target.value as Stage;if(stage==="Fechado sem sucesso"){setModal("lost");return}moveOpportunity(opportunity.id,stage)}}>{stages.map(s=><option key={s}>{s}</option>)}</select></Field></>:<div className="timeline">{opportunity.history.map((h,i)=><div key={i}><small>{dateFull(h.at)}</small><p>{h.description}</p></div>)}</div>}</div><div className="drawer-bottom"><button className="button secondary" onClick={()=>setModal("edit")}>Editar contato</button><button className="button secondary" onClick={()=>setModal("contact")}>Registrar contato</button>{opportunity.stage==="Fechado com sucesso"&&!opportunity.demandId&&<button className="button primary full" onClick={()=>setModal("close")}>Enviar para produção <ChevronRight size={16}/></button>}{opportunity.demandId&&<div className="production-sent"><Check size={16}/><span>Enviado para produção</span>{role==="GESTOR_GARRO"&&<Link href={`/painel/demanda?id=${opportunity.demandId}`}>Ver demanda</Link>}</div>}</div></aside>
 {modal==="edit"&&<CustomerForm customer={c} onClose={()=>setModal(null)}/>} {modal==="contact"&&<InteractionModal opportunity={opportunity} onClose={()=>setModal(null)}/>} {modal==="close"&&<ClosingModal opportunity={opportunity} onClose={()=>setModal(null)}/>} {modal==="lost"&&<LossModal opportunity={opportunity} onClose={()=>setModal(null)}/>}
 </>
}
export function CommercialKanban(){const {state,moveOpportunity,busy}=useGarro();const params=useSearchParams();const linked=params.get("o");const [sending,setSending]=useState<Opportunity|null>(null);const [losing,setLosing]=useState<Opportunity|null>(null);const [query,setQuery]=useState("");const [origin,setOrigin]=useState("Todos");const [selected,setSelected]=useState<string|null>(linked);const [newOpen,setNewOpen]=useState(false);const [view,setView]=useState<"kanban"|"lista">("kanban");
 useEffect(()=>{setSelected(linked)},[linked]);
 const opportunities=state.opportunities;const open=opportunities.filter(o=>o.stage!=="Fechado com sucesso"&&o.stage!=="Fechado sem sucesso");const active=open.reduce((s,o)=>s+(o.value||0),0);const won=opportunities.filter(o=>o.stage==="Fechado com sucesso").reduce((s,o)=>s+(o.value||0),0);const stopped=open.filter(o=>o.waitingSince && Date.now()-new Date(o.waitingSince).getTime()>24*3600000).length;
 const filtered=opportunities.filter(o=>{const c=state.customers.find(c=>c.id===o.customerId);return !!c&&(c.name.toLowerCase().includes(query.toLowerCase())||c.service.toLowerCase().includes(query.toLowerCase()))&&(origin==="Todos"||c.origin===origin)});
 const selectedOpportunity=state.opportunities.find(o=>o.id===selected);
 const card=(o:Opportunity)=>{
  const base=state.customers.find(c=>c.id===o.customerId)!;
  const c={...base,service:o.service||base.service};
  const terminal=o.stage==="Fechado com sucesso"||o.stage==="Fechado sem sucesso";
  const status=terminal||o.waitingOn==="nenhum"?null:elapsedTimer(o.waitingSince);
  return <div draggable={!busy&&!o.demandId} onDragStart={e=>e.dataTransfer.setData("text/plain",o.id)} key={o.id} className={`crm-card ${selected===o.id?"crm-selected":""}`}>
   <button type="button" className="crm-card-open" onClick={()=>setSelected(o.id)} aria-label={`Ver atendimento de ${c.name}`}>
    <div className="crm-card-head"><span className="monogram">{c.name.split(" ").slice(0,2).map(n=>n[0]).join("")}</span><div><strong>{c.name}</strong><small>{c.origin} · {c.service}</small></div></div>
    <div className="crm-card-price">{currency(o.value)}</div>
    <div className="crm-card-bottom"><Badge kind={status?.status||stageKind[o.stage]}>{status?(o.waitingOn==="cliente"?"Sem retorno":"Sem atualização"):o.stage}</Badge><span className="time-meta">{dateShort(o.lastActivity).split(",")[0]}</span></div>
    {status&&<div className={`time-row time-${status.status}`}><Clock3 size={12}/>{status.text}</div>}
   </button>
   {o.stage==="Fechado com sucesso"&&!o.demandId&&<button type="button" disabled={busy} className="button primary small full crm-production-button" onClick={()=>setSending(o)}>Enviar para produção <ChevronRight size={14}/></button>}
   {o.demandId&&<div className="production-sent compact"><Check size={14}/>Enviado para produção</div>}
  </div>;
 };
 return <div className="workspace"><ViewTitle eyebrow="COMERCIAL / ATENDIMENTOS" title="CRM de leads e oportunidades" description="Pipeline comercial, valores e acompanhamento das próximas ações." actions={<button className="button primary" onClick={()=>setNewOpen(true)}><Plus size={17}/>Novo lead</button>}/>
 <div className="metric-grid five"><Metric name="Leads no funil" value={open.length} foot="Oportunidades em aberto"/><Metric name="Pipeline aberto" value={currency(active)} foot="Valor potencial"/><Metric name="Fechados com sucesso" value={currency(won)} foot="Valor das oportunidades nessa etapa"/><Metric name="Conversão" value={`${Math.round(100*opportunities.filter(o=>o.stage==="Fechado com sucesso").length/Math.max(opportunities.length,1))}%`} foot="Oportunidades convertidas"/><Metric name="Contatos parados" value={stopped} foot="Mais de 24h sem atividade"/></div>
 <div className="board-toolbar"><div className="segmented"><button className={view==="kanban"?"active":""} onClick={()=>setView("kanban")}><Columns3 size={15}/>Kanban</button><button className={view==="lista"?"active":""} onClick={()=>setView("lista")}><LayoutList size={15}/>Lista</button></div><div className="toolbar-end"><SearchBox value={query} onChange={setQuery} placeholder="Buscar cliente ou serviço..."/><select aria-label="Filtrar origem" value={origin} onChange={e=>setOrigin(e.target.value)}>{["Todos",...new Set(state.customers.map(c=>c.origin))].map(o=><option key={o}>{o}</option>)}</select></div></div>
 <div className={`commercial-shell ${selectedOpportunity?"has-detail":""}`}><div className="board-flex">{view==="kanban"?<div className="kanban-grid">{stages.map(stage=>{const group=filtered.filter(o=>o.stage===stage);return <div className="kanban-column" key={stage} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const id=e.dataTransfer.getData("text/plain");if(!id||busy)return;const opportunity=state.opportunities.find(o=>o.id===id);if(stage==="Fechado sem sucesso"&&opportunity)setLosing(opportunity);else void moveOpportunity(id,stage)}}><div className={`column-head column-${stageKind[stage]}`}><div><strong>{stage}</strong><span>{currency(group.reduce((sum,o)=>sum+(o.value||0),0))}</span></div><span className="column-count">{group.length}</span></div><div className="column-content">{group.map(card)}{group.length===0&&<Empty text="Nenhuma oportunidade nesta etapa"/>}</div></div>})}</div>:<div className="table-panel"><table><thead><tr><th>Cliente</th><th>Serviço</th><th>Etapa</th><th>Valor</th><th>Última atualização</th></tr></thead><tbody>{filtered.map(o=>{const c=state.customers.find(x=>x.id===o.customerId)!;return <tr onClick={()=>setSelected(o.id)} key={o.id}><td>{c.name}</td><td>{c.service}</td><td><Badge kind={stageKind[o.stage]}>{o.stage}</Badge></td><td>{currency(o.value)}</td><td>{dateFull(o.lastActivity)}</td></tr>})}</tbody></table></div>}</div>{selectedOpportunity&&<CustomerDrawer opportunity={selectedOpportunity} onClose={()=>setSelected(null)}/>}</div>
 {newOpen&&<CustomerForm onClose={()=>setNewOpen(false)}/>} {sending&&<ClosingModal opportunity={sending} onClose={()=>setSending(null)}/>} {losing&&<LossModal opportunity={losing} onClose={()=>setLosing(null)}/>}</div>
}
export function CustomersPage(){const {state}=useGarro();const [query,setQuery]=useState("");const [editing,setEditing]=useState<Customer|null>(null);const [newOpen,setNewOpen]=useState<"LEAD"|"CLIENTE"|null>(null);const [kind,setKind]=useState("CLIENTE");const [negotiating,setNegotiating]=useState<Customer|null>(null);const filtered=state.customers.filter(c=>(kind==="Todos"||c.kind===kind)&&`${c.name} ${c.phone} ${c.email}`.toLowerCase().includes(query.toLowerCase()));return <div className="workspace"><ViewTitle eyebrow="CADASTROS" title="Clientes e leads" description="Leads são contatos comerciais. Clientes já contrataram a Garro." actions={<><button className="button secondary" onClick={()=>setNewOpen("LEAD")}>Novo lead</button><button className="button primary" onClick={()=>setNewOpen("CLIENTE")}><Plus size={16}/>Novo cliente</button></>}/><div className="surface table-wrapper"><div className="section-head"><h2>Cadastros <span className="muted">({filtered.length})</span></h2><select aria-label="Filtrar cadastro" value={kind} onChange={e=>setKind(e.target.value)}><option value="CLIENTE">Clientes</option><option value="LEAD">Leads</option><option>Todos</option></select><SearchBox value={query} onChange={setQuery} placeholder="Pesquisar nome, e-mail, telefone"/></div><div className="table-scroll"><table><thead><tr><th>Nome</th><th>Cadastro</th><th>Origem</th><th>Telefone</th><th>Serviço de interesse</th><th>Ação</th></tr></thead><tbody>{filtered.map(c=><tr key={c.id}><td><strong>{c.name}</strong><small>{c.email}</small></td><td><Badge>{c.kind==="CLIENTE"?"Cliente":"Lead"}</Badge></td><td>{c.origin}</td><td>{c.phone}</td><td>{c.service}</td><td><button className="button ghost small" onClick={()=>setEditing(c)}>Editar</button><button className="button secondary small" onClick={()=>setNegotiating(c)}>Nova oportunidade</button></td></tr>)}</tbody></table></div></div>{editing&&<CustomerForm customer={editing} onClose={()=>setEditing(null)}/>} {newOpen&&<CustomerForm kind={newOpen} onClose={()=>setNewOpen(null)}/>} {negotiating&&<NewOpportunityModal customer={negotiating} onClose={()=>setNegotiating(null)}/>}</div>}
export function CommercialFollowups(){const {state}=useGarro();const pending=state.opportunities.filter(o=>o.nextAt && o.stage!=="Fechado com sucesso"&&o.stage!=="Fechado sem sucesso").sort((a,b)=>new Date(a.nextAt!).getTime()-new Date(b.nextAt!).getTime());const [selected,setSelected]=useState<Opportunity|null>(null);return <div className="workspace"><ViewTitle eyebrow="COMERCIAL" title="Follow-ups" description="Compromissos comerciais e contatos que precisam de atenção."/><div className="surface"><SectionHead title="Próximas ações" meta={`${pending.length} acompanhamentos pendentes`}/><div className="list-stack">{pending.map(o=>{const c=state.customers.find(c=>c.id===o.customerId)!;return <div className="row-item" key={o.id}><span className="circle-icon"><CalendarClock size={18}/></span><div className="row-main"><strong>{c.name}</strong><span>{o.nextAction} · {dateFull(o.nextAt)}</span></div><Deadline at={o.nextAt}/><button className="button secondary small" onClick={()=>setSelected(o)}>Registrar contato</button></div>})}</div></div>{selected&&<InteractionModal opportunity={selected} onClose={()=>setSelected(null)}/>}</div>}
export function CommercialHistory(){const {state}=useGarro();const events=state.opportunities.flatMap(o=>o.history.map(h=>({...h,customer:state.customers.find(c=>c.id===o.customerId)?.name||"Cliente"}))).sort((a,b)=>new Date(b.at).getTime()-new Date(a.at).getTime());return <div className="workspace"><ViewTitle eyebrow="COMERCIAL" title="Histórico de contatos" description="Linha do tempo das interações registradas manualmente."/><div className="surface"><div className="timeline wide">{events.map((e,i)=><div key={i}><small>{dateFull(e.at)} · {e.customer}</small><p>{e.description}</p></div>)}</div></div></div>}

function NewOpportunityModal({customer,onClose}:{customer:Customer;onClose:()=>void}) {
 const {addOpportunity,busy}=useGarro();const [service,setService]=useState("");
 async function submit(e:FormEvent){e.preventDefault();if(await addOpportunity(customer.id,service))onClose()}
 return <Modal title="Nova oportunidade" description={customer.name} onClose={onClose}><form className="form-stack" onSubmit={submit}><Field label="Serviço de interesse *"><input required minLength={2} maxLength={200} value={service} onChange={e=>setService(e.target.value)}/></Field><button className="button primary" disabled={busy}>Criar oportunidade no CRM</button></form></Modal>;
}
