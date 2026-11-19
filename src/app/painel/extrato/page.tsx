import { requireUser } from "@/lib/auth";
import { StatementItem, StatementSheet } from "@/components/statement-sheet";
import { demandStatementNote, formatDeliveredAt, formatPeriodDay, loadDeliveryStatement, parseStatementFilters, saoPauloDay, statementPeriodLabel, StatementError } from "@/modules/reports/delivery-statement";
import { StatementPrint } from "./print-button";

export const dynamic = "force-dynamic";

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

export default async function DeliveryStatementPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const query = new URLSearchParams();
  const customerId = one(params.customerId);
  const service = one(params.service);
  const group = one(params.group);
  const from = one(params.from);
  const to = one(params.to);
  const month = one(params.month);
  const demandId = one(params.demandId);
  const demandIds = one(params.demandIds);
  if (customerId) query.set("customerId", customerId);
  if (service) query.set("service", service);
  if (group) query.set("group", group);
  if (demandId) query.set("demandId", demandId);
  if (demandIds) query.set("demandIds", demandIds);
  if (month) query.set("month", month);
  else {
    if (from) query.set("from", from);
    if (to) query.set("to", to);
  }

  try {
    const statement = await loadDeliveryStatement(user, parseStatementFilters(query));
    const selection = Boolean(demandIds);
    const customer = statement.customers.find(item => item.id === customerId)?.name || "Todos os clientes";
    const serviceLabel = service || "Todos os tipos";
    const issuedAt = formatDeliveredAt(new Date().toISOString());
    const periodLabel = statementPeriodLabel(month, from, to);
    const metadata: [string, string][] = statement.focus
      ? [["Projeto", statement.focus.title], ["Cliente", statement.focus.customerName], ["Período", periodLabel], ["Emitido em", issuedAt]]
      : selection
        ? [["Emitido em", issuedAt]]
        : [["Cliente", customer], ["Tipo de entrega", serviceLabel], ["Agrupamento", statement.group === "servico" ? "Por tipo de entrega" : "Por cliente"], ["Período", periodLabel], ["Emitido em", issuedAt]];
    return (
      <StatementSheet
        label={statement.focus ? "Relatório de entrega" : "Extrato de entregas"}
        title={statement.focus?.title || periodLabel}
        metadata={metadata}
        total={statement.total}
        toolbar={<StatementPrint auto={one(params.imprimir) === "1"} />}
      >
        {statement.example && <p className="statement-example">Modelo ilustrativo. Estes nomes não são clientes da Garro.</p>}
        <p className="statement-note">{selection ? "Informação, data e descrição. O registro continua no sistema." : statement.focus ? demandStatementNote : "Somente demandas concluídas na produção. Cada item traz a informação, a data e a descrição."}</p>
        {!statement.example && statement.total === 0 && <p className="empty-state">Nenhuma entrega concluída neste filtro.</p>}
        {statement.sections.map(section => (
          <section key={section.label}>
            <h2>{section.label}</h2>
            {section.activities.map(activity => (
              <StatementItem
                key={activity.id}
                title={activity.title}
                service={selection ? undefined : statement.group === "servico" ? activity.customerName : activity.service}
                deliveredAt={activity.deliveredAt}
                date={selection ? formatPeriodDay(saoPauloDay(activity.deliveredAt)) : formatDeliveredAt(activity.deliveredAt)}
                description={activity.description}
              />
            ))}
          </section>
        ))}
      </StatementSheet>
    );
  } catch (error) {
    const message = error instanceof StatementError ? error.message : "Não foi possível montar o extrato.";
    return <main className="statement-sheet"><p className="form-error">{message}</p></main>;
  }
}
