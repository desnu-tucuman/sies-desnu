import "server-only";

import type { ListReportQuery } from "@/domain/list-reports";
import { getListReport } from "@/server/services/list-reports-service";
import { createExcelCsv } from "./csv-export-service";
import { createGenericListPdf, createHierarchicalOffersPdf } from "./pdf-export-service";
import { dateStamp, slugifyFilename } from "./report-utils";
import type { GeneratedReport } from "./reports-service";

export async function createListCsvReport(query: ListReportQuery): Promise<GeneratedReport> {
  const report = await getListReport(query); const csv = createExcelCsv(report.columns, report.rows);
  return { body: Buffer.from(csv, "utf8"), contentType: "text/csv; charset=utf-8", filename: `listado_${slugifyFilename(report.title, "sies")}_${dateStamp()}.csv` };
}
export async function createListPdfReport(query: ListReportQuery): Promise<GeneratedReport> {
  const report = await getListReport(query);
  const body = report.hierarchicalOffers
    ? await createHierarchicalOffersPdf(report.hierarchicalOffers, { title: report.title, year: report.year, filters: report.filtersApplied, count: report.rows.length })
    : await createGenericListPdf(report.columns, report.rows, { title: report.title, year: report.year, filters: report.filtersApplied });
  return { body, contentType: "application/pdf", filename: `listado_${slugifyFilename(report.title, "sies")}_${dateStamp()}.pdf` };
}
