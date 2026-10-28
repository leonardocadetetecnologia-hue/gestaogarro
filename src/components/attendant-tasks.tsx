"use client";

import { useState, type FormEvent } from "react";
import { dateFull, type ScheduleItem } from "@/lib/data";
import { canCompleteAttendantTask, canDeleteAttendantTask } from "@/modules/production/attendant-task";
import { useGarro } from "@/lib/store";
import { Modal } from "./Ui";

function TaskFields({ title, date, time, onTitle, onDate, onTime }: {
  title: string; date: string; time: string;
  onTitle: (value: string) => void; onDate: (value: string) => void; onTime: (value: string) => void;
}) {
  return <>
    <label className="field"><span>Função</span><input value={title} maxLength={160} onChange={(event) => onTitle(event.target.value)} /></label>
    <label className="field"><span>Data limite</span><input aria-label="Data limite" type="date" value={date} onChange={(event) => onDate(event.target.value)} /></label>
    <label className="field"><span>Horário</span><input aria-label="Horário limite" type="time" value={time} onChange={(event) => onTime(event.target.value)} /></label>
  </>;
}

export function AttendantTasks() {
  const { state, busy, assignAttendantTask, deleteAttendantTask, completeAttendantTask } = useGarro();
  const [title, setTitle] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const attendants = (state.assignees || []).filter((person) => person.role === "ATENDENTE");
  const tasks = (state.schedule || []).filter((item) => item.assignment === "gestora" && item.status === "Pendente");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (await assignAttendantTask({ assigneeId, title, date, time })) {
      setTitle("");
      setDate("");
      setTime("");
    }
  }

  return (
    <section className="surface attendant-tasks" aria-label="Funções das atendentes">
      <div className="section-head">
        <div>
          <h2>Funções das atendentes</h2>
          <span>A data limite vira compromisso na agenda. Só a Gestora exclui o que criar aqui.</span>
        </div>
      </div>
      <form className="attendant-task-form" onSubmit={submit}>
        <label className="field">
          <span>Atendente</span>
          <select aria-label="Atendente" value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)}>
            <option value="">Escolha</option>
            {attendants.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
          </select>
        </label>
        <TaskFields title={title} date={date} time={time} onTitle={setTitle} onDate={setDate} onTime={setTime} />
        <button type="submit" className="button primary" disabled={busy || !assigneeId || !title.trim() || !date}>Atribuir</button>
      </form>
      <ul className="attendant-task-list">
        {tasks.length === 0 && <li className="empty-state">Nenhuma função atribuída.</li>}
        {tasks.map((task) => (
          <li key={task.id}>
            <div>
              <strong>{task.title}</strong>
              <span>{task.responsibleName || "Atendente"} · {dateFull(task.at)}</span>
            </div>
            <button type="button" className="button secondary small" disabled={busy} onClick={() => void completeAttendantTask(task.id)}>Concluir</button>
            <button type="button" className="button secondary small" disabled={busy} onClick={() => void deleteAttendantTask(task.id)}>Excluir</button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function PersonalTaskButton() {
  const { role } = useGarro();
  const [open, setOpen] = useState(false);
  if (role !== "ATENDENTE") return null;
  return <>
    <button type="button" className="button primary" onClick={() => setOpen(true)}>Novo compromisso</button>
    {open && <PersonalTaskModal onClose={() => setOpen(false)} />}
  </>;
}

function PersonalTaskModal({ onClose }: { onClose: () => void }) {
  const { busy, createPersonalTask } = useGarro();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (await createPersonalTask({ title, date, time })) onClose();
  }

  return (
    <Modal title="Novo compromisso" description="Controle pessoal da semana ou do mês. Só você exclui este compromisso." onClose={onClose}>
      <form className="form-stack" onSubmit={submit}>
        <TaskFields title={title} date={date} time={time} onTitle={setTitle} onDate={setDate} onTime={setTime} />
        <div className="modal-footer">
          <button type="button" className="button secondary" onClick={onClose}>Fechar</button>
          <button type="submit" className="button primary" disabled={busy || !title.trim() || !date}>Criar compromisso</button>
        </div>
      </form>
    </Modal>
  );
}

export function AttendantTaskActions({ event, onDone }: { event: ScheduleItem; onDone: () => void }) {
  const { role, activeEditorId, busy, deleteAttendantTask, completeAttendantTask } = useGarro();
  const actor = { id: activeEditorId, role };
  const task = {
    type: event.assignment ? "TAREFA_ATENDENTE" : "",
    userId: event.userId,
    createdById: event.createdById || null,
    createdByRole: event.assignment === "gestora" ? "GESTOR_GARRO" as const : event.assignment === "pessoal" ? "ATENDENTE" as const : null,
  };
  if (!event.assignment) return null;
  return <>
    {event.status === "Pendente" && canCompleteAttendantTask(actor, task) && <button type="button" className="button secondary" disabled={busy} onClick={() => void completeAttendantTask(event.id).then((ok) => { if (ok) onDone(); })}>Concluir</button>}
    {canDeleteAttendantTask(actor, task) && <button type="button" className="button secondary" disabled={busy} onClick={() => void deleteAttendantTask(event.id).then((ok) => { if (ok) onDone(); })}>Excluir</button>}
  </>;
}
