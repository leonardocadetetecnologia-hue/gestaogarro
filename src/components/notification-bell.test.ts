import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Alert } from "@/lib/data";
import { BellList, unreadFor } from "./notification-bell";

const nova: Alert = { id: "nova", userId: "eu", title: "Nova atribuição", detail: "Reel da campanha", at: "2026-10-28T15:00:00.000Z", read: false };
const lida: Alert = { id: "lida", userId: "eu", title: "Prazo próximo", detail: "Revisão", at: "2026-10-27T15:00:00.000Z", read: true };
const alheia: Alert = { id: "alheia", userId: "outra", title: "Segredo de outra pessoa", detail: "Não mostrar", at: "2026-10-28T15:00:00.000Z", read: false };

describe("sino de notificações", () => {
  it("mostra só as não lidas da pessoa logada", () => {
    const html = renderToStaticMarkup(createElement("ul", null, unreadFor([nova, lida, alheia], "eu").map(alert => createElement("li", { key: alert.id }, alert.title))));
    expect(unreadFor([nova, lida, alheia], "eu").map(alert => alert.id)).toEqual(["nova"]);
    expect(html).toContain("Nova atribuição");
    expect(html).not.toContain("Prazo próximo");
    expect(html).not.toContain("Segredo de outra pessoa");
  });

  it("oferece limpar todas e limpar uma", () => {
    const html = renderToStaticMarkup(createElement(BellList, {
      alerts: [nova],
      onOpen: () => undefined,
      onClear: () => undefined,
      onClearAll: () => undefined,
    }));
    expect(html).toContain("Limpar todas");
    expect(html).toContain("Limpar Nova atribuição");
    expect(html).toContain("Reel da campanha");
  });
});
