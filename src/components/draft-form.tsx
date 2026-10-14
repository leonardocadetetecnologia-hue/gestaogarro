"use client";

import { useEffect } from "react";
import { saveDraft } from "@/modules/crm/actions";

export function DraftWatcher({
  formId,
  entityType,
  entityId,
}: {
  formId: string;
  entityType: string;
  entityId: string;
}) {
  useEffect(() => {
    const save = () => {
      const form = document.getElementById(formId);
      if (!(form instanceof HTMLFormElement)) return;
      const content: Record<string, string> = {};
      for (const [key, value] of new FormData(form).entries()) {
        if (typeof value === "string") content[key] = value;
      }
      void saveDraft(entityType, entityId, content);
    };
    const id = window.setInterval(save, 8000);
    return () => window.clearInterval(id);
  }, [entityId, entityType, formId]);

  return (
    <button
      type="button"
      className="rounded-md border border-[var(--border)] px-3 py-2"
      onClick={() => {
        const form = document.getElementById(formId);
        if (!(form instanceof HTMLFormElement)) return;
        const content: Record<string, string> = {};
        for (const [key, value] of new FormData(form).entries()) {
          if (typeof value === "string") content[key] = value;
        }
        void saveDraft(entityType, entityId, content);
      }}
    >
      Salvar rascunho
    </button>
  );
}
