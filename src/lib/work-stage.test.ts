import { describe, expect, it } from "vitest";
import { matchesWorkStage } from "./work-stage";

const now = new Date("2026-10-27T12:00:00.000Z").getTime();

describe("filtro de etapa dos trabalhos", () => {
  it("separa aprovado, concluído, atraso e edição", () => {
    const approved = { status: "Aprovado", editorDue: "2026-10-20T12:00:00.000Z" };
    const editing = { status: "Em edição", editorDue: "2026-10-20T12:00:00.000Z" };
    const waiting = { status: "A iniciar", editorDue: "2026-11-02T12:00:00.000Z" };
    expect(matchesWorkStage(approved, "Aprovado", now)).toBe(true);
    expect(matchesWorkStage(approved, "Concluído", now)).toBe(true);
    expect(matchesWorkStage(approved, "Atrasado", now)).toBe(false);
    expect(matchesWorkStage(editing, "Atrasado", now)).toBe(true);
    expect(matchesWorkStage(editing, "Em edição", now)).toBe(true);
    expect(matchesWorkStage(editing, "Aprovado", now)).toBe(false);
    expect(matchesWorkStage(waiting, "A iniciar", now)).toBe(true);
    expect(matchesWorkStage(waiting, "Atrasado", now)).toBe(false);
    expect(matchesWorkStage(editing, "Todas", now)).toBe(true);
  });
});
