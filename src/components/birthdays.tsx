"use client";

import { Cake } from "lucide-react";
import { birthdayWhen, formatBirthDate, upcomingClientBirthdays } from "@/lib/birthdays";
import { useGarro } from "@/lib/store";
import { Empty, SectionHead } from "./Ui";

export function UpcomingBirthdays() {
  const { state } = useGarro();
  const items = upcomingClientBirthdays(state.customers);
  return <section className="surface" aria-label="Aniversariantes próximos">
    <SectionHead title="Aniversariantes próximos" meta="Clientes ativos nos próximos 30 dias"/>
    <div className="list-stack">
      {items.map(item => <div className="row-item" key={item.id}>
        <span className="circle-icon"><Cake size={18}/></span>
        <div className="row-main"><strong>{item.name}</strong><span>{formatBirthDate(item.birthDate)} · {birthdayWhen(item.days)}</span></div>
      </div>)}
      {items.length === 0 && <Empty text="Nenhum aniversário de cliente nos próximos 30 dias."/>}
    </div>
  </section>;
}
