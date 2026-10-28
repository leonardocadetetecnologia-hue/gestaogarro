import { describe, expect, it } from "vitest";
import { draftsFromActivities, reportDocuments } from "./statement-draft";
import type { StatementActivity } from "@/modules/reports/delivery-statement";

const video: StatementActivity = {
  id: "item-1", demandId: "demand-1", customerId: "ana", customerName: "Ana Lima",
  service: "Ensaio", title: "Vídeo principal", description: "Edição do vídeo.", deliveredAt: "2026-10-10T18:30:00.000Z", number: 1,
};
const photo: StatementActivity = {
  id: "item-2", demandId: "demand-2", customerId: "igor", customerName: "Igor Cardoso",
  service: "Ensaio PESSOAL", title: "Revelação", description: "Seleção entregue.", deliveredAt: "2026-09-02T15:00:00.000Z", number: 2,
};

describe("prévia editável do extrato", () => {
  it("junta as entregas escolhidas e separa uma página para cada", () => {
    const drafts = draftsFromActivities([video, photo]);
    expect(drafts.map((draft) => [draft.demandId, draft.date, draft.omitDate])).toEqual([
      ["demand-1", "2026-10-10", false],
      ["demand-2", "2026-09-02", false],
    ]);
    const together = reportDocuments(drafts, "junto");
    expect(together).toHaveLength(1);
    expect(together[0].parts.map((part) => part.customer)).toEqual(["Ana Lima", "Igor Cardoso"]);
    const each = reportDocuments(drafts.map((draft, index) => index === 1 ? { ...draft, include: false } : draft), "cada");
    expect(each.map((document) => document.title)).toEqual(["Vídeo principal"]);
  });

  it("tira do relatório o que foi desmarcado e aceita entrega sem data", () => {
    const [first] = draftsFromActivities([video]);
    const hidden = {
      ...first,
      omitDate: true,
      showCustomer: false,
      showNote: true,
      note: "Entrega combinada sem hora.",
      lines: first.lines.map((line) => ({ ...line, showDescription: false, showService: false, showNumber: false })),
    };
    const [document] = reportDocuments([hidden], "cada");
    expect(document.parts[0].date).toBe("");
    expect(document.parts[0].customer).toBe("");
    expect(document.parts[0].lines[0]).toEqual({ id: "item-1", heading: "Vídeo principal", description: "", service: "" });
    expect(document.parts[0].note).toBe("Entrega combinada sem hora.");
    const empty = reportDocuments([{ ...hidden, showNote: false, lines: hidden.lines.map((line) => ({ ...line, include: false })) }], "junto");
    expect(empty).toEqual([]);
  });
});