import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Alert, State } from "@/lib/data";
import { inboxSelection, NotificationsInbox, NotificationsView } from "./notifications";

const { context, push } = vi.hoisted(() => ({
  context: {
    state: { customers: [], opportunities: [], demands: [], deliverables: [], editors: [], schedule: [], alerts: [] } as State,
    activeEditorId: "eu",
    busy: false,
    readAlert: vi.fn(),
    readSelectedAlerts: vi.fn(),
    readAllAlerts: vi.fn(),
  },
  push: vi.fn(),
}));
vi.mock("@/lib/store", () => ({ useGarro: () => context }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const nova: Alert = { id: "nova", userId: "eu", title: "Nova atribuição", detail: "Reel da campanha", at: "2026-10-28T15:00:00.000Z", read: false, href: "/painel/demanda?id=demanda-1", demandId: "demanda-1" };
const lida: Alert = { id: "lida", userId: "eu", title: "Prazo próximo", detail: "Revisão", at: "2026-10-27T15:00:00.000Z", read: true };
const alheia: Alert = { id: "alheia", userId: "outra", title: "Segredo de outra pessoa", detail: "Não mostrar", at: "2026-10-28T15:00:00.000Z", read: false };

function rows(html: string) {
  return html.split("notification-row").slice(1);
}

describe("seleção da caixa de notificações", () => {
  it("seleciona ou limpa só as visíveis e ignora aviso de outra pessoa", () => {
    expect(inboxSelection([], ["nova", "lida"])).toMatchObject({ chosen: [], allVisible: false, partial: false, nextAll: ["nova", "lida"] });
    expect(inboxSelection(["nova", "alheia"], ["nova", "lida"])).toMatchObject({ chosen: ["nova"], allVisible: false, partial: true, nextAll: ["nova", "lida"] });
    expect(inboxSelection(["nova", "lida", "nova"], ["nova", "lida"]).allVisible).toBe(true);
    expect(inboxSelection(["nova", "lida"], ["nova", "lida"]).nextAll).toEqual([]);
  });

  it("mostra a caixa em cada linha, o cabeçalho e Ler todos, sem Ler selecionadas", () => {
    context.state = { ...context.state, alerts: [nova, lida, alheia] };
    const html = renderToStaticMarkup(createElement(NotificationsView));
    const list = rows(html);
    expect(html).not.toContain("Segredo de outra pessoa");
    expect(html).toContain("Caixa de notificações");
    expect(html).toContain("1 não lidas");
    expect(html).toContain('aria-label="Selecionar visíveis"');
    expect(html).toContain(">Ler todos</button>");
    expect(html).not.toContain("Ler selecionadas");
    expect(list).toHaveLength(2);
    expect(list[0]).toContain("Nova atribuição");
    expect(list[0]).toContain(">Nova<");
    expect(list[0]).toContain('aria-label="Selecionar"');
    expect(list[0].slice(list[0].indexOf("<button"))).not.toContain("checkbox");
    expect(list[1]).toContain("Prazo próximo");
    expect(list[1]).not.toContain(">Nova<");
  });

  it("mostra Ler selecionadas só quando há escolha e mantém a caixa fora do clique da linha", () => {
    const html = renderToStaticMarkup(createElement(NotificationsInbox, {
      alerts: [nova, lida],
      selectedIds: ["nova"],
      busy: false,
      onToggle: vi.fn(),
      onToggleVisible: vi.fn(),
      onOpen: vi.fn(),
      onReadSelected: vi.fn(),
      onReadAll: vi.fn(),
    }));
    const list = rows(html);
    expect(html).toContain(">Ler selecionadas</button>");
    expect(html).toContain(">Ler todos</button>");
    expect(html).toContain('data-mixed="true"');
    expect(list[0].indexOf("checkbox")).toBeLessThan(list[0].indexOf("<button"));
    expect(list[0]).toContain('checked=""');
    expect(list[1]).not.toContain('checked=""');
  });

  it("esconde a seleção quando a caixa está vazia e mantém Ler todos", () => {
    const html = renderToStaticMarkup(createElement(NotificationsInbox, {
      alerts: [],
      selectedIds: [],
      busy: false,
      onToggle: vi.fn(),
      onToggleVisible: vi.fn(),
      onOpen: vi.fn(),
      onReadSelected: vi.fn(),
      onReadAll: vi.fn(),
    }));
    expect(html).toContain("Nenhuma notificação para este perfil.");
    expect(html).toContain(">Ler todos</button>");
    expect(html).not.toContain("Ler selecionadas");
    expect(html).not.toContain("checkbox");
  });
});
