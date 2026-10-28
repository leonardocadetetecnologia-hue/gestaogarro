export const workStageOptions = ["A iniciar", "Em edição", "Em revisão", "Correção", "Aprovado", "Atrasado", "Concluído"] as const;

export function matchesWorkStage(task: { status: string; editorDue?: string }, stage: string, now = Date.now()) {
  if (!stage || stage === "Todas") return true;
  const approved = task.status === "Aprovado";
  const overdue = !approved && Boolean(task.editorDue) && new Date(task.editorDue).getTime() < now;
  if (stage === "Atrasado") return overdue;
  if (stage === "Concluído" || stage === "Aprovado") return approved;
  return task.status === stage;
}
