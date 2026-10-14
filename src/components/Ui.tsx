"use client";
import {useEffect,useState,useRef,type ReactNode} from "react";
import {X,Search,ArrowUpRight} from "lucide-react";
import {countDown,dateShort} from "@/lib/data";
export function Badge({kind="neutral",children}:{kind?:string;children:ReactNode}){return <span className={`badge badge-${kind}`}>{children}</span>}
export function Deadline({at,done}:{at?:string;done?:boolean}){const [now,setNow]=useState(Date.now());useEffect(()=>{const i=setInterval(()=>setNow(Date.now()),60000);return ()=>clearInterval(i)},[]);const x=countDown(at,now,done);return <Badge kind={x.status}>{x.text}</Badge>}
export function Modal({title,description,children,onClose,width="580px"}:{title:string;description?:string;children:ReactNode;onClose:()=>void;width?:string}){
 const dialog=useRef<HTMLElement>(null);
 useEffect(()=>{
   const before=document.activeElement as HTMLElement|null;
   const prev=document.body.style.overflow;
   document.body.style.overflow="hidden";
   const modal=dialog.current;
   const controls=modal?.querySelectorAll<HTMLElement>('input:not([disabled]),textarea:not([disabled]),select:not([disabled]),button:not([disabled]),a[href]');
   (controls?.[1]||controls?.[0]||modal)?.focus();
   function onKeyDown(e:KeyboardEvent){
     if(e.key!=="Tab"||!modal)return;
     const focusable=Array.from(modal.querySelectorAll<HTMLElement>('input:not([disabled]),textarea:not([disabled]),select:not([disabled]),button:not([disabled]),a[href]'));
     if(!focusable.length){e.preventDefault();return;}
     const first=focusable[0],last=focusable[focusable.length-1];
     if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
     if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
   }
   document.addEventListener("keydown",onKeyDown);
   return ()=>{document.body.style.overflow=prev;document.removeEventListener("keydown",onKeyDown);before?.focus()};
 },[]);
 return <div className="modal-backdrop" role="presentation"><section ref={dialog} tabIndex={-1} className="modal-window" role="dialog" aria-modal="true" aria-label={title} style={{maxWidth:width}}><header className="modal-head"><div><h2>{title}</h2>{description&&<p>{description}</p>}</div><button className="icon-button" onClick={onClose} aria-label="Fechar janela"><X size={19}/></button></header><div className="modal-content">{children}</div></section></div>}
export function Field({label,children}:{label:string;children:ReactNode}){return <label className="field"><span>{label}</span>{children}</label>}
export function Empty({text="Nenhum registro encontrado."}:{text?:string}){return <div className="empty-state">{text}</div>}
export function SearchBox({value,onChange,placeholder="Buscar..."}:{value:string;onChange:(value:string)=>void;placeholder?:string}){return <label className="search-box"><Search size={17}/><input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/></label>}
export function ViewTitle({eyebrow,title,description,actions}:{eyebrow?:string;title:string;description?:string;actions?:ReactNode}){return <div className="view-title"><div>{eyebrow&&<div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1>{description&&<p>{description}</p>}</div>{actions&&<div className="view-actions">{actions}</div>}</div>}
export function Metric({name,value,foot,icon}:{name:string;value:string|number;foot?:string;icon?:ReactNode}){return <article className="metric"><div className="metric-label">{icon}<span>{name}</span></div><strong>{value}</strong>{foot&&<small>{foot}</small>}</article>}
export function SectionHead({title,meta,actions}:{title:string;meta?:string;actions?:ReactNode}){return <div className="section-head"><div><h2>{title}</h2>{meta&&<span>{meta}</span>}</div>{actions}</div>}
export {dateShort,ArrowUpRight};
