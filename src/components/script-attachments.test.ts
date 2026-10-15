import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
const { context } = vi.hoisted(() => ({ context: { role: "GESTOR_GARRO", busy: false } }));
vi.mock("@/lib/store", () => ({ useGarro: () => context }));
import { ScriptAttachments } from "./script-attachments";
const task = { id: "task", demandId: "d", title: "Reel", editorId: "e", status: "A iniciar" as const, editorDue: "", reviewDue: "", clientDue: "", progress: 0,
  attachments: [{ id: "a", fileName: "Roteiro da ação.pdf", size: 2048, createdAt: new Date().toISOString() }] };
describe("anexos do script", () => {
  it("expõe seleção dos três formatos e download por rota privada para a Gestora", () => {
    context.role = "GESTOR_GARRO";
    const html = renderToStaticMarkup(createElement(ScriptAttachments, { task }));
    expect(html).toContain('accept=".txt,.doc,.pdf"'); expect(html).toContain("Anexar arquivo"); expect(html).toContain("/api/script-attachments/a"); expect(html).toContain("10 MB");
  });
  it("mostra anexos ao editor sem permitir envio", () => {
    context.role = "EDITOR";
    const html = renderToStaticMarkup(createElement(ScriptAttachments, { task }));
    expect(html).toContain("Roteiro da ação.pdf"); expect(html).not.toContain('type="file"'); expect(html).not.toContain("Anexar arquivo");
  });
});
