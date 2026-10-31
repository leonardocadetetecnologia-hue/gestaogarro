import { describe, expect, it } from "vitest";
import { normalizeServiceInput, serviceChanges } from "./rules";
import type { ServiceSnapshot } from "./model";

const base: ServiceSnapshot = {
  name: "Pacote", category: "ENSAIOS", description: "Ensaio.", referencePrice: 1000, priceType: "FECHADO",
  deliveryDays: 5, hasSelection: false, selectionDays: null, recurrence: "UMA_VEZ", recurrenceDate: "",
  standardCost: 300, variations: [],
};

describe("regras do catálogo", () => {
  it("serviço extra fica sem preço e as outras categorias ficam em 1x", () => {
    const extra = normalizeServiceInput({ ...base, category: "SERVICO_EXTRA", variations: [{ name: "Pessoa", referencePrice: 200 }] }, true);
    expect(extra.referencePrice).toBeNull();
    expect(extra.variations[0].referencePrice).toBeNull();
    const capture = normalizeServiceInput({ ...base, category: "CAPTACAO", recurrence: "UM_ANO", recurrenceDate: "2026-12-01" }, true);
    expect(capture.recurrence).toBe("UMA_VEZ");
    expect(capture.recurrenceDate).toBe("");
  });

  it("plano exige a data quando a recorrência é uma data, e a seleção nasce em 7 dias", () => {
    expect(() => normalizeServiceInput({ ...base, category: "PLANOS", recurrence: "DATA", recurrenceDate: "" }, true)).toThrow(/data/);
    const plan = normalizeServiceInput({ ...base, category: "PLANOS", recurrence: "DATA", recurrenceDate: "2027-01-15", hasSelection: true, selectionDays: null }, true);
    expect(plan.recurrenceDate).toBe("2027-01-15");
    expect(plan.selectionDays).toBe(7);
  });

  it("recusa variação repetida e esconde o custo de quem não é a Gestora", () => {
    expect(() => normalizeServiceInput({ ...base, variations: [{ name: "Só vídeo", referencePrice: 10 }, { name: "só vídeo", referencePrice: 20 }] }, true)).toThrow(/variação/);
    const attendant = normalizeServiceInput({ ...base, standardCost: 900 }, false);
    expect(attendant.standardCost).toBeNull();
    const changes = serviceChanges(base, { ...base, name: "Pacote novo", standardCost: 900 }, true);
    expect(changes.map((item) => item.field)).toEqual(["Nome"]);
  });
});
