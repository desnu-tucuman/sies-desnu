import "server-only";

import type { InstitutionQuery } from "@/domain/institutions";
import { getGeographicInstitutions } from "@/server/services/geographic-institutions-service";
import { createExcelCsv } from "./csv-export-service";
import { createMapInstitutionsPdf, logPdfStage } from "./pdf-export-service";
import type { GeneratedReport } from "./reports-service";
import { appliedFilters, dateStamp } from "./report-utils";

export class EmptyMapExportError extends Error {
  constructor() {
    super("No hay registros para exportar con los filtros seleccionados.");
    this.name = "EmptyMapExportError";
  }
}

export async function createMapCsvReport(query: InstitutionQuery): Promise<GeneratedReport> {
  const dataset = await getGeographicInstitutions(query);
  if (!dataset.total) throw new EmptyMapExportError();
  const rows = [
    ...dataset.located.map((row) => [row.cue, row.name, row.management, row.siteType, row.locality, row.department, row.baseTrainingType, row.address, row.latitude, row.longitude]),
    ...dataset.unlocated.map((row) => [row.cue, row.name, row.management, row.siteType, row.locality, row.department, row.baseTrainingType, row.address, row.rawLatitude, row.rawLongitude]),
  ];
  const csv = createExcelCsv(
    ["CUE_ANEXO", "Institución", "Gestión", "Tipo de sede", "Localidad", "Departamento", "Tipo de formación institucional", "Dirección", "Latitud", "Longitud"],
    rows,
  );
  return {
    body: Buffer.from(csv, "utf8"), contentType: "text/csv; charset=utf-8",
    filename: `sies_mapa_institucional_${dateStamp()}.csv`,
  };
}

export async function createMapPdfReport(query: InstitutionQuery): Promise<GeneratedReport> {
  logPdfStage("mapa-institucional", "inicio");
  const dataset = await getGeographicInstitutions(query);
  if (!dataset.total) throw new EmptyMapExportError();
  const rows = [...dataset.located, ...dataset.unlocated];
  logPdfStage("mapa-institucional", "carga de datos", { records: rows.length });
  return {
    body: await createMapInstitutionsPdf(rows, {
      filters: appliedFilters(query), total: dataset.total,
      located: dataset.located.length, unlocated: dataset.unlocated.length,
    }),
    contentType: "application/pdf", filename: `sies_mapa_institucional_${dateStamp()}.pdf`,
  };
}
