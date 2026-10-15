import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
const { context } = vi.hoisted(() => ({ context: { role: "GESTOR_GARRO", busy: false, saveTaskScript: vi.fn() } }));
vi.mock("@/lib/store", () => ({ useGarro: () => context }));
import { TaskScript } from "./task-script";
const task = { id: "task", demandId: "d", title: "Vídeo principal", editorId: "", status: "A iniciar" as const, editorDue: "", reviewDue: "", clientDue: "", progress: 0 };
beforeEach(() => { context.role = "GESTOR_GARRO"; });
describe("botão Script", () => {
  it.each(["", "Texto salvo do entregável"])("mantém a caixa oculta até selecionar Script, mesmo com conteúdo: %s", script => {
    const html = renderToStaticMarkup(createElement(TaskScript, { task: { ...task, script } }));
    expect(html).toContain("Script</button>"); expect(html).toContain('aria-expanded="false"'); expect(html).not.toContain("<textarea"); expect(html).not.toContain("Texto salvo do entregável");
  });
  it("permite que o editor abra o Script para consulta sem botão de salvar exposto", () => {
    context.role = "EDITOR"; const html = renderToStaticMarkup(createElement(TaskScript, { task: { ...task, script: "Roteiro" } }));
    expect(html).toContain("Script</button>"); expect(html).not.toContain("Salvar script"); expect(html).not.toContain("<textarea");
  });
});
