import { describe, expect, it } from "vitest";
import { addBusinessDays } from "./business-days";

const holidays = new Set(["2026-11-02"]);

describe("prazo em dias úteis", () => {
  it("entrega no próprio dia quando o prazo é zero", () => {
    expect(addBusinessDays("2026-10-31", 0, holidays)).toBe("2026-10-31");
    expect(addBusinessDays("2026-11-01", 0, new Set())).toBe("2026-11-01");
  });

  it("pula sábado, domingo e feriado da lista", () => {
    expect(addBusinessDays("2026-10-30", 1, new Set())).toBe("2026-11-02");
    expect(addBusinessDays("2026-10-30", 1, holidays)).toBe("2026-11-03");
    expect(addBusinessDays("2026-10-28", 5, holidays)).toBe("2026-11-05");
  });

  it("no ensaio de 03/11 com 10 dias úteis, entrega em 17/11", () => {
    expect(addBusinessDays("2026-11-03", 10, new Set())).toBe("2026-11-17");
  });

  it("na volta da seleção em 12/11, conta 10 dias úteis e pula o feriado de 20/11", () => {
    expect(addBusinessDays("2026-11-12", 10, new Set(["2026-11-20"]))).toBe("2026-11-27");
  });
});
