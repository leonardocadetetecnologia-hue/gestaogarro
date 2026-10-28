"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, X } from "lucide-react";
import { dateFull, type Alert } from "@/lib/data";
import { useGarro } from "@/lib/store";

export function unreadFor(alerts: Alert[], userId: string) {
  return alerts.filter(alert => alert.userId === userId && !alert.read);
}

export function BellList({ alerts, onOpen, onClear, onClearAll }: {
  alerts: Alert[];
  onOpen: (alert: Alert) => void;
  onClear: (id: string) => void;
  onClearAll: () => void;
}) {
  return (
    <div className="bell-panel" role="dialog" aria-label="Notificações recentes">
      <div className="bell-panel-head">
        <strong>{alerts.length === 0 ? "Nenhuma nova" : `${alerts.length} ${alerts.length === 1 ? "nova" : "novas"}`}</strong>
        {alerts.length > 0 && <button type="button" className="text-link" onClick={onClearAll}>Limpar todas</button>}
      </div>
      <ul>
        {alerts.map(alert => (
          <li key={alert.id}>
            <button type="button" className="bell-item" onClick={() => onOpen(alert)}>
              <strong>{alert.title}</strong>
              <span>{alert.detail} · {dateFull(alert.at)}</span>
            </button>
            <button type="button" className="icon-button" aria-label={`Limpar ${alert.title}`} onClick={() => onClear(alert.id)}><X size={14} /></button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function NotificationBell() {
  const { state, activeEditorId, readAlert, readAllAlerts } = useGarro();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const items = unreadFor(state.alerts, activeEditorId);

  useEffect(() => {
    if (!open) return;
    function outside(event: MouseEvent) {
      if (!wrap.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function openItem(alert: Alert) {
    void readAlert(alert.id);
    setOpen(false);
    if (alert.href) router.push(alert.href);
    else if (alert.demandId) router.push(`/painel/demanda?id=${alert.demandId}`);
  }

  return (
    <div className={`header-bell${items.length > 0 ? " has-unread" : ""}`} ref={wrap}>
      <button type="button" className="icon-button" aria-label="Notificações" aria-expanded={open} onClick={() => setOpen(value => !value)}>
        <Bell size={19} />
        {items.length > 0 && <em>{items.length}</em>}
      </button>
      {open && <BellList alerts={items} onOpen={openItem} onClear={id => void readAlert(id)} onClearAll={() => void readAllAlerts()} />}
    </div>
  );
}
