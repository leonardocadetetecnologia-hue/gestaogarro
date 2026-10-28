"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check } from "lucide-react";
import { dateFull, type Alert } from "@/lib/data";
import { useGarro } from "@/lib/store";
import { Badge, Empty, ViewTitle } from "./Ui";

export function inboxSelection(selected: string[], visibleIds: string[]) {
  const visible = new Set(visibleIds);
  const chosen = selected.filter((id, index) => visible.has(id) && selected.indexOf(id) === index);
  const allVisible = visibleIds.length > 0 && visibleIds.every(id => chosen.includes(id));
  return { chosen, allVisible, partial: chosen.length > 0 && !allVisible, nextAll: allVisible ? [] : [...visibleIds] };
}

function SelectBox({ checked, mixed, label, disabled, onChange }: {
  checked: boolean; mixed?: boolean; label: string; disabled?: boolean; onChange: () => void;
}) {
  return (
    <label className="notification-select" onClick={event => event.stopPropagation()}>
      <input
        type="checkbox"
        checked={checked}
        aria-label={label}
        disabled={disabled}
        data-mixed={mixed ? "true" : "false"}
        ref={node => { if (node) node.indeterminate = Boolean(mixed) && !checked; }}
        onChange={onChange}
      />
    </label>
  );
}

export function NotificationsInbox({ alerts, selectedIds, busy, onToggle, onToggleVisible, onOpen, onReadSelected, onReadAll }: {
  alerts: Alert[];
  selectedIds: string[];
  busy: boolean;
  onToggle: (id: string) => void;
  onToggleVisible: () => void;
  onOpen: (alert: Alert) => void;
  onReadSelected: () => void;
  onReadAll: () => void;
}) {
  const visibleIds = alerts.map(alert => alert.id);
  const { chosen, allVisible, partial } = inboxSelection(selectedIds, visibleIds);
  const unread = alerts.filter(alert => !alert.read).length;
  return (
    <div className="surface notification-inbox" aria-busy={busy}>
      <div className="section-head notification-head">
        <div className="notification-head-title">
          {alerts.length > 0 && <SelectBox checked={allVisible} mixed={partial} label="Selecionar visíveis" disabled={busy} onChange={onToggleVisible} />}
          <div>
            <h2>Caixa de notificações</h2>
            <span>{unread} não lidas</span>
          </div>
        </div>
        <div className="notification-actions">
          {chosen.length > 0 && <button type="button" className="button secondary" disabled={busy} onClick={onReadSelected}>Ler selecionadas</button>}
          <button type="button" className="button primary" disabled={busy} onClick={onReadAll}>Ler todos</button>
        </div>
      </div>
      <div className="list-stack" role="list">
        {alerts.map(alert => (
          <div key={alert.id} className={`notification-row ${alert.read ? "" : "unread"}`} role="listitem">
            <SelectBox checked={chosen.includes(alert.id)} label="Selecionar" disabled={busy} onChange={() => onToggle(alert.id)} />
            <button type="button" className="notification-open" onClick={() => onOpen(alert)}>
              <span className="circle-icon"><Bell size={18} /></span>
              <div className="row-main"><strong>{alert.title}</strong><span>{alert.detail} · {dateFull(alert.at)}</span></div>
              {!alert.read ? <Badge kind="attention">Nova</Badge> : <Check size={18} className="muted" />}
            </button>
          </div>
        ))}
        {alerts.length === 0 && <Empty text="Nenhuma notificação para este perfil." />}
      </div>
    </div>
  );
}

export function NotificationsView() {
  const { state, activeEditorId, busy, readAlert, readSelectedAlerts, readAllAlerts } = useGarro();
  const router = useRouter();
  const relevant = state.alerts.filter(alert => alert.userId === activeEditorId);
  const visibleIds = relevant.map(alert => alert.id);
  const [selected, setSelected] = useState<string[]>([]);
  const { chosen, nextAll } = inboxSelection(selected, visibleIds);
  function open(alert: Alert) {
    void readAlert(alert.id);
    if (alert.href) router.push(alert.href);
    else if (alert.demandId) router.push(`/painel/demanda?id=${alert.demandId}`);
  }
  return (
    <div className="workspace">
      <ViewTitle eyebrow="COMUNICAÇÃO" title="Notificações" description="Atribuições, mensagens, revisões e alertas de prazo." />
      <NotificationsInbox
        alerts={relevant}
        selectedIds={chosen}
        busy={busy}
        onToggle={id => setSelected(current => {
          const next = inboxSelection(current, visibleIds);
          return next.chosen.includes(id) ? next.chosen.filter(item => item !== id) : [...next.chosen, id];
        })}
        onToggleVisible={() => setSelected(nextAll)}
        onOpen={open}
        onReadSelected={() => { if (chosen.length) void readSelectedAlerts(chosen).then(ok => { if (ok) setSelected([]); }); }}
        onReadAll={() => { void readAllAlerts().then(ok => { if (ok) setSelected([]); }); }}
      />
    </div>
  );
}
