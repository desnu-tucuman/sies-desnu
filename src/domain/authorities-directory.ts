import type { SheetRow } from "@/server/sheets/types";
import {
  compareText, createInstitutionDirectoryRows, normalizeForMatch, safeText,
  type InstitutionDirectoryItem, type QueryParameterSource,
} from "./institutions";

export interface AuthorityDirectoryItem {
  id: string;
  institutionId: string;
  cue: string;
  role: string;
  name: string;
  institution: string;
  management: string;
  siteType: string;
  locality: string;
  department: string;
  phone: string;
  email: string;
  status: string;
  lastUpdated: string;
}

export interface AcephalousInstitution {
  institutionId: string;
  cue: string;
  institution: string;
  status: string;
}

export interface AuthorityDirectoryQuery {
  search?: string;
  institution?: string;
  role?: string;
  management?: string;
  department?: string;
  locality?: string;
  siteType?: string;
  status?: string;
  sort?: "role" | "name" | "institution" | "management" | "locality" | "department" | "siteType";
  direction?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface AuthorityJoinResult {
  authorities: AuthorityDirectoryItem[];
  acephalousInstitutions: AcephalousInstitution[];
  unmatchedRows: number;
  ambiguousRows: number;
  duplicatesAvoided: number;
}

export interface AuthorityQueryResult {
  items: AuthorityDirectoryItem[];
  total: number;
  page: number;
  pageCount: number;
  institutionsRepresented: number;
  withoutPhone: number;
  withoutEmail: number;
  filters: Record<"institution" | "role" | "management" | "department" | "locality" | "siteType" | "status", string[]>;
}

interface TerritorialIndex {
  exact: Map<string, InstitutionDirectoryItem>;
  byCue: Map<string, InstitutionDirectoryItem[]>;
  byName: Map<string, InstitutionDirectoryItem[]>;
}

function territorialKey(cue: string, name: string): string {
  return `${safeText(cue)}::${normalizeForMatch(name)}`;
}

export function createTerritorialIndex(masterRows: SheetRow[]): TerritorialIndex {
  const exact = new Map<string, InstitutionDirectoryItem>();
  const byCue = new Map<string, InstitutionDirectoryItem[]>();
  const byName = new Map<string, InstitutionDirectoryItem[]>();
  createInstitutionDirectoryRows(masterRows).forEach((institution) => {
    exact.set(territorialKey(institution.cue, institution.name), institution);
    byCue.set(institution.cue, [...(byCue.get(institution.cue) ?? []), institution]);
    const name = normalizeForMatch(institution.name);
    byName.set(name, [...(byName.get(name) ?? []), institution]);
  });
  return { exact, byCue, byName };
}

function matchTerritorialUnit(index: TerritorialIndex, row: SheetRow): { institution?: InstitutionDirectoryItem; ambiguous: boolean } {
  const exact = index.exact.get(territorialKey(row.cue_anexo, row.nombre_establecimiento));
  if (exact) return { institution: exact, ambiguous: false };
  const candidates = index.byCue.get(safeText(row.cue_anexo)) ?? [];
  if (candidates.length === 1) return { institution: candidates[0], ambiguous: false };
  if (candidates.length > 1) return { ambiguous: true };
  const nameCandidates = index.byName.get(normalizeForMatch(row.nombre_establecimiento)) ?? [];
  if (nameCandidates.length === 1) return { institution: nameCandidates[0], ambiguous: false };
  return { ambiguous: nameCandidates.length > 1 };
}

export function createAuthoritiesDirectory(masterRows: SheetRow[], authorityRows: SheetRow[]): AuthorityJoinResult {
  const index = createTerritorialIndex(masterRows);
  const authorities: AuthorityDirectoryItem[] = [];
  const acephalousInstitutions: AcephalousInstitution[] = [];
  const seen = new Set<string>();
  let unmatchedRows = 0; let ambiguousRows = 0; let duplicatesAvoided = 0;

  authorityRows.forEach((row, rowIndex) => {
    const match = matchTerritorialUnit(index, row);
    if (!match.institution) {
      if (match.ambiguous) ambiguousRows += 1; else unmatchedRows += 1;
      return;
    }
    const institution = match.institution;
    const status = safeText(row.estado_autoridad);
    if (normalizeForMatch(status).includes("ACEFAL")) {
      acephalousInstitutions.push({ institutionId: institution.id, cue: institution.cue, institution: institution.name, status: "ACEFALÍA" });
      return;
    }

    for (let position = 1; position <= 4; position += 1) {
      const role = safeText(row[`cargo_${position}`]);
      const name = safeText(row[`autoridad_${position}_nombre`]);
      const phone = safeText(row[`autoridad_${position}_telefono`]);
      const email = safeText(row[`autoridad_${position}_mail`]);
      if (![role, name, phone, email].some(Boolean)) continue;
      const duplicateKey = [institution.id, role, name, phone, email].map(normalizeForMatch).join("::");
      if (seen.has(duplicateKey)) { duplicatesAvoided += 1; continue; }
      seen.add(duplicateKey);
      authorities.push({
        id: Buffer.from(JSON.stringify([institution.id, rowIndex, position]), "utf8").toString("base64url"),
        institutionId: institution.id, cue: institution.cue, role, name, institution: institution.name,
        management: institution.management, siteType: institution.siteType, locality: institution.locality,
        department: institution.department, phone, email, status, lastUpdated: safeText(row.ultima_actualizacion),
      });
    }
  });
  return { authorities, acephalousInstitutions, unmatchedRows, ambiguousRows, duplicatesAvoided };
}

export function authorityQueryFromParams(params: QueryParameterSource): AuthorityDirectoryQuery {
  const sorts: NonNullable<AuthorityDirectoryQuery["sort"]>[] = ["role", "name", "institution", "management", "locality", "department", "siteType"];
  const sort = safeText(params.get("sort")); const page = Number(params.get("page"));
  return {
    search: safeText(params.get("search")), institution: safeText(params.get("institution")), role: safeText(params.get("role")),
    management: safeText(params.get("management")), department: safeText(params.get("department")), locality: safeText(params.get("locality")),
    siteType: safeText(params.get("siteType")), status: safeText(params.get("status")),
    sort: sorts.find((item) => item === sort), direction: params.get("direction") === "desc" ? "desc" : "asc",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

function distinct(rows: AuthorityDirectoryItem[], field: keyof AuthorityDirectoryItem): string[] {
  const values = new Map<string, string>();
  rows.forEach((row) => { const original = safeText(row[field]); const key = normalizeForMatch(original); if (original && !values.has(key)) values.set(key, original); });
  return [...values.values()].sort(compareText);
}

export function filterAndSortAuthorities(authorities: AuthorityDirectoryItem[], query: AuthorityDirectoryQuery): AuthorityDirectoryItem[] {
  const search = normalizeForMatch(query.search);
  const equals = (actual: string, expected?: string) => !expected || normalizeForMatch(actual) === normalizeForMatch(expected);
  const filtered = authorities.filter((authority) =>
    (!search || normalizeForMatch(authority.name).includes(search)) &&
    (!query.institution || normalizeForMatch(`${authority.institution} ${authority.cue}`).includes(normalizeForMatch(query.institution))) &&
    equals(authority.role, query.role) && equals(authority.management, query.management) && equals(authority.department, query.department) &&
    equals(authority.locality, query.locality) && equals(authority.siteType, query.siteType) && equals(authority.status, query.status));
  const sort = query.sort ?? "name"; const direction = query.direction === "desc" ? -1 : 1;
  return filtered.sort((a, b) => compareText(a[sort], b[sort]) * direction);
}

export function queryAuthorities(authorities: AuthorityDirectoryItem[], query: AuthorityDirectoryQuery): AuthorityQueryResult {
  const filtered = filterAndSortAuthorities(authorities, query);
  const pageSize = Math.min(Math.max(Number.isFinite(query.pageSize) ? Number(query.pageSize) : 20, 5), 100);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(Math.max(Number.isFinite(query.page) ? Number(query.page) : 1, 1), pageCount);
  return {
    items: filtered.slice((page - 1) * pageSize, page * pageSize), total: filtered.length, page, pageCount,
    institutionsRepresented: new Set(filtered.map((item) => item.institutionId)).size,
    withoutPhone: filtered.filter((item) => !item.phone).length, withoutEmail: filtered.filter((item) => !item.email).length,
    filters: {
      institution: distinct(authorities, "institution"), role: distinct(authorities, "role"), management: distinct(authorities, "management"),
      department: distinct(authorities, "department"), locality: distinct(authorities, "locality"), siteType: distinct(authorities, "siteType"), status: distinct(authorities, "status"),
    },
  };
}

export function telephoneHref(phone: string): string | null {
  const compact = safeText(phone).replace(/[\s().-]/g, "");
  return /^\+?\d{6,15}$/.test(compact) ? `tel:${compact}` : null;
}

export function emailHref(email: string): string | null {
  const value = safeText(email);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? `mailto:${value}` : null;
}
