const stages = [
  { status: "A iniciar", one: "a iniciar", many: "a iniciar", tone: "start" },
  { status: "Em edição", one: "em edição", many: "em edição", tone: "edit" },
  { status: "Em revisão", one: "em revisão", many: "em revisão", tone: "review" },
  { status: "Correção", one: "correção", many: "correções", tone: "fix" },
  { status: "Aprovado", one: "aprovado", many: "aprovados", tone: "done" },
] as const;

export function deliverableStatusSummary(tasks: { status: string }[]) {
  return stages.flatMap(stage => {
    const count = tasks.filter(task => task.status === stage.status).length;
    if (!count) return [];
    return [{ ...stage, count, label: `${count} ${count === 1 ? stage.one : stage.many}` }];
  });
}

export function DeliverableStatusBar({ tasks }: { tasks: { status: string }[] }) {
  const parts = deliverableStatusSummary(tasks);
  const total = parts.reduce((sum, item) => sum + item.count, 0);
  if (!total) return null;
  return <div className="deliverable-status" role="img" aria-label={`${total} ${total === 1 ? "entregável" : "entregáveis"}: ${parts.map(item => item.label).join(", ")}`}>
    <div className="deliverable-status-bar">{parts.map(item => <span key={item.status} className={`deliverable-status-${item.tone}`} style={{ flex: item.count }} title={item.label}/>)}</div>
    <div className="deliverable-status-legend">{parts.map(item => <span key={item.status}><i className={`deliverable-status-${item.tone}`}/>{item.label}</span>)}</div>
  </div>;
}
