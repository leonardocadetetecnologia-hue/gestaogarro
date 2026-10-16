import { requireUser } from "@/lib/auth";
import { GarroBrand } from "@/components/garro-brand";
import { formatDeliveredAt, formatPeriodDay, loadDeliveryStatement, parseStatementFilters, StatementError } from "@/modules/reports/delivery-statement";
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
  if (customerId) query.set("customerId", customerId);
  if (service) query.set("service", service);
  if (group) query.set("group", group);
  if (from) query.set("from", from);
  if (to) query.set("to", to);

  try {
    const statement = await loadDeliveryStatement(user, parseStatementFilters(query));
    const customer = statement.customers.find(item => item.id === customerId)?.name || "Todos os clientes";
    const serviceLabel = service || "Todos os tipos";
    const issuedAt = formatDeliveredAt(new Date().toISOString());
    const periodLabel = from || to ? `${from ? formatPeriodDay(from) : "início"} a ${to ? formatPeriodDay(to) : "hoje"}` : "Todo o período";
    return (
      <main className="statement-sheet">
        <StatementPrint auto={one(params.imprimir) === "1"} />
        <header>
          <GarroBrand size={64} wordmarkWidth={200} priority />
          <div>
            <p>Extrato de entregas</p>
            <h1>O que a Garro entregou</h1>
          </div>
        </header>
        <dl>
          <div><dt>Cliente</dt><dd>{customer}</dd></div>
          <div><dt>Tipo de entrega</dt><dd>{serviceLabel}</dd></div>
          <div><dt>Agrupamento</dt><dd>{statement.group === "servico" ? "Por tipo de entrega" : "Por cliente"}</dd></div>
          <div><dt>Período</dt><dd>{periodLabel}</dd></div>
          <div><dt>Emitido em</dt><dd>{issuedAt}</dd></div>
        </dl>
        {statement.example && <p className="statement-example">Modelo ilustrativo. Estes nomes não são clientes da Garro.</p>}
        <p className="statement-note">Somente demandas concluídas na produção. Cada item registra a atividade entregue e a data em que isso aconteceu.</p>
        {!statement.example && statement.total === 0 && <p className="empty-state">Nenhuma entrega concluída neste filtro.</p>}
        {statement.sections.map(section => (
          <section key={section.label}>
            <h2>{section.label}</h2>
            {section.activities.map(activity => (
              <article key={activity.id}>
                <div>
                  <h3>{activity.title}</h3>
                  <p>{statement.group === "servico" ? activity.customerName : activity.service}</p>
                </div>
                <time dateTime={activity.deliveredAt}>{formatDeliveredAt(activity.deliveredAt)}</time>
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
