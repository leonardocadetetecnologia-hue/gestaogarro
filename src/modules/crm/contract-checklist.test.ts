import { describe, expect, it } from "vitest";
import { checklistSummary, contractChecklist, sendBlockedMessage } from "./contract-checklist";

const customer = {
  personType: "PESSOA_FISICA" as const,
  street: "Rua da Garro",
  addressCity: "Belo Horizonte",
  state: "MG",
  birthdays: [{ name: "Ana", birthDate: "1990-05-02" }],
};

const line = {
  id: "ensaio", serviceId: "foto", serviceName: "Ensaio", variationName: "Foto", extra: false,
  serviceDate: "2026-11-03", proposedDays: 10, sortOrder: 1,
};

describe("checklist do contrato", () => {
  it("libera o envio com data e prazo, mesmo com outros itens pendentes", () => {
    const check = contractChecklist({ contractSigned: false, lines: [line], customer: {} });
    expect(check.canSend).toBe(true);
    expect(check.blocking).toEqual([]);
    expect(check.pending.map(item => item.label)).toEqual(["Contrato assinado", "Informações pessoais"]);
    expect(checklistSummary(check.pending)).toBe("Faltam 2 itens: Contrato assinado · Informações pessoais");
  });

  it("trava o envio quando falta data ou prazo e aceita prazo zero", () => {
    expect(contractChecklist({ contractSigned: true, lines: [{ ...line, serviceDate: "" }], customer }).canSend).toBe(false);
    expect(contractChecklist({ contractSigned: true, lines: [{ ...line, proposedDays: null }], customer }).canSend).toBe(false);
    expect(contractChecklist({ contractSigned: true, lines: [{ ...line, proposedDays: 0 }], customer }).canSend).toBe(true);
    expect(sendBlockedMessage).toBe("Preencha a data do serviço e o prazo para enviar à produção");
  });

  it("no Plano EXP, só a primeira captação exige data", () => {
    const captures = [1, 2, 3].map(order => ({
      id: `cap-${order}`, serviceId: "exp", serviceName: "Plano EXP", variationName: "2h · Só vídeo", extra: false,
      serviceDate: order === 1 ? "2026-11-03" : "", proposedDays: 7, sortOrder: order,
    }));
    const open = contractChecklist({ contractSigned: true, lines: captures, customer });
    expect(open.canSend).toBe(true);
    expect(open.pending.some(item => item.id === "serviceDate")).toBe(false);
    expect(contractChecklist({
      contractSigned: true,
      lines: captures.map(item => item.sortOrder === 1 ? { ...item, serviceDate: "" } : item),
      customer,
    }).canSend).toBe(false);
    expect(contractChecklist({
      contractSigned: true,
      lines: captures.map(item => item.sortOrder === 3 ? { ...item, proposedDays: null } : item),
      customer,
    }).canSend).toBe(false);
  });

  it("a Gestora ignora o cadastro, e data e prazo continuam obrigatórios", () => {
    const waived = contractChecklist({ contractSigned: false, waived: true, lines: [line], customer: {} });
    expect(waived.pending).toEqual([]);
    expect(waived.ignored.map(item => item.id)).toEqual(["signed", "personal"]);
    const stillBlocked = contractChecklist({
      contractSigned: false, waived: true, lines: [{ ...line, serviceDate: "" }], customer: {},
    });
    expect(stillBlocked.canSend).toBe(false);
    expect(stillBlocked.pending.map(item => item.id)).toEqual(["serviceDate"]);
  });
});
