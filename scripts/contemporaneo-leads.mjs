import { createHash } from "node:crypto";
import { inflateRawSync } from "node:zlib";

const ORIGIN = "Edifício Contemporâneo";

function decodeXml(value) {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'");
}

export function normalizeName(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toLowerCase();
}

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export function readZip(buffer) {
  const files = new Map();
  let offset = 0;
  while (offset + 30 <= buffer.length) {
    if (buffer.readUInt32LE(offset) !== 0x04034b50) break;
    const method = buffer.readUInt16LE(offset + 8);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const nameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const name = buffer.slice(nameStart, nameStart + nameLength).toString("utf8");
    const dataStart = nameStart + nameLength + extraLength;
    const dataEnd = dataStart + compressedSize;
    if (!compressedSize || dataEnd > buffer.length) throw new Error("A planilha não pôde ser lida.");
    const compressed = buffer.subarray(dataStart, dataEnd);
    files.set(name, method === 0 ? Buffer.from(compressed) : inflateRawSync(compressed));
    offset = dataEnd;
  }
  return files;
}

export function rowsFromSheetXml(xml) {
  const rows = [];
  const rowPattern = /<row r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g;
  let row;
  while ((row = rowPattern.exec(xml))) {
    const number = Number(row[1]);
    if (number < 4) continue;
    const cells = {};
    const cellPattern = /<c r="([A-I])\d+"[^>]*>([\s\S]*?)<\/c>/g;
    let cell;
    while ((cell = cellPattern.exec(row[2]))) {
      const text = cell[2].match(/<t[^>]*>([\s\S]*?)<\/t>/);
      cells[cell[1]] = decodeXml(text ? text[1] : "");
    }
    rows.push({
      row: number,
      sala: cells.A || "",
      name: cells.B || "",
      segment: cells.C || "",
      validation: cells.D || "",
      phone: cells.E || "",
      instagram: cells.F || "",
      email: cells.G || "",
      status: cells.H || "",
      notes: cells.I || "",
    });
  }
  return rows;
}

function sheetXml(files) {
  const workbook = files.get("xl/workbook.xml")?.toString("utf8") || "";
  const rels = files.get("xl/_rels/workbook.xml.rels")?.toString("utf8") || "";
  const sheet = [...workbook.matchAll(/<sheet\b[^>]*>/g)].map((item) => item[0]).find((item) => item.includes("name=\"Todas as salas\""));
  const id = sheet?.match(/\br:id="([^"]+)"/)?.[1] || "";
  const relationship = [...rels.matchAll(/<Relationship\b[^>]*>/g)].map((item) => item[0]).find((item) => item.includes(`Id="${id}"`));
  const target = relationship?.match(/\bTarget="([^"]+)"/)?.[1]?.replace(/^\//, "") || "";
  const xml = target ? files.get(target)?.toString("utf8") : "";
  if (!xml) throw new Error("A aba Todas as salas não foi encontrada.");
  return xml;
}

export function rowsFromWorkbook(buffer) {
  return rowsFromSheetXml(sheetXml(readZip(buffer)));
}

function phoneOf(value) {
  const text = clean(value);
  const digits = text.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 13) return null;
  return text.slice(0, 40);
}

function emailOf(value) {
  const text = clean(value).slice(0, 200);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text) ? text : null;
}

export function prepareContemporaneoLead(row) {
  const name = clean(row.name).slice(0, 200);
  if (!name) return { include: false, reason: "sala sem empresa" };
  if (normalizeName(name).includes("garro produtora")) return { include: false, reason: "sala da propria Garro" };
  const sala = clean(row.sala).slice(0, 40);
  const segment = clean(row.segment);
  const notes = [
    `Edifício Contemporâneo, sala ${sala || "não informada"}.`,
    segment ? `Segmento: ${segment}` : "",
    clean(row.validation) ? `Validação: ${clean(row.validation)}` : "",
    clean(row.instagram) ? `Instagram: ${clean(row.instagram)}` : "",
    clean(row.status) ? `Status do contato: ${clean(row.status)}` : "",
    clean(row.notes),
  ].filter(Boolean).join("\n").slice(0, 10000);
  return {
    include: true,
    name,
    phone: phoneOf(row.phone),
    email: emailOf(row.email),
    service: (segment || "Serviço a definir").slice(0, 200),
    origin: ORIGIN,
    notes,
    sala,
    sourceKey: createHash("sha256").update(`Leads_Contemporaneo_Garro|${row.row}|${sala}|${normalizeName(name)}`).digest("hex").slice(0, 28),
  };
}

export function prepareContemporaneoWorkbook(buffer) {
  return rowsFromWorkbook(buffer).map((row) => ({ row: row.row, ...prepareContemporaneoLead(row) }));
}
