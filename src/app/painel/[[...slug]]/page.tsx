import { Suspense } from "react";
import { DashboardApp } from "@/components/DashboardApp";

export default function Painel() {
  return (
    <Suspense fallback={<div className="loading-page">Carregando painel…</div>}>
      <DashboardApp />
    </Suspense>
  );
}
