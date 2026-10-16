import { describe, expect, it } from "vitest";
import { activitiesFromDemand, buildStatement, statementOrExample, type CompletedDemandInput } from "./delivery-statement";

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
    const byCustomer = buildStatement(rows, { customerId: "cliente-1", service: "", group: "cliente" });
    expect(byCustomer.total).toBe(1);
    expect(byCustomer.sections.map(section => section.label)).toEqual(["Ana Lima"]);
    expect(byCustomer.services).toEqual(["Captação de vídeo", "Ensaio PESSOAL"]);

    const byService = buildStatement(rows, { customerId: "", service: "Captação de vídeo", group: "servico" });
    expect(byService.sections).toEqual([expect.objectContaining({ label: "Captação de vídeo" })]);
    expect(byService.sections[0].activities[0].customerName).toBe("Bruno Dias");
  });

  it("mostra um modelo identificado quando ainda não há entrega concluída", () => {
    const model = statementOrExample([], { customerId: "", service: "", group: "cliente" });
    expect(model.example).toBe(true);
    expect(model.sections.map(section => section.label)).toEqual(["Cliente exemplo A", "Cliente exemplo B"]);
    expect(model.total).toBe(3);
    const real = statementOrExample([demand()], { customerId: "", service: "", group: "cliente" });
    expect(real.example).toBe(false);
    expect(real.sections.map(section => section.label)).toEqual(["Ana Lima"]);
  });
});
