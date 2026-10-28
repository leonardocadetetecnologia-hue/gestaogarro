import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { State } from "@/lib/data";

const state: State = {
  customers: [{ id: "ana", kind: "CLIENTE", name: "Ana Costa", phone: "", email: "", company: "", origin: "", notes: "", city: "", service: "" }],
  opportunities: [], demands: [], deliverables: [], editors: [], schedule: [], alerts: [],
};

vi.mock("@/lib/store", () => ({ useGarro: () => ({ state, createDemand: vi.fn(), busy: false, error: "" }) }));
import { NewDemandModal } from "./new-demand";

describe("nova demanda", () => {
  it("pede o tipo com vídeo, foto e foto e vídeo, sem escolha inicial", () => {
    const html = renderToStaticMarkup(createElement(NewDemandModal, { onClose: vi.fn() }));
    const field = html.slice(html.indexOf("Tipo *"), html.indexOf("Briefing *"));
    expect(field).toContain("Tipo *");
    expect(field).toContain("required");
    expect(field).toContain(">Selecione o tipo</option>");
    expect(field.indexOf(">Vídeo</option>")).toBeGreaterThan(-1);
    expect(field.indexOf(">Vídeo</option>")).toBeLessThan(field.indexOf(">Foto</option>"));
    expect(field.indexOf(">Foto</option>")).toBeLessThan(field.indexOf(">Foto e vídeo</option>"));
    expect(field).toContain('<option value="" selected="">Selecione o tipo</option>');
    expect(field).toContain('<option value="VIDEO">Vídeo</option>');
    expect(field).toContain('<option value="FOTO">Foto</option>');
    expect(field).toContain('<option value="FOTO_E_VIDEO">Foto e vídeo</option>');
  });
});
