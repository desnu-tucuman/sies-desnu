import "server-only";

import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import type { AcademicOfferItem } from "@/domain/academic-offer";
import type { AuthorityDirectoryItem } from "@/domain/authorities-directory";
import type { HierarchicalOfferBlock } from "@/server/services/list-reports-service";
import type { StaticInstitutionMap } from "@/server/services/static-map-service";
import { NO_DATA, type InstitutionDirectoryItem, type InstitutionView } from "@/domain/institutions";
import { reportDate } from "./report-utils";

const BLUE = "#155FA4";
const DARK_BLUE = "#123E68";
const TURQUOISE = "#087F8C";
const LIGHT = "#F3F7F8";
const LINE = "#D5E1E5";
const MUTED = "#5C6F79";
const ORANGE = "#DC6B22";
const SOURCE = "Fuente: Sistema de Información de Educación Superior No Universitaria. Dirección de Educación Superior No Universitaria. Ministerio de Educación de Tucumán.";

function assetPath(...segments: string[]): string {
  return path.join(process.cwd(), ...segments);
}

const PDF_FONT_REGULAR = "Helvetica";
const PDF_FONT_BOLD = "Helvetica-Bold";

type PdfStage = "inicio" | "carga de datos" | "selección de fuente" | "creación del documento" | "generación del buffer" | "respuesta";

export function logPdfStage(report: string, stage: PdfStage, details: Record<string, string | number> = {}): void {
  console.info("[SIES PDF]", { report, stage, ...details });
}

function collectPdf(report: string, render: (doc: PDFKit.PDFDocument) => void, options: PDFKit.PDFDocumentOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    logPdfStage(report, "selección de fuente", { font: PDF_FONT_REGULAR });
    const doc = new PDFDocument({ ...options, font: PDF_FONT_REGULAR, bufferPages: true, info: { Title: "SIES", Author: "Dirección de Educación Superior No Universitaria" } });
    logPdfStage(report, "creación del documento");
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on("error", reject);
    doc.on("end", () => {
      const body = Buffer.concat(chunks);
      logPdfStage(report, "generación del buffer", { bytes: body.length });
      resolve(body);
    });
    doc.font(PDF_FONT_REGULAR);
    render(doc);
    addPageFooters(doc);
    doc.end();
  });
}

function brandHeader(doc: PDFKit.PDFDocument, compact = false): number {
  const margin = doc.page.margins.left;
  const logo = assetPath("public", "brand", "logo-desnu.png");
  doc.font(PDF_FONT_BOLD).fillColor(DARK_BLUE).fontSize(compact ? 12 : 15).text("SIES", margin, 24);
  doc.font(PDF_FONT_REGULAR).fillColor(MUTED).fontSize(compact ? 7 : 8.5)
    .text("Sistema de Información de Educación Superior No Universitaria", margin, compact ? 40 : 44, { width: 320 });
  if (fs.existsSync(logo)) doc.image(logo, doc.page.width - margin - (compact ? 170 : 205), 18, { fit: [compact ? 170 : 205, compact ? 44 : 54], align: "right" });
  const lineY = compact ? 68 : 78;
  doc.moveTo(margin, lineY).lineTo(doc.page.width - margin, lineY).lineWidth(1.4).strokeColor(TURQUOISE).stroke();
  return lineY + 10;
}

function addPageFooters(doc: PDFKit.PDFDocument): void {
  const range = doc.bufferedPageRange();
  for (let index = range.start; index < range.start + range.count; index += 1) {
    doc.switchToPage(index);
    const y = doc.page.height - 31;
    const originalBottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const pageNumberWidth = 90;
    const footerGap = 16;
    doc.moveTo(doc.page.margins.left, y - 7).lineTo(doc.page.width - doc.page.margins.right, y - 7).lineWidth(.5).strokeColor(LINE).stroke();
    doc.font(PDF_FONT_REGULAR).fontSize(6.4).fillColor(MUTED).text(SOURCE, doc.page.margins.left, y, { width: contentWidth - pageNumberWidth - footerGap, height: 10, lineBreak: false });
    doc.text(`Página ${index + 1} de ${range.count}`, doc.page.width - doc.page.margins.right - pageNumberWidth, y, { width: pageNumberWidth, height: 10, align: "right", lineBreak: false });
    doc.page.margins.bottom = originalBottomMargin;
  }
}

const LIST_COLUMNS = [
  { key: "name", label: "Institución o sede", width: 205 }, { key: "cue", label: "CUE", width: 67 },
  { key: "management", label: "Gestión", width: 58 }, { key: "locality", label: "Localidad", width: 100 },
  { key: "department", label: "Departamento", width: 85 }, { key: "siteType", label: "Tipo de sede", width: 88 },
  { key: "baseTrainingType", label: "Formación institucional", width: 170 },
] as const;

function listTableHeader(doc: PDFKit.PDFDocument, y: number): number {
  let x = doc.page.margins.left;
  doc.font(PDF_FONT_BOLD).fontSize(7).fillColor("#FFFFFF");
  for (const column of LIST_COLUMNS) {
    doc.rect(x, y, column.width, 23).fill(DARK_BLUE);
    doc.fillColor("#FFFFFF").text(column.label, x + 4, y + 6, { width: column.width - 8, height: 15 });
    x += column.width;
  }
  return y + 23;
}

function listPageHeader(doc: PDFKit.PDFDocument, first: boolean, metadata: { year: string; filters: string[]; count: number }): number {
  let y = brandHeader(doc, !first);
  doc.font(PDF_FONT_BOLD).fillColor(DARK_BLUE).fontSize(first ? 17 : 11).text("Listado de instituciones y sedes", doc.page.margins.left, y);
  y += first ? 27 : 20;
  if (first) {
    const filters = metadata.filters.length ? metadata.filters.join(" · ") : "Sin filtros";
    doc.font(PDF_FONT_REGULAR).fillColor(MUTED).fontSize(8)
      .text(`Fecha de generación: ${reportDate()}   |   Año de referencia: ${metadata.year || NO_DATA}   |   Registros: ${metadata.count}`, doc.page.margins.left, y)
      .text(`Filtros aplicados: ${filters}`, doc.page.margins.left, y + 13, { width: doc.page.width - doc.page.margins.left - doc.page.margins.right });
    y += 35;
  }
  return listTableHeader(doc, y);
}

export function createInstitutionsPdf(rows: InstitutionDirectoryItem[], metadata: { year: string; filters: string[] }): Promise<Buffer> {
  return collectPdf("instituciones", (doc) => {
    let y = listPageHeader(doc, true, { ...metadata, count: rows.length });
    rows.forEach((row, index) => {
      doc.font(PDF_FONT_REGULAR).fontSize(7.2);
      const values = LIST_COLUMNS.map((column) => row[column.key] || NO_DATA);
      const heights = values.map((value, columnIndex) => doc.heightOfString(value, { width: LIST_COLUMNS[columnIndex].width - 8 }));
      const height = Math.max(21, Math.max(...heights) + 9);
      if (y + height > doc.page.height - 48) {
        doc.addPage({ size: "A4", layout: "landscape", margins: { top: 18, bottom: 42, left: 34, right: 34 } });
        y = listPageHeader(doc, false, { ...metadata, count: rows.length });
      }
      let x = doc.page.margins.left;
      for (let columnIndex = 0; columnIndex < LIST_COLUMNS.length; columnIndex += 1) {
        const column = LIST_COLUMNS[columnIndex];
        doc.rect(x, y, column.width, height).fill(index % 2 ? "#FFFFFF" : LIGHT).strokeColor(LINE).lineWidth(.35).stroke();
        doc.fillColor("#18313F").text(values[columnIndex], x + 4, y + 5, { width: column.width - 8, height: height - 8, ellipsis: true });
        x += column.width;
      }
      y += height;
    });
  }, { size: "A4", layout: "landscape", margins: { top: 18, bottom: 42, left: 34, right: 34 } });
}

export function createMapInstitutionsPdf(
  rows: InstitutionDirectoryItem[],
  metadata: { filters: string[]; total: number; located: number; unlocated: number; map: StaticInstitutionMap },
): Promise<Buffer> {
  return collectPdf("mapa-institucional", (doc) => {
    const drawMap = (y: number) => {
      const { map } = metadata;
      const x = doc.page.margins.left;
      doc.save().rect(x, y, map.viewport.width, map.viewport.height).clip();
      for (const tile of map.tiles) doc.image(tile.body, x + tile.x, y + tile.y, { width: tile.width, height: tile.height });
      for (const cluster of map.clusters) {
        const markerX = x + cluster.x; const markerY = y + cluster.y;
        if (cluster.items.length > 1) {
          doc.circle(markerX, markerY, 14).fillAndStroke("#FFFFFF", TURQUOISE).lineWidth(3);
          doc.font(PDF_FONT_BOLD).fillColor(DARK_BLUE).fontSize(8).text(String(cluster.items.length), markerX - 12, markerY - 4, { width: 24, align: "center" });
        } else {
          const siteType = cluster.items[0].siteType.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
          const color = siteType.includes("EXTENSION") ? TURQUOISE : siteType.includes("ANEXO") ? ORANGE : BLUE;
          doc.circle(markerX, markerY, 7).fillAndStroke(color, "#FFFFFF").lineWidth(2);
        }
      }
      doc.restore();
      const attributionWidth = 180;
      doc.rect(x + map.viewport.width - attributionWidth, y + map.viewport.height - 15, attributionWidth, 15).fillOpacity(.88).fill("#FFFFFF").fillOpacity(1);
      doc.font(PDF_FONT_REGULAR).fillColor("#364A54").fontSize(6.3).text(map.attribution, x + map.viewport.width - attributionWidth + 5, y + map.viewport.height - 11, { width: attributionWidth - 10, align: "right" });
      doc.rect(x, y, map.viewport.width, map.viewport.height).lineWidth(.6).strokeColor(LINE).stroke();
      return y + map.viewport.height + 12;
    };
    const pageHeader = (first: boolean) => {
      let y = brandHeader(doc, !first);
      doc.font(PDF_FONT_BOLD).fillColor(DARK_BLUE).fontSize(first ? 17 : 11).text("SIES · Mapa institucional", doc.page.margins.left, y);
      y += first ? 27 : 20;
      if (first) {
        doc.font(PDF_FONT_REGULAR).fillColor(MUTED).fontSize(8)
          .text(`Fecha de generación: ${reportDate()}   |   Instituciones: ${metadata.total}   |   Ubicadas: ${metadata.located}   |   Sin coordenadas: ${metadata.unlocated}`, doc.page.margins.left, y)
          .text(`Filtros aplicados: ${metadata.filters.length ? metadata.filters.join(" · ") : "Sin filtros"}`, doc.page.margins.left, y + 13, { width: doc.page.width - 68 });
        y += 35;
        y = drawMap(y);
      }
      return listTableHeader(doc, y);
    };
    let y = pageHeader(true);
    rows.forEach((row, index) => {
      doc.font(PDF_FONT_REGULAR).fontSize(7.2);
      const values = LIST_COLUMNS.map((column) => row[column.key] || NO_DATA);
      const heights = values.map((value, columnIndex) => doc.heightOfString(value, { width: LIST_COLUMNS[columnIndex].width - 8 }));
      const height = Math.max(21, Math.max(...heights) + 9);
      if (y + height > doc.page.height - 48) {
        doc.addPage({ size: "A4", layout: "landscape", margins: { top: 18, bottom: 42, left: 34, right: 34 } });
        y = pageHeader(false);
      }
      let x = doc.page.margins.left;
      LIST_COLUMNS.forEach((column, columnIndex) => {
        doc.rect(x, y, column.width, height).fill(index % 2 ? "#FFFFFF" : LIGHT).strokeColor(LINE).lineWidth(.35).stroke();
        doc.fillColor("#18313F").text(values[columnIndex], x + 4, y + 5, { width: column.width - 8, height: height - 8, ellipsis: true });
        x += column.width;
      });
      y += height;
    });
  }, { size: "A4", layout: "landscape", margins: { top: 18, bottom: 42, left: 34, right: 34 } });
}

const OFFER_COLUMNS = [
  { key: "title", label: "Título", width: 150 }, { key: "institution", label: "Institución o sede", width: 140 },
  { key: "management", label: "Gestión", width: 50 }, { key: "locality", label: "Localidad", width: 70 },
  { key: "department", label: "Departamento", width: 70 }, { key: "careerType", label: "Tipo carrera", width: 65 },
  { key: "trainingType", label: "Formación", width: 65 }, { key: "enrollment", label: "Matrícula", width: 48 },
  { key: "entrants", label: "Ingresantes", width: 48 }, { key: "graduates", label: "Egresados", width: 48 },
] as const;

function offerTableHeader(doc: PDFKit.PDFDocument, y: number): number {
  let x = doc.page.margins.left;
  doc.font(PDF_FONT_BOLD).fontSize(6.4).fillColor("#FFFFFF");
  for (const column of OFFER_COLUMNS) {
    doc.rect(x, y, column.width, 25).fill(DARK_BLUE);
    doc.fillColor("#FFFFFF").text(column.label, x + 3, y + 6, { width: column.width - 6, height: 16 });
    x += column.width;
  }
  return y + 25;
}

function offerPageHeader(doc: PDFKit.PDFDocument, first: boolean, metadata: { year: string; filters: string[]; count: number }): number {
  let y = brandHeader(doc, !first);
  doc.font(PDF_FONT_BOLD).fillColor(DARK_BLUE).fontSize(first ? 17 : 11).text("Listado de oferta académica", doc.page.margins.left, y);
  y += first ? 27 : 20;
  if (first) {
    const filters = metadata.filters.length ? metadata.filters.join(" · ") : "Sin filtros";
    doc.font(PDF_FONT_REGULAR).fillColor(MUTED).fontSize(8)
      .text(`Fecha de generación: ${reportDate()}   |   Año de referencia: ${metadata.year}   |   Registros: ${metadata.count}`, doc.page.margins.left, y)
      .text(`Filtros aplicados: ${filters}`, doc.page.margins.left, y + 13, { width: doc.page.width - doc.page.margins.left - doc.page.margins.right });
    y += 35;
  }
  return offerTableHeader(doc, y);
}

export function createAcademicOffersPdf(rows: AcademicOfferItem[], metadata: { year: string; filters: string[] }): Promise<Buffer> {
  return collectPdf("oferta-academica", (doc) => {
    let y = offerPageHeader(doc, true, { ...metadata, count: rows.length });
    rows.forEach((row, index) => {
      doc.font(PDF_FONT_REGULAR).fontSize(6.7);
      const values = OFFER_COLUMNS.map((column) => row[column.key] || NO_DATA);
      const heights = values.map((item, columnIndex) => doc.heightOfString(item, { width: OFFER_COLUMNS[columnIndex].width - 6 }));
      const height = Math.max(21, Math.min(42, Math.max(...heights) + 8));
      if (y + height > doc.page.height - 48) {
        doc.addPage({ size: "A4", layout: "landscape", margins: { top: 18, bottom: 42, left: 34, right: 34 } });
        y = offerPageHeader(doc, false, { ...metadata, count: rows.length });
      }
      let x = doc.page.margins.left;
      OFFER_COLUMNS.forEach((column, columnIndex) => {
        doc.rect(x, y, column.width, height).fill(index % 2 ? "#FFFFFF" : LIGHT).strokeColor(LINE).lineWidth(.35).stroke();
        doc.fillColor("#18313F").text(values[columnIndex], x + 3, y + 4, { width: column.width - 6, height: height - 7, ellipsis: true });
        x += column.width;
      });
      y += height;
    });
  }, { size: "A4", layout: "landscape", margins: { top: 18, bottom: 42, left: 34, right: 34 } });
}

const AUTHORITY_COLUMNS = [
  { key: "role", label: "Cargo", width: 100 }, { key: "name", label: "Autoridad", width: 120 },
  { key: "institution", label: "Institución", width: 220 }, { key: "locality", label: "Localidad", width: 80 },
  { key: "phone", label: "Teléfono", width: 85 }, { key: "email", label: "Correo", width: 151 },
] as const;

function authorityTableHeader(doc: PDFKit.PDFDocument, y: number): number {
  let x = doc.page.margins.left;
  doc.font(PDF_FONT_BOLD).fontSize(7).fillColor("#FFFFFF");
  for (const column of AUTHORITY_COLUMNS) {
    doc.rect(x, y, column.width, 24).fill(DARK_BLUE);
    doc.fillColor("#FFFFFF").text(column.label, x + 4, y + 6, { width: column.width - 8, height: 15 });
    x += column.width;
  }
  return y + 24;
}

function authorityPageHeader(doc: PDFKit.PDFDocument, first: boolean, metadata: { filters: string[]; count: number }): number {
  let y = brandHeader(doc, !first);
  doc.font(PDF_FONT_BOLD).fillColor(DARK_BLUE).fontSize(first ? 17 : 11).text("Directorio de autoridades institucionales", doc.page.margins.left, y);
  y += first ? 27 : 20;
  if (first) {
    const filters = metadata.filters.length ? metadata.filters.join(" · ") : "Sin filtros";
    doc.font(PDF_FONT_REGULAR).fillColor(MUTED).fontSize(8)
      .text(`Fecha de generación: ${reportDate()}   |   Resultados: ${metadata.count}`, doc.page.margins.left, y)
      .text(`Filtros aplicados: ${filters}`, doc.page.margins.left, y + 13, { width: doc.page.width - doc.page.margins.left - doc.page.margins.right });
    y += 35;
  }
  return authorityTableHeader(doc, y);
}

export function createAuthoritiesDirectoryPdf(rows: AuthorityDirectoryItem[], metadata: { filters: string[] }): Promise<Buffer> {
  return collectPdf("autoridades", (doc) => {
    let y = authorityPageHeader(doc, true, { ...metadata, count: rows.length });
    rows.forEach((row, index) => {
      doc.font(PDF_FONT_REGULAR).fontSize(7);
      const values = AUTHORITY_COLUMNS.map((column) => row[column.key] || NO_DATA);
      const heights = values.map((item, columnIndex) => doc.heightOfString(item, { width: AUTHORITY_COLUMNS[columnIndex].width - 8 }));
      const height = Math.max(22, Math.min(44, Math.max(...heights) + 9));
      if (y + height > doc.page.height - 48) {
        doc.addPage({ size: "A4", layout: "landscape", margins: { top: 18, bottom: 42, left: 34, right: 34 } });
        y = authorityPageHeader(doc, false, { ...metadata, count: rows.length });
      }
      let x = doc.page.margins.left;
      AUTHORITY_COLUMNS.forEach((column, columnIndex) => {
        doc.rect(x, y, column.width, height).fill(index % 2 ? "#FFFFFF" : LIGHT).strokeColor(LINE).lineWidth(.35).stroke();
        doc.fillColor("#18313F").text(values[columnIndex], x + 4, y + 5, { width: column.width - 8, height: height - 8, ellipsis: true });
        x += column.width;
      });
      y += height;
    });
  }, { size: "A4", layout: "landscape", margins: { top: 18, bottom: 42, left: 34, right: 34 } });
}

function genericListHeader(doc: PDFKit.PDFDocument, first: boolean, metadata: { title: string; year: string; filters: string[]; count: number }, columns: Array<{ label: string; width: number }>): number {
  let y = brandHeader(doc, !first);
  doc.font(PDF_FONT_BOLD).fillColor(DARK_BLUE).fontSize(first ? 16 : 10.5).text(metadata.title, doc.page.margins.left, y);
  y += first ? 26 : 19;
  if (first) {
    const year = metadata.year ? `   |   Año de referencia: ${metadata.year}` : "";
    doc.font(PDF_FONT_REGULAR).fillColor(MUTED).fontSize(8).text(`Fecha de generación: ${reportDate()}${year}   |   Registros: ${metadata.count}`, doc.page.margins.left, y)
      .text(`Filtros aplicados: ${metadata.filters.length ? metadata.filters.join(" · ") : "Sin filtros"}`, doc.page.margins.left, y + 13, { width: doc.page.width - doc.page.margins.left - doc.page.margins.right });
    y += 35;
  }
  let x = doc.page.margins.left; doc.font(PDF_FONT_BOLD).fontSize(6.5).fillColor("#FFFFFF");
  columns.forEach((column) => { doc.rect(x, y, column.width, 25).fill(DARK_BLUE); doc.fillColor("#FFFFFF").text(column.label, x + 3, y + 6, { width: column.width - 6, height: 16 }); x += column.width; });
  return y + 25;
}

export function createGenericListPdf(columns: string[], rows: string[][], metadata: { title: string; year: string; filters: string[] }): Promise<Buffer> {
  return collectPdf("listados", (doc) => {
    const available = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const weight = (label: string) => /instituci|título|oferta|direcci/i.test(label) ? 2 : /correo|formación/i.test(label) ? 1.5 : 1;
    const weights = columns.map(weight); const totalWeight = weights.reduce((sum, item) => sum + item, 0);
    const layout = columns.map((label, index) => ({ label, width: available * weights[index] / totalWeight }));
    let y = genericListHeader(doc, true, { ...metadata, count: rows.length }, layout);
    rows.forEach((row, rowIndex) => {
      doc.font(PDF_FONT_REGULAR).fontSize(6.5);
      const values = columns.map((_, index) => row[index] || NO_DATA);
      const heights = values.map((item, index) => doc.heightOfString(item, { width: layout[index].width - 6 }));
      const height = Math.max(21, Math.min(45, Math.max(...heights) + 8));
      if (y + height > doc.page.height - 48) { doc.addPage({ size: "A3", layout: "landscape", margins: { top: 18, bottom: 42, left: 34, right: 34 } }); y = genericListHeader(doc, false, { ...metadata, count: rows.length }, layout); }
      let x = doc.page.margins.left;
      layout.forEach((column, columnIndex) => { doc.rect(x, y, column.width, height).fill(rowIndex % 2 ? "#FFFFFF" : LIGHT).strokeColor(LINE).lineWidth(.35).stroke(); doc.fillColor("#18313F").text(values[columnIndex], x + 3, y + 4, { width: column.width - 6, height: height - 7, ellipsis: true }); x += column.width; });
      y += height;
    });
  }, { size: "A3", layout: "landscape", margins: { top: 18, bottom: 42, left: 34, right: 34 } });
}

export function createHierarchicalOffersPdf(blocks: HierarchicalOfferBlock[], metadata: { title: string; year: string; filters: string[]; count: number }): Promise<Buffer> {
  return collectPdf("listados-jerarquicos", (doc) => {
    const pageHeader = (first: boolean) => {
      let y = brandHeader(doc, !first); doc.font(PDF_FONT_BOLD).fillColor(DARK_BLUE).fontSize(first ? 17 : 11).text(metadata.title, doc.page.margins.left, y); y += first ? 27 : 20;
      if (first) { doc.font(PDF_FONT_REGULAR).fillColor(MUTED).fontSize(8).text(`Fecha de generación: ${reportDate()}   |   Año de referencia: ${metadata.year}   |   Ofertas: ${metadata.count}`, doc.page.margins.left, y).text(`Filtros aplicados: ${metadata.filters.length ? metadata.filters.join(" · ") : "Sin filtros"}`, doc.page.margins.left, y + 13, { width: doc.page.width - 68 }); y += 35; }
      return y;
    };
    let y = pageHeader(true); let currentManagement = "";
    for (const block of blocks) {
      const blockHeight = 60 + block.offers.length * 12;
      const managementHeight = block.management !== currentManagement ? 31 : 0;
      if (y + managementHeight + blockHeight > doc.page.height - 50) { doc.addPage({ size: "A4", layout: "landscape", margins: { top: 18, bottom: 42, left: 34, right: 34 } }); y = pageHeader(false); currentManagement = ""; }
      if (block.management !== currentManagement) { doc.rect(doc.page.margins.left, y, doc.page.width - 68, 24).fill(DARK_BLUE); doc.font(PDF_FONT_BOLD).fillColor("#FFFFFF").fontSize(10).text(`GESTIÓN ${block.management.toUpperCase()}`, doc.page.margins.left + 8, y + 7); y += 31; currentManagement = block.management; }
      doc.rect(doc.page.margins.left, y, doc.page.width - 68, blockHeight - 8).fill(LIGHT).strokeColor(LINE).lineWidth(.5).stroke();
      doc.font(PDF_FONT_BOLD).fillColor(BLUE).fontSize(10).text(block.institution, doc.page.margins.left + 10, y + 9, { width: doc.page.width - 88 });
      doc.font(PDF_FONT_REGULAR).fillColor(MUTED).fontSize(7.5).text(`Localidad: ${block.locality || NO_DATA}   |   Departamento: ${block.department || NO_DATA}   |   Tipo de sede: ${block.siteType || NO_DATA}`, doc.page.margins.left + 10, y + 25);
      doc.font(PDF_FONT_BOLD).fillColor(TURQUOISE).fontSize(7.5).text("Oferta académica:", doc.page.margins.left + 10, y + 39); let offerY = y + 51;
      doc.font(PDF_FONT_REGULAR).fillColor("#18313F").fontSize(8); block.offers.forEach((offer) => { doc.text(`• ${offer}`, doc.page.margins.left + 18, offerY, { width: doc.page.width - 105, height: 11, ellipsis: true }); offerY += 12; });
      y += blockHeight;
    }
  }, { size: "A4", layout: "landscape", margins: { top: 18, bottom: 42, left: 34, right: 34 } });
}

function value(value?: string): string { return value?.trim() || NO_DATA; }

export function createInstitutionProfilePdf(institution: InstitutionView): Promise<Buffer> {
  return collectPdf("ficha-institucional", (doc) => {
    let y = brandHeader(doc);
    const ensure = (height: number) => {
      if (y + height <= doc.page.height - 52) return;
      doc.addPage({ size: "A4", margins: { top: 18, bottom: 42, left: 40, right: 40 } });
      y = brandHeader(doc, true);
    };
    const heading = (number: string, title: string) => {
      ensure(42); doc.rect(doc.page.margins.left, y, doc.page.width - 80, 34).fill(DARK_BLUE);
      doc.font(PDF_FONT_BOLD).fontSize(14).fillColor("#9ED9DC").text(number, 48, y + 9, { width: 30 });
      doc.fillColor("#FFFFFF").fontSize(12).text(title, 82, y + 10); y += 43;
    };
    const fieldRows = (fields: Array<[string, string | undefined]>) => {
      for (let index = 0; index < fields.length; index += 2) {
        ensure(36); const pair = fields.slice(index, index + 2); const width = (doc.page.width - 80) / 2;
        pair.forEach(([label, raw], pairIndex) => {
          const x = doc.page.margins.left + pairIndex * width;
          doc.rect(x, y, width, 34).fill(index % 4 ? "#FFFFFF" : LIGHT).strokeColor(LINE).lineWidth(.4).stroke();
          doc.font(PDF_FONT_BOLD).fontSize(6.7).fillColor(MUTED).text(label.toUpperCase(), x + 7, y + 5, { width: width - 14 });
          doc.font(PDF_FONT_REGULAR).fontSize(8.5).fillColor("#18313F").text(value(raw), x + 7, y + 16, { width: width - 14, ellipsis: true });
        }); y += 34;
      }
      y += 10;
    };

    doc.font(PDF_FONT_BOLD).fontSize(17).fillColor(DARK_BLUE).text("Ficha institucional", doc.page.margins.left, y);
    y += 25; doc.font(PDF_FONT_BOLD).fontSize(15).fillColor(BLUE).text(institution.name, doc.page.margins.left, y, { width: doc.page.width - 80 });
    y += doc.heightOfString(institution.name, { width: doc.page.width - 80 }) + 14;
    heading("01", "Identidad institucional");
    fieldRows([
      ["Nombre", institution.name], ["CUE", institution.cue], ["CUI", institution.cui], ["Gestión", institution.management],
      ["Tipo de sede", institution.siteType], ["Tipo de formación institucional", institution.baseTrainingType],
      ["Dirección", institution.address], ["Localidad", institution.locality], ["Departamento", institution.department],
      ["Teléfono", institution.phone], ["Correo electrónico", institution.email], ["Horario", institution.schedule],
      ["Edificio compartido", institution.sharedBuilding],
    ]);

    heading("02", "Autoridades");
    if (!institution.authorities.length) {
      doc.font(PDF_FONT_REGULAR).fontSize(9).fillColor(MUTED).text(NO_DATA, 48, y); y += 26;
    } else institution.authorities.forEach((authority, index) => {
      ensure(62); doc.rect(40, y, doc.page.width - 80, 54).fill(index % 2 ? "#FFFFFF" : LIGHT).strokeColor(LINE).stroke();
      doc.rect(40, y, 4, 54).fill(ORANGE);
      doc.font(PDF_FONT_BOLD).fontSize(9.5).fillColor(DARK_BLUE).text(value(authority.name), 52, y + 8, { width: 260 });
      doc.font(PDF_FONT_BOLD).fontSize(7.5).fillColor(TURQUOISE).text(value(authority.role), 52, y + 24, { width: 260 });
      doc.font(PDF_FONT_REGULAR).fontSize(7.5).fillColor(MUTED).text(`Teléfono: ${value(authority.phone)}\nCorreo: ${value(authority.email)}`, 325, y + 9, { width: 220 });
      y += 61;
    });
    y += 6;

    heading("03", "Oferta formativa");
    fieldRows([
      ["Cantidad de carreras", institution.offer?.totalCareers], ["Matrícula", institution.offer?.enrollment],
      ["Ingresantes", institution.offer?.entrants], ["Egresados", institution.offer?.graduates],
      ["Año de referencia", institution.offer?.referenceYear],
    ]);
    const lists: Array<[string, string[] | undefined]> = [
      ["Profesorados", institution.offer?.teachingDegrees], ["Tecnicaturas", institution.offer?.technicalDegrees],
      ["Otras formaciones superiores", institution.offer?.otherDegrees],
    ];
    for (const [title, items] of lists) {
      ensure(32); doc.font(PDF_FONT_BOLD).fontSize(10).fillColor(DARK_BLUE).text(title, 40, y); y += 17;
      if (!items?.length) { doc.font(PDF_FONT_REGULAR).fontSize(8.5).fillColor(MUTED).text(NO_DATA, 48, y); y += 20; continue; }
      for (const item of items) {
        const height = Math.max(18, doc.heightOfString(item, { width: 485 }) + 7); ensure(height);
        doc.circle(48, y + 5, 2).fill(TURQUOISE); doc.font(PDF_FONT_REGULAR).fontSize(8.5).fillColor("#18313F").text(item, 58, y, { width: 485 }); y += height;
      }
      y += 4;
    }
  }, { size: "A4", margins: { top: 18, bottom: 42, left: 40, right: 40 } });
}
