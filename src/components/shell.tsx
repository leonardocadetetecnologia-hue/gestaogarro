"use client";

import {
  Bell,
  CalendarDays,
  ClipboardList,
  Kanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  UserRound,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { logout } from "@/modules/auth/actions";
import type { SessionUser } from "@/lib/auth";
import { GarroMark } from "./garro-brand";

export type NavItem = { href: string; label: string; icon: string };

const ICONS = {
  painel: LayoutDashboard,
  crm: Kanban,
  clientes: Users,
  vendas: ClipboardList,
  demandas: ClipboardList,
  agenda: CalendarDays,
  usuarios: UserRound,
  config: Settings,
  avisos: Bell,
  perfil: UserRound,
};

export function Shell({
  user,
  items,
  unread,
  children,
}: {
  user: SessionUser;
  items: NavItem[];
  unread: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const nav = (
    <nav className="flex h-full flex-col gap-1 p-2">
      <div className="mb-3 flex h-10 items-center px-2 font-semibold text-[var(--terra-dark)]">
        <GarroMark size={32} decorative />
        <span className="ml-3 hidden group-hover:inline md:hidden">Garro</span>
        <span className="nav-label ml-3">Garro</span>
      </div>
      {items.map((item) => {
        const Icon = ICONS[item.icon as keyof typeof ICONS] ?? LayoutDashboard;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className="flex h-10 items-center gap-3 rounded-md px-2 text-sm hover:bg-[var(--bg-2)]"
          >
            <Icon size={18} />
            <span className="nav-label truncate">
              {item.label}
              {item.href === "/notificacoes" && unread > 0 ? ` (${unread})` : ""}
            </span>
          </Link>
        );
      })}
      <form action={logout} className="mt-auto">
        <button className="flex h-10 w-full items-center gap-3 rounded-md px-2 text-left text-sm hover:bg-[var(--bg-2)]">
          <LogOut size={18} />
          <span className="nav-label">Sair</span>
        </button>
      </form>
    </nav>
  );

  return (
    <div className="min-h-screen">
      <aside className="group fixed inset-y-0 left-0 z-40 hidden w-[60px] overflow-hidden border-r border-[var(--border)] bg-[var(--surface)] transition-[width] duration-150 hover:w-[220px] hover:shadow-xl md:block">
        {nav}
      </aside>
      {open ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button className="absolute inset-0 bg-[#2E211B]/40" onClick={() => setOpen(false)} aria-label="Fechar menu" />
          <aside className="relative h-full w-[240px] bg-[var(--surface)] shadow-xl">{nav}</aside>
        </div>
      ) : null}
      <div className="md:pl-[60px]">
        <header className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3">
          <button className="md:hidden" onClick={() => setOpen(true)} aria-label="Abrir menu">
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
          <p className="text-sm text-[var(--muted)]">{user.name}</p>
          <Link href="/notificacoes" className="text-sm">
            Avisos{unread ? ` (${unread})` : ""}
          </Link>
        </header>
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
