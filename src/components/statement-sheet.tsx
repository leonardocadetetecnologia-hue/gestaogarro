import Image from "next/image";
import type { ReactNode } from "react";

export function StatementSheet({
  label, title, metadata, children, total, toolbar,
}: {
  label: string;
  title: string;
  metadata: [string, string][];
  children: ReactNode;
  total: number;
  toolbar?: ReactNode;
}) {
  const images = `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/images`;
  return (
    <main className="statement-sheet">
      {toolbar}
      <header>
        <div className="statement-lockup">
          <Image src={`${images}/garro-symbol-official.png`} alt="" width={64} height={64} loading="eager" unoptimized />
          <Image src={`${images}/garro-wordmark.png`} alt="Garro Produtora" width={186} height={68} loading="eager" unoptimized />
        </div>
        <div>
          <p>{label}</p>
          <h1>{title}</h1>
        </div>
      </header>
      <dl>
        {metadata.filter(([, value]) => value).map(([label, value]) => (
          <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
        ))}
      </dl>
      {children}
      <footer>Garro Produtora · extrato de produção concluída · {total} {total === 1 ? "atividade" : "atividades"}</footer>
    </main>
  );
}

export function StatementItem({ title, service, date, deliveredAt, description }: {
  title: string;
  service?: string;
  date?: string;
  deliveredAt?: string;
  description: string;
}) {
  return (
    <article>
      <div>
        {title && <h3>{title}</h3>}
        {service && <p>{service}</p>}
      </div>
      {date && <time dateTime={deliveredAt}>{date}</time>}
      {description && <p>{description}</p>}
    </article>
  );
}
