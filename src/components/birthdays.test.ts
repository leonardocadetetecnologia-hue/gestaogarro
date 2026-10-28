import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { State } from "@/lib/data";

const { context } = vi.hoisted(() => ({
  context: { state: { customers: [], opportunities: [], demands: [], deliverables: [], editors: [], schedule: [], alerts: [] } as State },
}));
vi.mock("@/lib/store", () => ({ useGarro: () => context }));
import { UpcomingBirthdays } from "./birthdays";

describe("aniversariantes na visão geral", () => {
  it("lista o cliente ativo cujo aniversário está perto e omite o lead", () => {
    const [year, monthNumber, dayNumber] = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()).split("-").map(Number);
    const soon = new Date(Date.UTC(year, monthNumber - 1, dayNumber + 3));
    const month = String(soon.getUTCMonth() + 1).padStart(2, "0");
    const day = String(soon.getUTCDate()).padStart(2, "0");
    context.state.customers = [
      { id: "ana", kind: "CLIENTE", name: "Ana Costa", phone: "", email: "", company: "", origin: "Site", notes: "", city: "", service: "", birthDate: `1991-${month}-${day}` },
      { id: "leo", kind: "LEAD", name: "Leo Lead", phone: "", email: "", company: "", origin: "Site", notes: "", city: "", service: "", birthDate: `1991-${month}-${day}` },
    ];
    const html = renderToStaticMarkup(createElement(UpcomingBirthdays));
    expect(html).toContain("Ana Costa");
    expect(html).toContain("Em 3 dias");
    expect(html).not.toContain("Leo Lead");
  });
});
