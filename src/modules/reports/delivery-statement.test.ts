import { describe, expect, it } from "vitest";
import { activitiesFromDemand, buildStatement, parseStatementFilters, statementOrExample, type CompletedDemandInput } from "./delivery-statement";

const deliveredAt = new Date("2026-10-10T18:30:00.000Z");

function demand(overrides: Partial<CompletedDemandInput> = {}): CompletedDemandInput {
  return {
    id: "demand-1",
    title: "Campanha de outubro",
    description: "Captação e edição do ensaio.",
    status: "ENTREGUE",
    updatedAt: deliveredAt,
    customer: { id: "cliente-1", name: "Ana Lima" },
    service: "Ensaio PESSOAL",
    deliverables: [{
      id: "item-1",
      title: "Vídeo principal",
      description: "Edição do vídeo de apresentação.",
      status: "ENTREGUE",
      clientDeliveredAt: deliveredAt,
    }],
    ...overrides,
  };
}

describe("extrato de entregas concluídas", () => {
  it("ignora demanda e entregável que ainda não foram concluídos", () => {
    const open = demand({ status: "EM_PRODUCAO", deliverables: [{ id: "item-2", title: "Roteiro", description: "Ainda em edição", status: "EM_PRODUCAO", clientDeliveredAt: null }] });
    const partial = demand({
      deliverables: [
        { id: "item-3", title: "Foto aprovada", description: "Seleção entregue.", status: "ENTREGUE", clientDeliveredAt: deliveredAt },
        { id: "item-4", title: "Reels", description: "Ainda na revisão.", status: "EM_REVISAO", clientDeliveredAt: null },
      ],
    });
    expect(activitiesFromDemand(open)).toEqual([]);
    expect(activitiesFromDemand(partial).map(item => item.title)).toEqual(["Foto aprovada"]);
  });

  it("descreve o que foi feito e quando, sem valor comercial", () => {
    const [activity] = activitiesFromDemand(demand());
    expect(activity).toMatchObject({
      customerName: "Ana Lima",
      service: "Ensaio PESSOAL",
      title: "Vídeo principal",
      description: "Edição do vídeo de apresentação.",
      deliveredAt: deliveredAt.toISOString(),
    });
    expect(JSON.stringify(activity)).not.toMatch(/value|valor|preco|preço/i);
  });

  it("usa a demanda concluída quando não há entregável marcado como entregue", () => {
    const [activity] = activitiesFromDemand(demand({ deliverables: [], service: null, description: "Entrega direta do álbum." }));
    expect(activity).toMatchObject({ title: "Campanha de outubro", service: "Campanha de outubro", description: "Entrega direta do álbum." });
  });

  it("filtra por cliente ou tipo e agrupa a categoria pedida", () => {
    const rows = [
      demand(),
      demand({
        id: "demand-2",
        customer: { id: "cliente-2", name: "Bruno Dias" },
        service: "Captação de vídeo",
        deliverables: [{ id: "item-5", title: "Cobertura", description: "Filmagem do evento.", status: "CONCLUIDO", clientDeliveredAt: new Date("2026-09-01T15:00:00.000Z") }],
      }),
    ];
    const byCustomer = buildStatement(rows, { customerId: "cliente-1", service: "", group: "cliente", from: "", to: "" });
    expect(byCustomer.total).toBe(1);
    expect(byCustomer.sections.map(section => section.label)).toEqual(["Ana Lima"]);
    expect(byCustomer.services).toEqual(["Captação de vídeo", "Ensaio PESSOAL"]);

    const byService = buildStatement(rows, { customerId: "", service: "Captação de vídeo", group: "servico", from: "", to: "" });
    expect(byService.sections).toEqual([expect.objectContaining({ label: "Captação de vídeo" })]);
    expect(byService.sections[0].activities[0].customerName).toBe("Bruno Dias");
  });

  it("mostra um modelo identificado quando ainda não há entrega concluída", () => {
    const model = statementOrExample([], { customerId: "", service: "", group: "cliente", from: "", to: "" });
    expect(model.example).toBe(true);
    expect(model.sections.map(section => section.label)).toEqual(["Cliente exemplo A", "Cliente exemplo B"]);
    expect(model.total).toBe(3);
    const real = statementOrExample([demand()], { customerId: "", service: "", group: "cliente", from: "", to: "" });
    expect(real.example).toBe(false);
    expect(real.sections.map(section => section.label)).toEqual(["Ana Lima"]);
  });

  it("limita o extrato ao período do cliente", () => {
    const rows = [demand(), demand({
      id: "demand-antiga",
      deliverables: [{ id: "item-antiga", title: "Entrega antiga", description: "Trabalho de meses atrás.", status: "ENTREGUE", clientDeliveredAt: new Date("2026-01-10T15:00:00.000Z") }],
    })];
    const period = buildStatement(rows, { customerId: "cliente-1", service: "", group: "cliente", from: "2026-09-01", to: "2026-10-31" });
    expect(period.sections[0].activities.map(item => item.title)).toEqual(["Vídeo principal"]);
    expect(() => parseStatementFilters(new URLSearchParams("from=2026-11-01&to=2026-10-01"))).toThrow(/Período inválido/);
  });

  it("numera pela criação e conserva o número quando um item do meio não foi entregue", () => {
    const activities = activitiesFromDemand(demand({
      deliverables: [
        { id: "c", title: "Terceiro", description: "Entregue por último.", status: "ENTREGUE", clientDeliveredAt: deliveredAt, createdAt: new Date("2026-10-03T12:00:00.000Z") },
        { id: "a", title: "Primeiro", description: "Entregue primeiro.", status: "CONCLUIDO", clientDeliveredAt: deliveredAt, createdAt: new Date("2026-10-01T12:00:00.000Z") },
        { id: "b", title: "Segundo", description: "Ainda na revisão.", status: "EM_REVISAO", clientDeliveredAt: null, createdAt: new Date("2026-10-02T12:00:00.000Z") },
      ],
    }));
    expect(activities.map(item => [item.number, item.title])).toEqual([[1, "Primeiro"], [3, "Terceiro"]]);
    expect(JSON.stringify(activities)).not.toMatch(/value|valor|preco|preço|contato|arquivo/i);
  });

  it("aceita um mês ou duas datas e limita o relatório à demanda", () => {
    expect(parseStatementFilters(new URLSearchParams("month=2024-02"))).toMatchObject({ from: "2024-02-01", to: "2024-02-29", month: "2024-02" });
    expect(parseStatementFilters(new URLSearchParams("month=2026-02")).to).toBe("2026-02-28");
    expect(() => parseStatementFilters(new URLSearchParams("month=2026-13"))).toThrow(/Mês inválido/);
    expect(() => parseStatementFilters(new URLSearchParams("month=2026-10&from=2026-10-01"))).toThrow(/mês ou um intervalo/);
    expect(() => parseStatementFilters(new URLSearchParams("demandId=../x"))).toThrow(/Demanda inválida/);

    const other = demand({
      id: "demand-2",
      deliverables: [{ id: "item-x", title: "Outra demanda", description: "Outro projeto.", status: "ENTREGUE", clientDeliveredAt: deliveredAt }],
    });
    const old = demand({
      id: "demand-antiga",
      deliverables: [{ id: "item-antiga", title: "Entrega antiga", description: "Trabalho de meses atrás.", status: "ENTREGUE", clientDeliveredAt: new Date("2026-01-10T15:00:00.000Z") }],
    });
    const october = buildStatement([demand(), other, old], parseStatementFilters(new URLSearchParams("month=2026-10&demandId=demand-1")));
    expect(october.total).toBe(1);
    expect(october.sections[0].activities.map(item => [item.number, item.title])).toEqual([[1, "Vídeo principal"]]);

    const ordered = buildStatement([demand({
      deliverables: [
        { id: "late", title: "Segundo", description: "Caiu depois.", status: "ENTREGUE", clientDeliveredAt: new Date("2026-10-20T18:00:00.000Z"), createdAt: new Date("2026-10-02T12:00:00.000Z") },
        { id: "early", title: "Primeiro", description: "Nasceu antes.", status: "ENTREGUE", clientDeliveredAt: new Date("2026-10-05T18:00:00.000Z"), createdAt: new Date("2026-10-01T12:00:00.000Z") },
      ],
    })], parseStatementFilters(new URLSearchParams("demandId=demand-1&month=2026-10")));
    expect(ordered.sections[0].activities.map(item => item.title)).toEqual(["Primeiro", "Segundo"]);

    const january = buildStatement([demand(), old], parseStatementFilters(new URLSearchParams("demandId=demand-1&from=2026-01-01&to=2026-01-31")));
    expect(january.total).toBe(0);
    const model = statementOrExample([], parseStatementFilters(new URLSearchParams("demandId=demand-1&month=2026-10")));
    expect(model.example).toBe(false);
    expect(model.total).toBe(0);

    const picked = parseStatementFilters(new URLSearchParams("demandIds=demand-1,demand-antiga"));
    expect(picked.demandIds).toEqual(["demand-1", "demand-antiga"]);
    const selection = buildStatement([demand(), other, old], picked);
    expect(selection.sections.flatMap((section) => section.activities.map((item) => item.demandId)).sort()).toEqual(["demand-1", "demand-antiga"]);
    expect(() => parseStatementFilters(new URLSearchParams("demandIds=../x"))).toThrow(/Seleção de entregas inválida/);
    const emptySelection = statementOrExample([], parseStatementFilters(new URLSearchParams("demandIds=demand-1")));
    expect(emptySelection.example).toBe(false);
  });
});
