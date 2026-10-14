"use client";

import { useEffect, useState } from "react";
import { remainingLabel } from "@/lib/deadlines";

export function LiveRemaining({ due, done }: { due: string | null; done: string | null }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return <span>{remainingLabel(due ? new Date(due) : null, done ? new Date(done) : null, new Date(now))}</span>;
}
