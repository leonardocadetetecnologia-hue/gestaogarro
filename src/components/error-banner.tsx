"use client";

import { useSearchParams } from "next/navigation";

export function ErrorBanner() {
  const message = useSearchParams().get("erro");
  if (!message || message === "acesso") return null;
  return <p className="mb-3 text-sm text-[var(--red)]">{message}</p>;
}
