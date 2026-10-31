import { describe, expect, it } from "vitest";
import { leavesApproval, leavesClientDelivery, MANAGER_NEXT, managerStatusActions } from "./deliverable-flow";

describe("volta do entregável aprovado", () => {
  it("deixa a Gestora pedir correção ou desfazer a aprovação", () => {
    expect(MANAGER_NEXT.APROVADO).toEqual(expect.arrayContaining(["CORRECAO", "ENVIADO_REVISAO"]));
    expect(MANAGER_NEXT.ENTREGUE).toEqual(expect.arrayContaining(["CORRECAO", "ENVIADO_REVISAO"]));
    expect(managerStatusActions("Aprovado").map(action => action.label)).toEqual(["Solicitar correção", "Voltar para revisão"]);
    expect(managerStatusActions("Em revisão").map(action => action.label)).toEqual(["Aprovar", "Solicitar correção"]);
    expect(managerStatusActions("Em edição")).toEqual([]);
  });

  it("limpa a aprovação e a entrega ao cliente quando o item volta", () => {
    expect(leavesApproval("APROVADO", "CORRECAO")).toBe(true);
    expect(leavesApproval("ENTREGUE", "ENVIADO_REVISAO")).toBe(true);
    expect(leavesApproval("APROVADO", "ENTREGUE")).toBe(false);
    expect(leavesClientDelivery("ENTREGUE", "CORRECAO")).toBe(true);
    expect(leavesClientDelivery("APROVADO", "CORRECAO")).toBe(false);
    expect(leavesClientDelivery("ENTREGUE", "CONCLUIDO")).toBe(false);
  });
});
