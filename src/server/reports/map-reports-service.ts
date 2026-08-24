import "server-only";

import { careersForGeographicOffer, sortGeographicOffersTerritorially, type MapQuery } from "../../domain/geographic-offers";
import { getGeographicInstitutions } from "@/server/services/geographic-institutions-service";
import { getGeographicOffers } from "@/server/services/geographic-offers-service";
import { createStaticInstitutionMap } from "@/server/services/static-map-service";
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

async function mapDataset(query: MapQuery) {
  return query.view === "offer"
    ? getGeographicOffers(query)
    : getGeographicInstitutions(query);
}

function mapFilters(query: MapQuery): string[] {
  const filters = appliedFilters(query);
  if (query.offerType) filters.push(`Tipo de oferta: ${query.offerType}`);
  filters.unshift(`Vista: ${query.view === "offer" ? "Oferta 2026" : "Instituciones"}`);
  return filters;
}

export async function createMapCsvReport(query: MapQuery): Promise<GeneratedReport> {
  const dataset = await mapDataset(query);
  if (!dataset.total) throw new EmptyMapExportError();
  if (query.view === "offer") {
    const all = [...dataset.located, ...dataset.unlocated];
    const matchingSearch = Boolean(query.search?.trim());
    const csv = createExcelCsv(
      ["CUE_ANEXO", "CUI", "Unidad de dictado", "Institución responsable", "Gestión", "Tipo de sede", "Localidad", "Departamento", "Tipo de oferta", matchingSearch ? "Oferta coincidente" : "Carreras vigentes", "Matrícula 2026", "Ingresantes 2026", "Egresados 2026", "Latitud", "Longitud"],
      all.map((row) => [row.cue, row.cui, row.name, row.responsibleInstitution, row.management, row.siteType, row.locality, row.department, row.offerType, careersForGeographicOffer({ careers: row.careers ?? [], matchedCareers: row.matchedCareers ?? [] }, query.search).join(" | "), row.enrollment, row.entrants, row.graduates, "latitude" in row ? row.latitude : row.rawLatitude, "longitude" in row ? row.longitude : row.rawLongitude]),
    );
    return { body: Buffer.from(csv, "utf8"), contentType: "text/csv; charset=utf-8", filename: `sies_mapa_oferta_2026_${dateStamp()}.csv` };
  }
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

export async function createMapPdfReport(query: MapQuery): Promise<GeneratedReport> {
  logPdfStage("mapa-institucional", "inicio");
  const dataset = await mapDataset(query);
  if (!dataset.total) throw new EmptyMapExportError();
  const map = await createStaticInstitutionMap(dataset.located, { cluster: dataset.total > 25 });
  const sourceRows = query.view === "offer"
    ? sortGeographicOffersTerritorially([...dataset.located, ...dataset.unlocated])
    : [...dataset.located, ...dataset.unlocated];
  const rows = sourceRows.map((row) => {
    if (query.view !== "offer") return row;
    const careers = careersForGeographicOffer({ careers: row.careers ?? [], matchedCareers: row.matchedCareers ?? [] }, query.search);
    return { ...row, baseTrainingType: `${row.offerType ?? ""}${careers.length ? ` · ${careers.join(" | ")}` : ""}` };
  });
  logPdfStage("mapa-institucional", "carga de datos", { records: rows.length });
  return {
    body: await createMapInstitutionsPdf(rows, {
      filters: mapFilters(query), total: dataset.total,
      located: dataset.located.length, unlocated: dataset.unlocated.length, map,
      mode: query.view,
      offerColumnLabel: query.search?.trim() ? "Oferta coincidente" : "Tipo de oferta / carreras",
    }),
    contentType: "application/pdf", filename: `sies_mapa_${query.view === "offer" ? "oferta_2026" : "institucional"}_${dateStamp()}.pdf`,
  };
}
