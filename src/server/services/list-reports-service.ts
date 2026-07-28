import "server-only";

import { filterAndSortAcademicOffers } from "@/domain/academic-offer";
import { filterAndSortAuthorities } from "@/domain/authorities-directory";
import { LIST_REPORT_LABELS, type ListReportQuery } from "@/domain/list-reports";
import { compareText, filterAndSortInstitutions, normalizeForMatch, safeText } from "@/domain/institutions";
import { getAcademicOfferDataset } from "@/server/services/academic-offer-service";
import { getAuthoritiesDirectory } from "@/server/services/authorities-directory-service";
import { getInstitutionDirectory } from "@/server/services/institution-directory-service";
import { getInstitutionDataset } from "@/server/services/institutions-service";

export interface HierarchicalOfferBlock {
  management: string; institution: string; locality: string; department: string;
  siteType: string; offers: string[]; enrollment: string; entrants: string; graduates: string;
}

export interface ListReportData {
  title: string;
  year: string;
  columns: string[];
  rows: string[][];
  filtersApplied: string[];
  options: Record<string, string[]>;
  partialCount: number;
  hierarchicalOffers?: HierarchicalOfferBlock[];
}

const FILTER_LABELS: Array<[keyof ListReportQuery, string]> = [
  ["search", "Búsqueda"], ["institution", "Institución"], ["role", "Cargo"], ["management", "Gestión"],
  ["department", "Departamento"], ["locality", "Localidad"], ["siteType", "Tipo de sede"],
  ["trainingType", "Tipo de formación"], ["careerType", "Tipo de carrera"],
];

function appliedFilters(query: ListReportQuery): string[] {
  return FILTER_LABELS.flatMap(([key, label]) => {
    const value = key === "trainingType" && query.institutionalTrainingTypes?.length
      ? query.institutionalTrainingTypes
      : query[key];
    if (Array.isArray(value)) return value.length ? [`${label}: ${value.join(", ")}`] : [];
    return typeof value === "string" && value.trim() ? [`${label}: ${value.trim()}`] : [];
  });
}
function equals(actual: string, expected?: string): boolean { return !expected || normalizeForMatch(actual) === normalizeForMatch(expected); }
function equalsAny(actual: string, expected?: string[]): boolean { return !expected?.length || expected.some((value) => normalizeForMatch(actual) === normalizeForMatch(value)); }
function includes(actual: string, expected?: string): boolean { return !expected || normalizeForMatch(actual).includes(normalizeForMatch(expected)); }
function distinct<T>(rows: T[], value: (row: T) => string): string[] {
  const found = new Map<string, string>(); rows.forEach((row) => { const original = safeText(value(row)); const key = normalizeForMatch(original); if (original && !found.has(key)) found.set(key, original); });
  return [...found.values()].sort(compareText);
}

async function institutionsReport(query: ListReportQuery): Promise<ListReportData> {
  const directory = await getInstitutionDirectory();
  const rows = filterAndSortInstitutions(directory.institutions, { search: query.search, management: query.management, department: query.department, locality: query.locality, siteType: query.siteType, trainingType: query.institutionalTrainingTypes });
  return {
    title: LIST_REPORT_LABELS.institutions, year: "", filtersApplied: appliedFilters(query), partialCount: directory.incompleteRows,
    columns: ["Institución", "CUE", "CUI", "Gestión", "Tipo de sede", "Formación institucional", "Localidad", "Departamento", "Dirección", "Teléfono", "Correo institucional"],
    rows: rows.map((row) => [row.name, row.cue, row.cui, row.management, row.siteType, row.baseTrainingType, row.locality, row.department, row.address, row.phone, row.email]),
    options: { management: distinct(directory.institutions, (row) => row.management), department: distinct(directory.institutions, (row) => row.department), locality: distinct(directory.institutions, (row) => row.locality), siteType: distinct(directory.institutions, (row) => row.siteType), trainingType: distinct(directory.institutions, (row) => row.baseTrainingType) },
  };
}

async function institutionOffersReport(query: ListReportQuery): Promise<ListReportData> {
  const dataset = await getInstitutionDataset();
  const allBlocks = dataset.institutions.flatMap((institution) => {
    if (!institution.offer) return [];
    const categorized = [
      ...institution.offer.teachingDegrees.map((title) => ({ title, category: "Profesorado" })),
      ...institution.offer.technicalDegrees.map((title) => ({ title, category: "Tecnicatura" })),
      ...institution.offer.otherDegrees.map((title) => ({ title, category: "Otra formación" })),
    ];
    const selected = categorized.filter((offer) => equals(offer.category, query.careerType) && includes(offer.title, query.search));
    if (!selected.length || !includes(institution.name, query.institution) || !equals(institution.management, query.management) || !equals(institution.department, query.department) || !equals(institution.locality, query.locality) || !equals(institution.siteType, query.siteType) || !equalsAny(institution.baseTrainingType, query.institutionalTrainingTypes)) return [];
    return [{ management: institution.management, institution: institution.name, locality: institution.locality, department: institution.department, siteType: institution.siteType, offers: selected.map((item) => item.title), enrollment: institution.offer.enrollment, entrants: institution.offer.entrants, graduates: institution.offer.graduates, categories: selected.map((item) => item.category) }];
  });
  const order = (value: string) => normalizeForMatch(value).includes("ESTATAL") ? 0 : 1;
  allBlocks.sort((a, b) => order(a.management) - order(b.management) || compareText(a.institution, b.institution));
  const rows = allBlocks.flatMap((block) => block.offers.map((offer, index) => [block.management, block.institution, block.locality, block.department, block.siteType, block.categories[index], offer, block.enrollment, block.entrants, block.graduates, dataset.referenceYear]));
  const allInstitutions = dataset.institutions.filter((item) => item.offer);
  return {
    title: LIST_REPORT_LABELS["institution-offers"], year: dataset.referenceYear, filtersApplied: appliedFilters(query), partialCount: dataset.issues.filter((item) => item.source === "CARRERAS_RESUMEN").length,
    columns: ["Gestión", "Institución o sede", "Localidad", "Departamento", "Tipo de sede", "Tipo de carrera", "Oferta académica", "Matrícula", "Ingresantes", "Egresados", "Año de referencia"], rows,
    hierarchicalOffers: allBlocks.map((block) => ({ management: block.management, institution: block.institution, locality: block.locality, department: block.department, siteType: block.siteType, offers: block.offers, enrollment: block.enrollment, entrants: block.entrants, graduates: block.graduates })),
    options: { management: distinct(allInstitutions, (row) => row.management), department: distinct(allInstitutions, (row) => row.department), locality: distinct(allInstitutions, (row) => row.locality), siteType: distinct(allInstitutions, (row) => row.siteType), trainingType: distinct(allInstitutions, (row) => row.baseTrainingType), institution: distinct(allInstitutions, (row) => row.name), careerType: ["Profesorado", "Tecnicatura", "Otra formación"] },
  };
}

async function careerPlacesReport(query: ListReportQuery): Promise<ListReportData> {
  const [academic, directory] = await Promise.all([getAcademicOfferDataset(), getInstitutionDirectory()]);
  const byCue = new Map<string, typeof directory.institutions>();
  directory.institutions.forEach((item) => byCue.set(item.cue, [...(byCue.get(item.cue) ?? []), item]));
  const enriched = academic.offers.map((offer) => {
    const candidates = byCue.get(offer.cue) ?? [];
    const institution = candidates.find((item) => normalizeForMatch(item.name) === normalizeForMatch(offer.institution)) ?? (candidates.length === 1 ? candidates[0] : undefined);
    return { ...offer, institutionId: institution?.id ?? "", siteType: institution?.siteType ?? "" };
  });
  const enrichedById = new Map(enriched.map((item) => [item.id, item]));
  const filtered = filterAndSortAcademicOffers(enriched, { search: query.search, institution: query.institution, management: query.management, department: query.department, locality: query.locality, careerType: query.careerType, trainingType: query.trainingType })
    .map((item) => enrichedById.get(item.id)!)
    .filter((item) => equals(item.siteType, query.siteType));
  return {
    title: LIST_REPORT_LABELS["career-places"], year: academic.referenceYear, filtersApplied: appliedFilters(query), partialCount: enriched.filter((item) => !item.siteType).length,
    columns: ["Título", "Institución o sede", "CUE", "Gestión", "Localidad", "Departamento", "Tipo de sede", "Matrícula", "Ingresantes", "Egresados", "Año de referencia"],
    rows: filtered.map((row) => [row.title, row.institution, row.cue, row.management, row.locality, row.department, row.siteType, row.enrollment, row.entrants, row.graduates, row.referenceYear]),
    options: { institution: distinct(enriched, (row) => row.institution), management: distinct(enriched, (row) => row.management), department: distinct(enriched, (row) => row.department), locality: distinct(enriched, (row) => row.locality), siteType: distinct(enriched, (row) => row.siteType), careerType: distinct(enriched, (row) => row.careerType), trainingType: distinct(enriched, (row) => row.trainingType) },
  };
}

async function authoritiesReport(query: ListReportQuery): Promise<ListReportData> {
  const directory = await getAuthoritiesDirectory();
  const rows = filterAndSortAuthorities(directory.authorities, { search: query.search, institution: query.institution, role: query.role, management: query.management, department: query.department, locality: query.locality, siteType: query.siteType });
  return {
    title: LIST_REPORT_LABELS.authorities, year: "", filtersApplied: appliedFilters(query), partialCount: directory.unmatchedRows + directory.ambiguousRows,
    columns: ["Cargo", "Apellido y nombre", "Institución", "Gestión", "Localidad", "Departamento", "Teléfono", "Correo electrónico"],
    rows: rows.map((row) => [row.role, row.name, row.institution, row.management, row.locality, row.department, row.phone, row.email]),
    options: { role: distinct(directory.authorities, (row) => row.role), institution: distinct(directory.authorities, (row) => row.institution), management: distinct(directory.authorities, (row) => row.management), department: distinct(directory.authorities, (row) => row.department), locality: distinct(directory.authorities, (row) => row.locality), siteType: distinct(directory.authorities, (row) => row.siteType) },
  };
}

export async function getListReport(query: ListReportQuery): Promise<ListReportData> {
  if (query.type === "institution-offers") return institutionOffersReport(query);
  if (query.type === "career-places") return careerPlacesReport(query);
  if (query.type === "authorities") return authoritiesReport(query);
  return institutionsReport(query);
}
