"use client";

import { useEffect } from "react";

async function printStatement() {
  await Promise.allSettled(Array.from(document.querySelectorAll<HTMLImageElement>(".statement-sheet img"), image => image.decode()));
  window.print();
}

export function StatementPrint({ auto }: { auto: boolean }) {
  useEffect(() => {
    if (auto) void printStatement();
  }, [auto]);
  return (
    <div className="statement-toolbar">
      <button className="button primary" type="button" onClick={() => void printStatement()}>Salvar PDF</button>
      <p>No destino da impressão, escolha salvar como PDF.</p>
    </div>
  );
}
