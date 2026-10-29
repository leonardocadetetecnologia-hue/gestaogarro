import { describe, expect, it } from "vitest";
import { monitorSummary, toMonitorEvents } from "./attendant-monitor";

const at = new Date("2026-10-29T15:00:00.000Z");

describe("monitoramento das atendentes", () => {
  it("separa entrada, saída, movimento, inclusão e alteração, e ignora registro sem pessoa", () => {
    const events = toMonitorEvents([
      { id: "1", userId: "ana", action: "LOGIN", details: null, createdAt: at, attendantName: "Ana" },
      { id: "2", userId: "ana", action: "LOGOUT", details: null, createdAt: new Date("2026-10-29T18:00:00.000Z"), attendantName: "Ana" },
      { id: "3", userId: "ana", action: "OPPORTUNITY_MOVED", details: { from: "LEAD", stage: "FOLLOW_UP" }, createdAt: at, attendantName: "Ana", contact: "Nefrostar" },
      { id: "4", userId: "ana", action: "CUSTOMER_CREATED", details: null, createdAt: at, attendantName: "Ana", contact: "Nefrostar" },
      { id: "5", userId: "ana", action: "CUSTOMER_UPDATED", details: null, createdAt: at, attendantName: "Ana", contact: "Nefrostar" },
      { id: "6", userId: null, action: "LOGIN", details: null, createdAt: at, attendantName: "Ana" },
    ]);
    expect(events.map((item) => item.kind)).toEqual(["acesso", "acesso", "movimentacao", "inclusao", "alteracao"]);
    expect(events[2].detail).toBe("Nefrostar · De Lead para Tentativa de contato");
    expect(events[0].title).toBe("Entrou");
    expect(events[1].title).toBe("Saiu");
  });

  it("resume por atendente a última entrada e a última saída", () => {
    const events = toMonitorEvents([
      { id: "out", userId: "ana", action: "LOGOUT", details: null, createdAt: new Date("2026-10-29T21:00:00.000Z"), attendantName: "Ana" },
      { id: "in2", userId: "ana", action: "LOGIN", details: null, createdAt: new Date("2026-10-29T18:00:00.000Z"), attendantName: "Ana" },
      { id: "in1", userId: "ana", action: "LOGIN", details: null, createdAt: new Date("2026-10-29T12:00:00.000Z"), attendantName: "Ana" },
      { id: "move", userId: "malu", action: "OPPORTUNITY_MOVED", details: { stage: "LEAD" }, createdAt: at, attendantName: "Malu", contact: "Carlsons" },
    ]);
    const summary = monitorSummary(events);
    expect(summary.find((item) => item.id === "ana")).toMatchObject({ logins: 2, logouts: 1, lastLogin: "2026-10-29T18:00:00.000Z", lastLogout: "2026-10-29T21:00:00.000Z" });
    expect(summary.find((item) => item.id === "malu")).toMatchObject({ moves: 1, logins: 0 });
  });
});
