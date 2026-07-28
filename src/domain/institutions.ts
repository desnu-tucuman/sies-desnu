import type { SheetRow } from "@/server/sheets/types";

export const NO_DATA = "No hay datos";

export interface Authority {
  position: number;
  role: string;
  name: string;
  phone: string;
  email: string;
}

export interface TrainingOffer {
  totalCareers: string;
  enrollment: string;
  entrants: string;
  graduates: string;
  referenceYear: string;
  teachingDegrees: string[];
  technicalDegrees: string[];
  otherDegrees: string[];
}

export interface InstitutionDirectoryItem {
  id: string;
  cue: string;
  cui: string;
  name: string;
  management: string;
  baseTrainingType: string;
  siteType: string;
  address: string;
  locality: string;
  department: string;
  phone: string;
  email: string;
  schedule: string;
  sharedBuilding: string;
}

export interface InstitutionView extends InstitutionDirectoryItem {
  authorities: Authority[];
  offer: TrainingOffer | null;
  partialReasons: string[];
}

export interface JoinIssue {
  source: "CARRERAS_RESUMEN" | "AUTORIDADES_RESUMEN";
  cue: string;
  name: string;
  reason: string;
}

export interface InstitutionDataset {
  institutions: InstitutionView[];
  issues: JoinIssue[];
  referenceYear: string;
  lastUpdated: string;
}

export interface InstitutionQuery {
  search?: string;
  management?: string;
  department?: string;
  locality?: string;
  siteType?: string;
  trainingType?: string[];
  sort?: "name" | "management" | "locality" | "department" | "siteType" | "trainingType";
  direction?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface InstitutionQueryResult {
  items: InstitutionDirectoryItem[];
  total: number;
  page: number;
  pageCount: number;
  filters: {
    management: string[];
    department: string[];
    locality: string[];
    siteType: string[];
    trainingType: string[];
  };
}

export interface QueryParameterSource {
  get(name: string): string | null | undefined;
  getAll?(name: string): string[];
}

export function queryValues(params: QueryParameterSource, name: string): string[] {
  const values = params.getAll ? params.getAll(name) : [params.get(name) ?? ""];
  const unique = new Map<string, string>();
  for (const value of values) {
    const clean = safeText(value);
    const normalized = normalizeForMatch(clean);
    if (clean && !unique.has(normalized)) unique.set(normalized, clean);
  }
  return [...unique.values()];
}

export function institutionQueryFromParams(params: QueryParameterSource): InstitutionQuery {
  const allowedSorts: NonNullable<InstitutionQuery["sort"]>[] = [
    "name", "management", "locality", "department", "siteType", "trainingType",
  ];
  const sortValue = safeText(params.get("sort"));
  const pageValue = Number(params.get("page"));
  return {
    search: safeText(params.get("search")),
    management: safeText(params.get("management")),
    department: safeText(params.get("department")),
    locality: safeText(params.get("locality")),
    siteType: safeText(params.get("siteType")),
    trainingType: queryValues(params, "trainingType"),
    sort: allowedSorts.find((option) => option === sortValue),
    direction: params.get("direction") === "desc" ? "desc" : "asc",
    page: Number.isFinite(pageValue) && pageValue > 0 ? pageValue : 1,
  };
}

export function safeText(value: unknown): string {
  return value === null || value === undefined ? "" : String(value).trim();
}

export function normalizeForMatch(value: unknown): string {
  return safeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

export function createInstitutionId(cue: string, name: string): string {
  return Buffer.from(JSON.stringify([cue.trim(), normalizeForMatch(name)]), "utf8").toString("base64url");
}

export function splitOfferList(value: string): string[] {
  return value.split("|").map((item) => item.trim()).filter(Boolean);
}

export function createInstitutionDirectoryRows(masterRows: SheetRow[]): InstitutionDirectoryItem[] {
  return masterRows.map((master) => ({
    id: createInstitutionId(master.cue_anexo, master.nombre_establecimiento),
    cue: master.cue_anexo,
    cui: master.cui,
    name: master.nombre_establecimiento,
    management: master.gestion,
    baseTrainingType: master.tipo_formacion_base,
    siteType: master.tipo_sede,
    address: master.direccion,
    locality: master.localidad,
    department: master.departamento,
    phone: master.telefono,
    email: master.email_institucional,
    schedule: master.horario,
    sharedBuilding: master.comparte_edificio_con || master.estado_edificio,
  }));
}

function joinKey(cue: string, name: string): string {
  return `${cue.trim()}::${normalizeForMatch(name)}`;
}

function authoritiesFromRow(row?: SheetRow): Authority[] {
  if (!row) return [];
  return [1, 2, 3, 4]
    .map((position) => ({
      position,
      role: row[`cargo_${position}`] ?? "",
      name: row[`autoridad_${position}_nombre`] ?? "",
      phone: row[`autoridad_${position}_telefono`] ?? "",
      email: row[`autoridad_${position}_mail`] ?? "",
    }))
    .filter((authority) => [authority.role, authority.name, authority.phone, authority.email].some(Boolean));
}

function offerFromRow(row?: SheetRow): TrainingOffer | null {
  if (!row) return null;
  return {
    totalCareers: row.cantidad_carreras,
    enrollment: row.matricula_total,
    entrants: row.ingresantes,
    graduates: row.egresados,
    referenceYear: row.anio_referencia,
    teachingDegrees: splitOfferList(row.profesorados),
    technicalDegrees: splitOfferList(row.tecnicaturas),
    otherDegrees: splitOfferList(row.otras_formaciones),
  };
}

function latestAuthorityUpdate(rows: SheetRow[]): string {
  const dated = rows
    .map((row) => ({ raw: row.ultima_actualizacion, time: Date.parse(row.ultima_actualizacion) }))
    .filter((item) => item.raw && Number.isFinite(item.time))
    .sort((a, b) => b.time - a.time);
  return dated[0]?.raw ?? NO_DATA;
}

export function joinInstitutionSources(
  masterRows: SheetRow[],
  careerRows: SheetRow[],
  authorityRows: SheetRow[],
  referenceYear: string,
): InstitutionDataset {
  const masterKeysByCue = new Map<string, string[]>();
  for (const row of masterRows) {
    const key = joinKey(row.cue_anexo, row.nombre_establecimiento);
    masterKeysByCue.set(row.cue_anexo, [...(masterKeysByCue.get(row.cue_anexo) ?? []), key]);
  }

  const indexSource = (rows: SheetRow[], nameOf: (row: SheetRow) => string) => {
    const countByCue = new Map<string, number>();
    rows.forEach((row) => countByCue.set(row.cue_anexo, (countByCue.get(row.cue_anexo) ?? 0) + 1));
    const byMasterKey = new Map<string, SheetRow>();
    const unmatched: SheetRow[] = [];
    for (const row of rows) {
      const exactKey = joinKey(row.cue_anexo, nameOf(row));
      const masterKeys = masterKeysByCue.get(row.cue_anexo) ?? [];
      const targetKey = masterKeys.includes(exactKey)
        ? exactKey
        : masterKeys.length === 1 && countByCue.get(row.cue_anexo) === 1
          ? masterKeys[0]
          : undefined;
      if (targetKey) byMasterKey.set(targetKey, row); else unmatched.push(row);
    }
    return { byMasterKey, unmatched };
  };

  const careerIndex = indexSource(careerRows, (row) => row.nombre_sede_oferta || row.nombre_establecimiento);
  const authorityIndex = indexSource(authorityRows, (row) => row.nombre_establecimiento);

  const institutions = createInstitutionDirectoryRows(masterRows).map((directoryItem, index) => {
    const master = masterRows[index];
    const key = joinKey(master.cue_anexo, master.nombre_establecimiento);
    const career = careerIndex.byMasterKey.get(key);
    const authority = authorityIndex.byMasterKey.get(key);
    const partialReasons: string[] = [];
    if (!career) partialReasons.push("Sin coincidencia en CARRERAS_RESUMEN");
    if (!authority) partialReasons.push("Sin coincidencia en AUTORIDADES_RESUMEN");

    return {
      ...directoryItem,
      authorities: authoritiesFromRow(authority),
      offer: offerFromRow(career),
      partialReasons,
    } satisfies InstitutionView;
  });

  const issues: JoinIssue[] = [];
  for (const row of careerIndex.unmatched) {
    issues.push({
      source: "CARRERAS_RESUMEN", cue: row.cue_anexo,
      name: row.nombre_sede_oferta || row.nombre_establecimiento,
      reason: "No existe coincidencia segura por CUE y nombre en MAESTRA_INSTITUCIONES",
    });
  }
  for (const row of authorityIndex.unmatched) {
    issues.push({
      source: "AUTORIDADES_RESUMEN", cue: row.cue_anexo,
      name: row.nombre_establecimiento,
      reason: "No existe coincidencia segura por CUE y nombre en MAESTRA_INSTITUCIONES",
    });
  }

  return { institutions, issues, referenceYear, lastUpdated: latestAuthorityUpdate(authorityRows) };
}

export function compareText(a: unknown, b: unknown): number {
  return safeText(a).localeCompare(safeText(b), "es", { sensitivity: "base", numeric: true });
}

function distinct(rows: InstitutionDirectoryItem[], field: keyof InstitutionDirectoryItem): string[] {
  const byNormalizedValue = new Map<string, string>();
  for (const row of rows) {
    const original = safeText(row[field]);
    const normalized = normalizeForMatch(original);
    if (original && !byNormalizedValue.has(normalized)) byNormalizedValue.set(normalized, original);
  }
  return [...byNormalizedValue.values()].sort(compareText);
}

export function filterAndSortInstitutions(
  institutions: InstitutionDirectoryItem[],
  query: InstitutionQuery,
): InstitutionDirectoryItem[] {
  const normalizedSearch = normalizeForMatch(query.search ?? "");
  const equals = (actual: string, expected?: string) =>
    !expected || normalizeForMatch(actual) === normalizeForMatch(expected);
  const equalsAny = (actual: string, expected?: string[]) =>
    !expected?.length || expected.some((value) => normalizeForMatch(actual) === normalizeForMatch(value));

  const filtered = institutions.filter((institution) =>
    (!normalizedSearch || normalizeForMatch(`${institution.name} ${institution.cue}`).includes(normalizedSearch)) &&
    equals(institution.management, query.management) &&
    equals(institution.department, query.department) &&
    equals(institution.locality, query.locality) &&
    equals(institution.siteType, query.siteType) &&
    equalsAny(institution.baseTrainingType, query.trainingType));

  const allowedSorts = new Set(["name", "management", "locality", "department", "siteType", "trainingType"]);
  const sort = query.sort && allowedSorts.has(query.sort) ? query.sort : "name";
  const direction = query.direction === "desc" ? -1 : 1;
  const valueFor = (item: InstitutionDirectoryItem): string => {
    if (sort === "trainingType") return item.baseTrainingType;
    return item[sort] as string;
  };
  return filtered.sort((a, b) => compareText(valueFor(a), valueFor(b)) * direction);
}

export function queryInstitutions(
  institutions: InstitutionDirectoryItem[],
  query: InstitutionQuery,
): InstitutionQueryResult {
  const filtered = filterAndSortInstitutions(institutions, query);

  const requestedPageSize = Number.isFinite(query.pageSize) ? Number(query.pageSize) : 20;
  const pageSize = Math.min(Math.max(requestedPageSize, 5), 100);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const requestedPage = Number.isFinite(query.page) ? Number(query.page) : 1;
  const page = Math.min(Math.max(requestedPage, 1), pageCount);

  return {
    items: filtered.slice((page - 1) * pageSize, page * pageSize),
    total: filtered.length,
    page,
    pageCount,
    filters: {
      management: distinct(institutions, "management"),
      department: distinct(institutions, "department"),
      locality: distinct(institutions, "locality"),
      siteType: distinct(institutions, "siteType"),
      trainingType: distinct(institutions, "baseTrainingType"),
    },
  };
}
