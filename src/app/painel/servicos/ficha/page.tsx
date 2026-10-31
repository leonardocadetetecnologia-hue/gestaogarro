import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GarroBrand } from "@/components/garro-brand";
import { StatementPrint } from "../../extrato/print-button";
import { snapshotOf } from "@/modules/services/commands";
import { categoryLabel, deliveryLabel, eventHourDiscount, moneyLabel, priceTypeLabel, recurrenceLabel } from "@/modules/services/model";

export const dynamic = "force-dynamic";

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

export default async function ServiceSheetPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  if (user.role === "EDITOR") notFound();
  const id = one((await searchParams).id);
  if (!id) notFound();
  const row = await prisma.service.findUnique({ where: { id }, include: { variations: { orderBy: { sortOrder: "asc" } } } });
  if (!row) notFound();
  const service = snapshotOf(row);
  const hourly = service.priceType === "POR_HORA";
  return (
    <main className="statement-sheet service-sheet">
      <StatementPrint auto={false} />
      <header>
        <GarroBrand size={64} wordmarkWidth={200} priority />
        <div>
          <p>Ficha de serviço</p>
          <h1>{service.name}</h1>
        </div>
      </header>
      <dl>
        <div><dt>Categoria</dt><dd>{categoryLabel[service.category]}</dd></div>
        <div><dt>Status</dt><dd>{row.status === "ARQUIVADO" ? "Arquivado" : "Ativo"}</dd></div>
        <div><dt>Tipo de preço</dt><dd>{priceTypeLabel[service.priceType]}</dd></div>
        <div><dt>Preço de referência</dt><dd>{moneyLabel(service.referencePrice, hourly)}</dd></div>
        <div><dt>Prazo de entrega</dt><dd>{deliveryLabel(service.deliveryDays)}</dd></div>
        {service.category === "PLANOS" && <div><dt>Recorrência</dt><dd>{recurrenceLabel[service.recurrence]}{service.recurrenceDate ? ` · ${service.recurrenceDate}` : ""}</dd></div>}
        {service.hasSelection && <div><dt>Seleção pelo cliente</dt><dd>{service.selectionDays ?? 7} dias</dd></div>}
      </dl>
      <section>
        <h2>O que inclui</h2>
        <p>{service.description || "Descrição a definir."}</p>
      </section>
      {service.variations.length > 0 && <section>
        <h2>Variações</h2>
        <table>
          <tbody>{service.variations.map((variation) => <tr key={variation.name}><th>{variation.name}</th><td>{moneyLabel(variation.referencePrice, hourly)}</td></tr>)}</tbody>
        </table>
      </section>}
      {service.category === "EVENTOS" && <section>
        <h2>Desconto por duração</h2>
        <p>Mínimo de 2h. O desconto vale só nas horas além das 2 primeiras.</p>
        <table>
          <tbody>{eventHourDiscount.map((item) => <tr key={item.duration}><th>{item.duration}</th><td>{item.discount}</td></tr>)}</tbody>
        </table>
      </section>}
      {service.category === "SERVICO_EXTRA" && <p>Não é vendido sozinho. O valor é informado no fechamento, somado a um serviço principal.</p>}
      <footer>Garro Produtora · ficha para venda. O custo interno não entra neste documento.</footer>
    </main>
  );
}
