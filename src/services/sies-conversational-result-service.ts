import type { AcademicOfferItem } from "../domain/academic-offer";
import type { AuthorityDirectoryItem } from "../domain/authorities-directory";
import { compareText, createInstitutionId, normalizeForMatch, safeText, type InstitutionDirectoryItem } from "../domain/institutions";
import type { SiesConversationalQuery, SiesConversationalResult, SiesConversationalResultGroup } from "../domain/sies-responds";
import { matchesAnyDepartment } from "../domain/sies-territorial-regions";

function matches(actual: string, expected?: string): boolean {
  return !expected || normalizeForMatch(actual).includes(normalizeForMatch(expected));
}

function resolveKnownValue(text: string, values: string[]): string | undefined {
  const normalized = normalizeForMatch(text);
  return values.filter(Boolean).sort((a, b) => b.length - a.length).find((value) => normalized.includes(normalizeForMatch(value)));
}

function distinctValues<T>(rows: T[], value: (row: T) => string): string[] {
  const found = new Map<string, string>();
  for (const row of rows) {
    const original = safeText(value(row)); const key = normalizeForMatch(original);
    if (original && !found.has(key)) found.set(key, original);
  }
  return [...found.values()];
}

function contentTerms(query: SiesConversationalQuery, excluded: Array<string | undefined>): string[] {
  const excludedTokens = new Set(excluded.flatMap((value) => normalizeForMatch(value).split(" ")).filter(Boolean));
  return query.searchTerms.filter((term) => !excludedTokens.has(term));
}

function createGroups<T>(rows: T[], groupValue: (row: T) => string, itemValue: (row: T) => { label: string; detail?: string; href?: string }, uniqueKey: (row: T) => string): SiesConversationalResultGroup[] {
  const groups = new Map<string, { label: string; rows: T[]; seen: Set<string> }>();
  for (const row of rows) {
    const label = safeText(groupValue(row)) || "Sin datos"; const key = normalizeForMatch(label);
    const group = groups.get(key) ?? { label, rows: [], seen: new Set<string>() };
    const itemKey = uniqueKey(row);
    if (!group.seen.has(itemKey)) { group.rows.push(row); group.seen.add(itemKey); }
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => compareText(a.label, b.label)).map((group) => ({
    label: group.label,
    count: group.rows.length,
    items: group.rows.slice(0, 12).map(itemValue),
  }));
}

export function resolveOfferConversation(text: string, query: SiesConversationalQuery, offers: AcademicOfferItem[], referenceYear: string): SiesConversationalResult {
  const department = resolveKnownValue(text, distinctValues(offers, (row) => row.department));
  const locality = resolveKnownValue(text, distinctValues(offers, (row) => row.locality));
  const terms = contentTerms(query, [department, locality, query.managementType]);
  const matchesCareerType = (offer: AcademicOfferItem) => {
    if (!query.careerType) return true;
    const title = normalizeForMatch(offer.title);
    return query.careerType === "PROFESORADO" ? title.includes("PROFESOR") : title.includes("TECNIC") || title.includes("TECNÓLOG");
  };
  const filtered = offers.filter((offer) =>
    matchesCareerType(offer) &&
    matches(offer.management, query.managementType) && matches(offer.department, department) && matchesAnyDepartment(offer.department, query.departments) && matches(offer.locality, locality) &&
    (!terms.length || terms.every((term) => normalizeForMatch(offer.title).includes(term))));
  const institutions = new Set(filtered.map((row) => `${row.cue}::${normalizeForMatch(row.institution)}`));
  const departments = new Set(filtered.map((row) => normalizeForMatch(row.department)).filter(Boolean));
  const localities = new Set(filtered.map((row) => normalizeForMatch(row.locality)).filter(Boolean));
  const grouping = query.requestedGrouping ?? "department";
  const groupValue = (row: AcademicOfferItem) => grouping === "locality" ? row.locality : grouping === "institution" ? row.institution : row.department;
  const groupedOffers = new Map<string, { label: string; rows: AcademicOfferItem[] }>();
  for (const row of filtered) {
    const label = safeText(groupValue(row)) || "Sin datos"; const key = normalizeForMatch(label);
    const group = groupedOffers.get(key) ?? { label, rows: [] }; group.rows.push(row); groupedOffers.set(key, group);
  }
  const groups = [...groupedOffers.values()].sort((a, b) => compareText(a.label, b.label)).map((group) => {
    const byInstitution = new Map<string, { institution: string; locality: string; titles: string[] }>();
    for (const row of group.rows) {
      const key = `${row.cue}::${normalizeForMatch(row.institution)}`;
      const item = byInstitution.get(key) ?? { institution: row.institution, locality: row.locality, titles: [] };
      if (!item.titles.some((title) => normalizeForMatch(title) === normalizeForMatch(row.title))) item.titles.push(row.title);
      byInstitution.set(key, item);
    }
    return {
      label: group.label,
      count: group.rows.length,
      items: [...byInstitution.values()].slice(0, 12).map((item) => ({ label: item.institution, detail: `${item.titles.join(" · ")}${item.locality ? ` · ${item.locality}` : ""}`, href: `/instituciones?search=${encodeURIComponent(item.institution)}` })),
    };
  });
  const offersTruncated = [...groupedOffers.values()].some((group) => new Set(group.rows.map((row) => `${row.cue}::${normalizeForMatch(row.institution)}`)).size > 12);
  return {
    referenceYear,
    metrics: [
      { label: "Departamentos", value: departments.size }, { label: "Instituciones", value: institutions.size },
      { label: "Ofertas", value: filtered.length }, { label: "Localidades", value: localities.size },
    ],
    groups, totalMatches: filtered.length, truncated: groups.length > 20 || offersTruncated,
    interpretedQuery: { ...query, department, locality, careerTitle: terms.join(" ") || query.careerTitle },
    institutionIds: [...new Set(filtered.map((offer) => createInstitutionId(safeText(offer.cue), offer.institution)))],
  };
}

export function resolveInstitutionConversation(text: string, query: SiesConversationalQuery, institutions: InstitutionDirectoryItem[]): SiesConversationalResult {
  const department = resolveKnownValue(text, distinctValues(institutions, (row) => row.department));
  const locality = resolveKnownValue(text, distinctValues(institutions, (row) => row.locality));
  const terms = contentTerms(query, [department, locality, query.managementType, ...(query.trainingTypes ?? [])]);
  const filtered = institutions.filter((institution) =>
    matches(institution.management, query.managementType) && matches(institution.department, department) && matchesAnyDepartment(institution.department, query.departments) && matches(institution.locality, locality) &&
    (!query.trainingTypes?.length || query.trainingTypes.some((value) => normalizeForMatch(institution.baseTrainingType) === normalizeForMatch(value))) &&
    (!terms.length || terms.every((term) => normalizeForMatch(`${institution.name} ${institution.cue}`).includes(term))));
  const grouping = query.requestedGrouping ?? (department ? "locality" : "department");
  const groups = createGroups(filtered, (row) => grouping === "locality" ? row.locality : grouping === "institution" ? row.name : row.department, (row) => ({
    label: row.name, detail: `${row.siteType}${row.locality ? ` · ${row.locality}` : ""}`, href: `/instituciones/${row.id}`,
  }), (row) => row.id);
  return {
    metrics: [{ label: "Instituciones", value: filtered.length }, { label: "Departamentos", value: new Set(filtered.map((row) => normalizeForMatch(row.department)).filter(Boolean)).size }, { label: "Localidades", value: new Set(filtered.map((row) => normalizeForMatch(row.locality)).filter(Boolean)).size }],
    groups, totalMatches: filtered.length, truncated: groups.length > 20 || groups.some((group) => group.count > group.items.length),
    interpretedQuery: { ...query, department, locality },
  };
}

export function resolveAuthorityConversation(text: string, query: SiesConversationalQuery, authorities: AuthorityDirectoryItem[]): SiesConversationalResult {
  const department = resolveKnownValue(text, distinctValues(authorities, (row) => row.department));
  const locality = resolveKnownValue(text, distinctValues(authorities, (row) => row.locality));
  const terms = contentTerms(query, [department, locality, query.managementType]);
  const filtered = authorities.filter((authority) =>
    matches(authority.management, query.managementType) && matches(authority.department, department) && matchesAnyDepartment(authority.department, query.departments) && matches(authority.locality, locality) &&
    (!terms.length || terms.every((term) => normalizeForMatch(`${authority.institution} ${authority.name} ${authority.role} ${authority.cue}`).includes(term))));
  const groups = createGroups(filtered, (row) => row.institution, (row) => ({
    label: row.name || "No hay datos", detail: `${row.role || "Autoridad"}${row.phone ? ` · ${row.phone}` : ""}`, href: `/instituciones/${row.institutionId}`,
  }), (row) => row.id);
  return {
    metrics: [{ label: "Autoridades", value: filtered.length }, { label: "Instituciones", value: new Set(filtered.map((row) => row.institutionId)).size }, { label: "Departamentos", value: new Set(filtered.map((row) => normalizeForMatch(row.department)).filter(Boolean)).size }],
    groups, totalMatches: filtered.length, truncated: groups.length > 20 || groups.some((group) => group.count > group.items.length),
    interpretedQuery: { ...query, department, locality, institutionName: terms.join(" ") || query.institutionName },
  };
}
