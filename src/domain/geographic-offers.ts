import type { SheetRow } from "@/server/sheets/types";
import { compareText, createInstitutionId, normalizeForMatch, safeText, splitOfferList, type InstitutionDirectoryItem, type QueryParameterSource } from "./institutions";

export type MapView = "institutions" | "offer";

export interface GeographicOfferQuery {
  search?: string;
  management?: string;
  department?: string;
  locality?: string;
  siteType?: string;
  offerType?: string;
  institutionId?: string[];
}

export interface GeographicOfferItem extends InstitutionDirectoryItem {
  mapMode: "offer";
  responsibleInstitution: string;
  offerType: string;
  careers: string[];
  matchedCareers: string[];
  enrollment: string;
  entrants: string;
  graduates: string;
  referenceYear: string;
  rawLatitude: string;
  rawLongitude: string;
}

export interface MapQuery {
  view?: MapView;
  search?: string;
  management?: string;
  department?: string;
  locality?: string;
  siteType?: string;
  trainingType?: string[];
  institutionId?: string[];
  offerType?: string;
}

export function mapQueryFromParams(params: QueryParameterSource): MapQuery {
  const view = params.get("vista") === "oferta" ? "offer" : "institutions";
  const getAll = (name: string) => params.getAll?.(name) ?? [params.get(name) ?? ""];
  return {
    view,
    search: safeText(params.get("search")),
    management: safeText(params.get("management")),
    department: safeText(params.get("department")),
    locality: safeText(params.get("locality")),
    siteType: safeText(params.get("siteType")),
    trainingType: getAll("trainingType").map(safeText).filter(Boolean),
    institutionId: getAll("institutionId").map(safeText).filter(Boolean),
    offerType: safeText(params.get("offerType")),
  };
}

export function offerTypeCategory(value: unknown): string {
  const normalized = normalizeForMatch(value);
  if (normalized.includes("MIXT") || (normalized.includes("DOCENT") && normalized.includes("TECNIC"))) return "Mixta";
  if (normalized.includes("DOCENT")) return "Docente";
  if (normalized.includes("TECNIC")) return "Técnica";
  return "Otras";
}

function careersFromRow(row: SheetRow): string[] {
  const unique = new Map<string, string>();
  for (const value of [row.carreras, row.profesorados, row.tecnicaturas, row.otras_formaciones]) {
    for (const career of splitOfferList(safeText(value))) {
      const key = normalizeForMatch(career);
      if (key && !unique.has(key)) unique.set(key, career);
    }
  }
  return [...unique.values()];
}

function offerId(row: SheetRow): string {
  return Buffer.from(JSON.stringify([
    safeText(row.cue_anexo), normalizeForMatch(row.nombre_sede_oferta || row.nombre_establecimiento),
    normalizeForMatch(row.localidad_oferta), normalizeForMatch(row.tipo_espacio_oferta),
  ]), "utf8").toString("base64url");
}

export function createGeographicOfferRows(rows: SheetRow[], search = ""): GeographicOfferItem[] {
  const normalizedSearch = normalizeForMatch(search);
  const units = new Map<string, GeographicOfferItem>();
  for (const row of rows) {
    if (!safeText(row.nombre_sede_oferta || row.nombre_establecimiento) || !safeText(row.cue_anexo)) continue;
    const careers = careersFromRow(row);
    const item: GeographicOfferItem = {
      id: offerId(row), mapMode: "offer", cue: safeText(row.cue_anexo), cui: safeText(row.cui),
      name: safeText(row.nombre_sede_oferta || row.nombre_establecimiento), responsibleInstitution: safeText(row.nombre_establecimiento),
      management: safeText(row.gestion), baseTrainingType: "", siteType: safeText(row.tipo_espacio_oferta), address: "",
      locality: safeText(row.localidad_oferta), department: safeText(row.departamento_oferta), phone: "", email: "", schedule: "", sharedBuilding: "",
      offerType: offerTypeCategory(row.tipo_oferta_resumen), careers,
      matchedCareers: normalizedSearch ? careers.filter((career) => normalizeForMatch(career).includes(normalizedSearch)) : [],
      enrollment: safeText(row.matricula_total), entrants: safeText(row.ingresantes), graduates: safeText(row.egresados),
      referenceYear: safeText(row.anio_referencia) || "2026", rawLatitude: safeText(row.latitud_oferta), rawLongitude: safeText(row.longitud_oferta),
    };
    if (!units.has(item.id)) units.set(item.id, item);
  }
  return [...units.values()];
}

export function filterGeographicOffers(rows: GeographicOfferItem[], query: GeographicOfferQuery): GeographicOfferItem[] {
  const search = normalizeForMatch(query.search);
  const institutionIds = new Set(query.institutionId ?? []);
  const equals = (actual: string, expected?: string) => !expected || normalizeForMatch(actual) === normalizeForMatch(expected);
  return rows.filter((row) => {
    const searchable = [row.careers.join(" "), row.responsibleInstitution, row.name, row.cue, row.cui, row.locality, row.department].join(" ");
    const matchesInstitution = !institutionIds.size || institutionIds.has(createInstitutionId(row.cue, row.responsibleInstitution)) || institutionIds.has(createInstitutionId(row.cue, row.name));
    return matchesInstitution && (!search || normalizeForMatch(searchable).includes(search)) && equals(row.management, query.management) &&
      equals(row.department, query.department) && equals(row.locality, query.locality) && equals(row.siteType, query.siteType) && equals(row.offerType, query.offerType);
  }).sort((a, b) => compareText(a.name, b.name));
}

function distinct(rows: GeographicOfferItem[], field: keyof GeographicOfferItem): string[] {
  const values = new Map<string, string>();
  for (const row of rows) { const value = safeText(row[field]); const key = normalizeForMatch(value); if (value && !values.has(key)) values.set(key, value); }
  return [...values.values()].sort(compareText);
}

export function geographicOfferFilters(rows: GeographicOfferItem[]) {
  return {
    management: distinct(rows, "management"), department: distinct(rows, "department"), locality: distinct(rows, "locality"),
    siteType: distinct(rows, "siteType"), offerType: ["Docente", "Técnica", "Mixta", "Otras"],
  };
}
