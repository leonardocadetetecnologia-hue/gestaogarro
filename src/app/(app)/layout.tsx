import { Suspense } from "react";
import { ErrorBanner } from "@/components/error-banner";
import { Shell, type NavItem } from "@/components/shell";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const unread = await prisma.notification.count({ where: { userId: user.id, readAt: null } });
  const items: NavItem[] = [{ href: "/", label: "Painel", icon: "painel" }];
  if (can(user.role, "crm")) {
    items.push(
      { href: "/crm", label: "CRM", icon: "crm" },
      { href: "/clientes", label: "Clientes", icon: "clientes" },
      { href: "/follow-ups", label: "Follow-ups", icon: "agenda" },
    );
  }
  if (can(user.role, "commercial.values")) items.push({ href: "/vendas", label: "Vendas", icon: "vendas" });
  if (user.role === "GESTOR_GARRO") items.push({ href: "/demandas", label: "Demandas", icon: "demandas" });
  if (user.role === "EDITOR") items.push({ href: "/demandas", label: "Minhas demandas", icon: "demandas" });
  items.push({
    href: "/agenda",
    label: user.role === "GESTOR_GARRO" ? "Agenda global" : "Minha agenda",
    icon: "agenda",
  });
  if (can(user.role, "users")) items.push({ href: "/usuarios", label: "Usuários", icon: "usuarios" });
  if (can(user.role, "settings")) items.push({ href: "/configuracoes", label: "Configurações", icon: "config" });
  items.push(
    { href: "/notificacoes", label: "Notificações", icon: "avisos" },
    { href: "/perfil", label: "Meu perfil", icon: "perfil" },
  );

  return (
    <Shell user={user} items={items} unread={unread}>
      <Suspense>
        <ErrorBanner />
      </Suspense>
      {children}
    </Shell>
  );
}
