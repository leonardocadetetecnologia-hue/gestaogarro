import { join } from "node:path";
import PDFDocument from "pdfkit";
import { demandStatementNote, formatDeliveredAt, type StatementSection } from "./delivery-statement";

type DeliveryPdf = {
  project: string;
  customer: string;
  period: string;
  issuedAt: string;
  sections: StatementSection[];
  total: number;
};

const margin = 40;
const ink = "#322821";
const muted = "#87786e";
const brown = "#5c4b40";
const line = "#eaded2";

export async function renderDeliveryPdf(report: DeliveryPdf) {
  const doc = new PDFDocument({ size: "A4", margin, bufferPages: true, info: { Title: report.project, Author: "Garro Produtora" } });
  const bytes = new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.once("end", () => resolve(Buffer.concat(chunks)));
    doc.once("error", reject);
  });
  const fonts = join(process.cwd(), "public", "fonts");
  doc.registerFont("Plex", join(fonts, "ibm-plex-sans-latin-400-normal.woff"));
  doc.registerFont("PlexSemibold", join(fonts, "ibm-plex-sans-latin-600-normal.woff"));

  const width = doc.page.width - 2 * margin;
  const bottom = doc.page.height - 83;
  const publicImages = join(process.cwd(), "public", "images");
  const style = (size: number, color = ink, bold = false) => doc.font(bold ? "PlexSemibold" : "Plex").fontSize(size).fillColor(color);
  const rule = (y: number, color = line, weight = 0.75) => doc.lineWidth(weight).strokeColor(color).moveTo(margin, y).lineTo(margin + width, y).stroke();
  const background = () => doc.rect(margin, margin, width, bottom - margin).fill("#fffdfa");
  doc.on("pageAdded", background);
  background();

  doc.image(join(publicImages, "garro-symbol-official.png"), margin, margin, { width: 51 });
  doc.image(join(publicImages, "garro-wordmark.png"), margin + 60, margin + 1, { width: 137 });
  const titleWidth = width - 210;
  style(8.5, "#ac6b4d", true).text("RELATÓRIO DE ENTREGA", margin + 210, margin + 3, { width: titleWidth, characterSpacing: 1.1 });
  style(21).text(report.project, margin + 210, margin + 20, { width: titleWidth });
  const headerEnd = Math.max(107, doc.y + 14);
  rule(headerEnd, "#a55e44", 2.25);

  let y = headerEnd + 16;
  const columnWidth = (width - 20) / 2;
  const fields = [
    ["Projeto", report.project], ["Cliente", report.customer],
    ["Período", report.period], ["Emitido em", report.issuedAt],
  ];
  for (let index = 0; index < fields.length; index += 2) {
    let end = y;
    for (let column = 0; column < 2; column++) {
      const [label, value] = fields[index + column];
      const x = margin + column * (columnWidth + 20);
      style(8.25, muted).text(label, x, y, { width: columnWidth });
      style(10.5, ink, true).text(value, x, y + 16, { width: columnWidth });
      end = Math.max(end, doc.y);
    }
    y = end + 12;
  }
  style(9.75, "#6d5143").text(demandStatementNote, margin, y + 3, { width });
  y = doc.y + 23;

  for (const section of report.sections) {
    if (y + 57 > bottom) { doc.addPage(); y = margin + 10; }
    style(13.5, ink, true).text(section.label, margin, y, { width });
    rule(doc.y + 4);
    y = doc.y + 26;
    for (const item of section.activities) {
      const titleWidth = width - 162;
      const titleHeight = style(11.25, ink, true).heightOfString(item.title, { width: titleWidth });
      const serviceHeight = style(9.75, brown).heightOfString(item.service, { width: titleWidth });
      const descriptionHeight = doc.heightOfString(item.description, { width, lineGap: 2 });
      if (y + titleHeight + serviceHeight + descriptionHeight + 8 > bottom && y > margin + 10) {
        doc.addPage();
        y = margin + 10;
      }
      style(9.5, muted).text(formatDeliveredAt(item.deliveredAt), margin + titleWidth, y, { width: width - titleWidth, align: "right" });
      style(11.25, ink, true).text(item.title, margin, y, { width: titleWidth });
      style(9.75, brown).text(item.service, margin, doc.y + 3, { width: titleWidth });
      doc.text(item.description, margin, doc.y + 5, { width, lineGap: 2 });
      y = doc.y + 23;
    }
  }
  if (y + 24 > bottom) { doc.addPage(); y = margin + 10; }
  rule(y + 7);
  style(8.25, muted).text(`Garro Produtora · extrato de produção concluída · ${report.total} ${report.total === 1 ? "atividade" : "atividades"}`, margin, y + 17, { width });

  const pages = doc.bufferedPageRange();
  for (let index = 0; index < pages.count; index++) {
    doc.switchToPage(pages.start + index);
    style(7.5, muted).text(`Página ${index + 1} de ${pages.count}`, margin, doc.page.height - 56, { width, align: "right" });
  }
  doc.end();
  return bytes;
}
