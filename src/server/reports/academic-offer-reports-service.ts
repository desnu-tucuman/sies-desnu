import "server-only";

import { filterAndSortAcademicOffers, summarizeAcademicOffers, type AcademicOfferQuery } from "@/domain/academic-offer";
import { getAcademicOfferDataset } from "@/server/services/academic-offer-service";
import { createExcelCsv } from "./csv-export-service";
import { createAcademicOffersPdf, logPdfStage } from "./pdf-export-service";
import { dateStamp, slugifyFilename } from "./report-utils";
import type { GeneratedReport } from "./reports-service";

const FILTERS: Array<[keyof AcademicOfferQuery, string]> = [
  ["search", "Título"], ["institution", "Institución"], ["management", "Gestión"],
  ["department", "Departamento"], ["locality", "Localidad"], ["careerType", "Tipo de carrera"],
  ["trainingType", "Tipo de formación"], ["careerStatus", "Estado de la carrera"],
];

function appliedOfferFilters(query: AcademicOfferQuery): string[] {
  return FILTERS.flatMap(([key, label]) => {
    const value = query[key];
    return typeof value === "string" && value.trim() ? [`${label}: ${value.trim()}`] : [];
  });
}

function filenameSuffix(query: AcademicOfferQuery): string {
  const values = [query.management, query.department, query.careerType, query.trainingType].filter(Boolean).slice(0, 2);
  return values.length ? `_${slugifyFilename(values.join("_"), "filtro")}` : "";
}

export async function createAcademicOffersCsvReport(query: AcademicOfferQuery): Promise<GeneratedReport> {
  const dataset = await getAcademicOfferDataset();
  const rows = filterAndSortAcademicOffers(dataset.offers, query);
  const csv = createExcelCsv(
    ["Título", "Institución", "Gestión", "Localidad", "Departamento", "Tipo de carrera", "Tipo de formación", "Matrícula", "Ingresantes", "Egresados", "Año de referencia"],
    rows.map((row) => [row.title, row.institution, row.management, row.locality, row.department, row.careerType, row.trainingType, row.enrollment, row.entrants, row.graduates, row.referenceYear]),
  );
  return { body: Buffer.from(csv, "utf8"), contentType: "text/csv; charset=utf-8", filename: `oferta_academica_sies${filenameSuffix(query)}_${dateStamp()}.csv` };
}

export async function createAcademicOffersPdfReport(query: AcademicOfferQuery): Promise<GeneratedReport> {
  logPdfStage("oferta-academica", "inicio");
  const dataset = await getAcademicOfferDataset();
  const rows = filterAndSortAcademicOffers(dataset.offers, query);
  logPdfStage("oferta-academica", "carga de datos", { records: rows.length });
  return {
    body: await createAcademicOffersPdf(rows, {
      year: dataset.referenceYear,
      filters: appliedOfferFilters(query),
      summary: summarizeAcademicOffers(rows),
    }),
    contentType: "application/pdf",
    filename: `oferta_academica_sies${filenameSuffix(query)}_${dateStamp()}.pdf`,
  };
}
