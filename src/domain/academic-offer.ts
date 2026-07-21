import type { SheetRow } from "@/server/sheets/types";
import { compareText, normalizeForMatch, safeText, type QueryParameterSource } from "./institutions";

export interface AcademicOfferItem {
  id: string;
  cue: string;
  title: string;
  institution: string;
  management: string;
  locality: string;
  department: string;
  careerType: string;
  trainingType: string;
  careerStatus: string;
  enrollment: string;
  entrants: string;
  graduates: string;
  referenceYear: string;
}

export interface AcademicOfferQuery {
  search?: string;
  institution?: string;
  management?: string;
  department?: string;
  locality?: string;
  careerType?: string;
  trainingType?: string;
  careerStatus?: string;
  sort?: "title" | "institution" | "management" | "locality" | "department" | "careerType" | "trainingType" | "enrollment" | "entrants" | "graduates";
  direction?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface AcademicOfferQueryResult {
  items: AcademicOfferItem[];
  total: number;
  page: number;
  pageCount: number;
  filters: Record<"institution" | "management" | "department" | "locality" | "careerType" | "trainingType" | "careerStatus", string[]>;
}

export class AcademicOfferConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AcademicOfferConfigurationError";
  }
}

export class NoConsolidatedAcademicDataError extends Error {
  constructor(readonly referenceYear: string) {
    super(`No hay datos consolidados disponibles para el año configurado: ${referenceYear}.`);
    this.name = "NoConsolidatedAcademicDataError";
  }
}

export function requireConsolidatedReferenceYear(config: ReadonlyMap<string, string>): string {
  if (!config.has("ANIO_ACTUAL")) {
    throw new AcademicOfferConfigurationError('El parámetro "ANIO_ACTUAL" no existe en la hoja CONFIG.');
  }

  const value = config.get("ANIO_ACTUAL")?.trim() ?? "";
  if (!value) {
    throw new AcademicOfferConfigurationError('El parámetro "ANIO_ACTUAL" está vacío en la hoja CONFIG.');
  }
  if (!/^\d+$/.test(value)) {
    throw new AcademicOfferConfigurationError('El parámetro "ANIO_ACTUAL" de la hoja CONFIG debe ser numérico.');
  }
  return value;
}

export function filterCareersByConsolidatedYear(rows: SheetRow[], referenceYear: string): SheetRow[] {
  return rows.filter((row) => row.anio_columna?.trim() === referenceYear);
}

export function requireConsolidatedAcademicRows(rows: SheetRow[], referenceYear: string): SheetRow[] {
  if (!rows.length) throw new NoConsolidatedAcademicDataError(referenceYear);
  return rows;
}

export function consolidatedDataCaption(referenceYear: string): string {
  return `Datos del último año consolidado del Relevamiento Anual (RA): ${referenceYear}`;
}

export function createAcademicOfferRows(rows: SheetRow[], referenceYear: string): AcademicOfferItem[] {
  return rows.map((row, index) => ({
    id: Buffer.from(JSON.stringify([row.cue_anexo, row.titulo, row.nombre_sede_oferta, index]), "utf8").toString("base64url"),
    cue: safeText(row.cue_anexo),
    title: safeText(row.titulo),
    institution: safeText(row.nombre_sede_oferta || row.nombre_establecimiento),
    management: safeText(row.gestion),
    locality: safeText(row.localidad_oferta),
    department: safeText(row.departamento_oferta),
    careerType: safeText(row.tipo_carrera),
    trainingType: safeText(row.tipo_formacion),
    careerStatus: safeText(row.estado_carrera),
    enrollment: safeText(row.matricula_total),
    entrants: safeText(row.ingresantes),
    graduates: safeText(row.egresados),
    referenceYear,
  }));
}

export function academicOfferQueryFromParams(params: QueryParameterSource): AcademicOfferQuery {
  const allowedSorts: NonNullable<AcademicOfferQuery["sort"]>[] = [
    "title", "institution", "management", "locality", "department", "careerType", "trainingType", "enrollment", "entrants", "graduates",
  ];
  const sort = safeText(params.get("sort"));
  const page = Number(params.get("page"));
  return {
    search: safeText(params.get("search")), institution: safeText(params.get("institution")),
    management: safeText(params.get("management")), department: safeText(params.get("department")),
    locality: safeText(params.get("locality")), careerType: safeText(params.get("careerType")),
    trainingType: safeText(params.get("trainingType")), careerStatus: safeText(params.get("careerStatus")),
    sort: allowedSorts.find((item) => item === sort), direction: params.get("direction") === "desc" ? "desc" : "asc",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

function distinct(rows: AcademicOfferItem[], field: keyof AcademicOfferItem): string[] {
  const values = new Map<string, string>();
  for (const row of rows) {
    const original = safeText(row[field]);
    const normalized = normalizeForMatch(original);
    if (original && !values.has(normalized)) values.set(normalized, original);
  }
  return [...values.values()].sort(compareText);
}

export function filterAndSortAcademicOffers(offers: AcademicOfferItem[], query: AcademicOfferQuery): AcademicOfferItem[] {
  const search = normalizeForMatch(query.search);
  const equals = (actual: string, expected?: string) => !expected || normalizeForMatch(actual) === normalizeForMatch(expected);
  const filtered = offers.filter((offer) =>
    (!search || normalizeForMatch(offer.title).includes(search)) &&
    equals(offer.institution, query.institution) && equals(offer.management, query.management) &&
    equals(offer.department, query.department) && equals(offer.locality, query.locality) &&
    equals(offer.careerType, query.careerType) && equals(offer.trainingType, query.trainingType) &&
    equals(offer.careerStatus, query.careerStatus));
  const sort = query.sort ?? "title";
  const direction = query.direction === "desc" ? -1 : 1;
  return filtered.sort((a, b) => compareText(a[sort], b[sort]) * direction);
}

export function queryAcademicOffers(offers: AcademicOfferItem[], query: AcademicOfferQuery): AcademicOfferQueryResult {
  const filtered = filterAndSortAcademicOffers(offers, query);
  const pageSize = Math.min(Math.max(Number.isFinite(query.pageSize) ? Number(query.pageSize) : 20, 5), 100);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(Math.max(Number.isFinite(query.page) ? Number(query.page) : 1, 1), pageCount);
  return {
    items: filtered.slice((page - 1) * pageSize, page * pageSize), total: filtered.length, page, pageCount,
    filters: {
      institution: distinct(offers, "institution"), management: distinct(offers, "management"),
      department: distinct(offers, "department"), locality: distinct(offers, "locality"),
      careerType: distinct(offers, "careerType"), trainingType: distinct(offers, "trainingType"),
      careerStatus: distinct(offers, "careerStatus"),
    },
  };
}
