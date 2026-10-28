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
    expect(field).toContain('type="radio"');
    expect(field).not.toContain("<select");
    expect(field).not.toContain("Selecione o tipo");
    expect(field.indexOf('value="FOTO"')).toBeLessThan(field.indexOf('value="VIDEO"'));
    expect(field.indexOf('value="VIDEO"')).toBeLessThan(field.indexOf('value="FOTO_E_VIDEO"'));
    expect(field).toContain(">Foto</label>");
    expect(field).toContain(">Vídeo</label>");
    expect(field).toContain(">Foto e vídeo</label>");
  });
});
