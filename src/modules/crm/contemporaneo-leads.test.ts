import { describe, expect, it } from "vitest";
import { prepareContemporaneoLead, rowsFromSheetXml } from "../../../scripts/contemporaneo-leads.mjs";

const xml = `<?xml version="1.0"?>
<worksheet><sheetData>
<row r="3"><c r="A3" t="inlineStr"><is><t>Sala</t></is></c></row>
<row r="4"><c r="A4" t="inlineStr"><is><t>201</t></is></c><c r="B4" t="inlineStr"><is><t>NEFROSTAR</t></is></c><c r="C4" t="inlineStr"><is><t>Sa&#250;de</t></is></c><c r="E4" t="inlineStr"><is><t>(31) 3657-8901</t></is></c></row>
<row r="5"><c r="A5" t="inlineStr"><is><t>311</t></is></c><c r="B5" t="inlineStr"></c></row>
<row r="6"><c r="A6" t="inlineStr"><is><t>1006</t></is></c><c r="B6" t="inlineStr"><is><t>GARRO PRODUTORA / GABI</t></is></c></row>
<row r="7"><c r="A7" t="inlineStr"><is><t>706</t></is></c><c r="B7" t="inlineStr"><is><t>SCHAK</t></is></c><c r="E7" t="inlineStr"><is><t>0800 030 6530</t></is></c></row>
</sheetData></worksheet>`;

describe("leads do Contemporâneo", () => {
  it("lê a aba e fica só com empresas, na conta da Ana, sem a sala da Garro", () => {
    const rows = rowsFromSheetXml(xml);
    const prepared = rows.map((row) => prepareContemporaneoLead(row));
    expect(prepared.filter((row) => row.include).map((row) => row.name)).toEqual(["NEFROSTAR", "SCHAK"]);
    expect(prepared.find((row) => row.include && row.name === "NEFROSTAR")).toMatchObject({
      origin: "Edifício Contemporâneo",
      service: "Saúde",
      phone: "(31) 3657-8901",
    });
    expect(prepared.find((row) => !row.include && row.reason === "sala sem empresa")).toBeTruthy();
    expect(prepared.find((row) => !row.include && row.reason === "sala da propria Garro")).toBeTruthy();
  });
});
