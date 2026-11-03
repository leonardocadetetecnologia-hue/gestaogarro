import { describe, expect, it } from "vitest";
import { projectDeliveryDate, serviceScheduleChanged } from "./service-schedule";

const holidays = new Set(["2026-11-20"]);

describe("entrega final do projeto", () => {
  it("usa a data mais tarde quando o contrato tem mais de um serviço", () => {
    expect(projectDeliveryDate([
      { serviceDate: "2026-11-03", proposedDays: 10, serviceId: "foto" },
      { serviceDate: "2026-11-03", proposedDays: 2, serviceId: "video" },
    ], new Set())).toBe("2026-11-17");
  });

  it("entrega no próprio dia quando o prazo é zero", () => {
    expect(projectDeliveryDate([
      { serviceDate: "2026-10-31", proposedDays: 0, serviceId: "evento" },
    ], new Set())).toBe("2026-10-31");
  });

  it("na volta da seleção, só o serviço com seleção de fotos recomeça a conta", () => {
    expect(projectDeliveryDate([
      { serviceDate: "2026-11-03", proposedDays: 10, serviceId: "foto" },
      { serviceDate: "2026-11-03", proposedDays: 15, serviceId: "video" },
    ], holidays, "2026-11-12", new Set(["foto"]))).toBe("2026-11-27");
    expect(projectDeliveryDate([
      { serviceDate: "2026-11-03", proposedDays: 10, serviceId: "foto" },
      { serviceDate: "2026-11-03", proposedDays: 20, serviceId: "video" },
    ], holidays, "2026-11-12", new Set(["foto"]))).toBe("2026-12-02");
  });

  it("não trata horário e local como remarcação", () => {
    const previous = [{ id: "linha", serviceDate: new Date("2026-11-03T12:00:00.000Z"), proposedDays: 10 }];
    expect(serviceScheduleChanged(previous, [{ id: "linha", serviceDate: "2026-11-03", proposedDays: 10 }])).toBe(false);
    expect(serviceScheduleChanged(previous, [{ id: "linha", serviceDate: "2026-11-04", proposedDays: 10 }])).toBe(true);
    expect(serviceScheduleChanged(previous, [{ id: "linha", serviceDate: "2026-11-03", proposedDays: 0 }])).toBe(true);
  });
});
