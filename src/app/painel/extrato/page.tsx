import { requireUser } from "@/lib/auth";
import { GarroBrand } from "@/components/garro-brand";
import { formatDeliveredAt, formatMonth, formatPeriodDay, loadDeliveryStatement, parseStatementFilters, saoPauloDay, StatementError } from "@/modules/reports/delivery-statement";
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
    const periodLabel = month ? formatMonth(month) : from || to ? `${from ? formatPeriodDay(from) : "início"} a ${to ? formatPeriodDay(to) : "hoje"}` : "Todo o período";
    return (
      <main className="statement-sheet">
        <StatementPrint auto={one(params.imprimir) === "1"} />
        <header>
          <GarroBrand size={64} wordmarkWidth={200} priority />
          <div>
            <p>{statement.focus ? "Relatório de entrega" : "Extrato de entregas"}</p>
            <h1>{statement.focus?.title || "O que a Garro entregou"}</h1>
          </div>
        </header>
        {selection ? (
          <dl>
            <div><dt>Emitido em</dt><dd>{issuedAt}</dd></div>
          </dl>
        ) : statement.focus ? (
          <dl>
            <div><dt>Projeto</dt><dd>{statement.focus.title}</dd></div>
            <div><dt>Cliente</dt><dd>{statement.focus.customerName}</dd></div>
            <div><dt>Período</dt><dd>{periodLabel}</dd></div>
            <div><dt>Emitido em</dt><dd>{issuedAt}</dd></div>
          </dl>
        ) : (
          <dl>
            <div><dt>Cliente</dt><dd>{customer}</dd></div>
            <div><dt>Tipo de entrega</dt><dd>{serviceLabel}</dd></div>
            <div><dt>Agrupamento</dt><dd>{statement.group === "servico" ? "Por tipo de entrega" : "Por cliente"}</dd></div>
            <div><dt>Período</dt><dd>{periodLabel}</dd></div>
            <div><dt>Emitido em</dt><dd>{issuedAt}</dd></div>
          </dl>
        )}
        {statement.example && <p className="statement-example">Modelo ilustrativo. Estes nomes não são clientes da Garro.</p>}
        <p className="statement-note">{selection ? "Cliente, o que foi feito e a data da entrega. O registro continua no sistema." : statement.focus ? "Somente o que esta demanda já entregou ao cliente, neste período. Cada entregável mantém o número da criação." : "Somente demandas concluídas na produção. Cada item registra a atividade entregue e a data em que isso aconteceu."}</p>
        {!statement.example && statement.total === 0 && <p className="empty-state">Nenhuma entrega concluída neste filtro.</p>}
        {statement.sections.map(section => (
          <section key={section.label}>
            <h2>{section.label}</h2>
            {section.activities.map(activity => (
              <article key={activity.id}>
                <div>
                  <h3>{activity.number ? `${activity.number}. ${activity.title}` : activity.title}</h3>
                  {!selection && <p>{statement.group === "servico" ? activity.customerName : activity.service}</p>}
                </div>
                <time dateTime={activity.deliveredAt}>{selection ? formatPeriodDay(saoPauloDay(activity.deliveredAt)) : formatDeliveredAt(activity.deliveredAt)}</time>
                <p>{activity.description}</p>
              </article>
            ))}
          </section>
        ))}
        <footer>Garro Produtora · extrato de produção concluída · {statement.total} {statement.total === 1 ? "atividade" : "atividades"}</footer>
      </main>
    );
  } catch (error) {
    const message = error instanceof StatementError ? error.message : "Não foi possível montar o extrato.";
    return <main className="statement-sheet"><p className="form-error">{message}</p></main>;
  }
}
