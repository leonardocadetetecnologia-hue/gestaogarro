"use client";

import { useEffect } from "react";

export function StatementPrint({ auto }: { auto: boolean }) {
  useEffect(() => {
    if (auto) window.print();
  }, [auto]);
  return (
    <div className="statement-toolbar">
      <button className="button primary" type="button" onClick={() => window.print()}>Salvar PDF</button>
      <p>No destino da impressão, escolha salvar como PDF.</p>
    </div>
  );
}
