import type { SheetRow } from "@/server/sheets/types";
import { createInstitutionId, normalizeForMatch, safeText } from "./institutions";
import type { AcademicIndicator, SiesConversationalQuery, SiesConversationalResult } from "./sies-responds";

export interface AcademicIndicatorRow {
  year: string; cue: string; title: string; institution: string; management: string;
  department: string; locality: string; careerType: string; trainingType: string;
  enrollment: number; entrants: number; graduates: number;
}

const SOUTH_DEPARTMENTS = new Set(["CHICLIGASTA", "GRANEROS", "JUAN BAUTISTA ALBERDI", "LA COCHA", "RIO CHICO", "SIMOCA"]);

function number(value: unknown): number {
  const parsed = Number(String(value ?? "").trim().replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function canonicalCareerTitle(value: string): string {
  return normalizeForMatch(value)
    .replace(/^(TECNICO|TECNICA|TECNICATURA) SUPERIOR (EN |DE )?/, "")
    .replace(/^PROFESORADO (DE |EN )?/, "")
    .replace(/\bTECNICO SUPERIOR\b/g, "TECNICATURA")
    .trim();
}

export function createAcademicIndicatorRows(rows: SheetRow[], maximumYear: string): AcademicIndicatorRow[] {
  const deduplicated = new Map<string, AcademicIndicatorRow>();
  for (const row of rows) {
    const year = safeText(row.anio_columna);
    if (!/^\d{4}$/.test(year) || Number(year) > Number(maximumYear)) continue;
    const item: AcademicIndicatorRow = {
      year, cue: safeText(row.cue_anexo), title: safeText(row.titulo),
      institution: safeText(row.nombre_sede_oferta || row.nombre_establecimiento), management: safeText(row.gestion),
      department: safeText(row.departamento_oferta), locality: safeText(row.localidad_oferta),
      careerType: safeText(row.tipo_carrera), trainingType: safeText(row.tipo_formacion),
      enrollment: number(row.matricula_total), entrants: number(row.ingresantes), graduates: number(row.egresados),
    };
    const key = [year, item.cue, normalizeForMatch(item.institution), canonicalCareerTitle(item.title), normalizeForMatch(item.locality)].join("::");
    if (!deduplicated.has(key)) deduplicated.set(key, item);
  }
  return [...deduplicated.values()];
}

function indicatorValue(row: AcademicIndicatorRow, indicator: AcademicIndicator): number { return row[indicator]; }

function matchesRegion(row: AcademicIndicatorRow, region?: string): boolean {
  if (!region) return true;
  if (normalizeForMatch(region) === "SUR") return SOUTH_DEPARTMENTS.has(normalizeForMatch(row.department));
  return false;
}

export function resolveAcademicIndicators(text: string, query: SiesConversationalQuery, rows: AcademicIndicatorRow[], configuredYear: string): SiesConversationalResult {
  const indicator = query.academicIndicator ?? "graduates";
  const targetYear = query.year ?? configuredYear;
  const normalizedText = normalizeForMatch(text);
  const knownDepartment = [...new Set(rows.map((row) => row.department).filter(Boolean))].sort((a, b) => b.length - a.length).find((value) => normalizedText.includes(normalizeForMatch(value)));
  const knownInstitution = [...new Set(rows.map((row) => row.institution).filter(Boolean))].sort((a, b) => b.length - a.length).find((value) => normalizedText.includes(normalizeForMatch(value)));
  const excluded = new Set([targetYear, ...normalizeForMatch(knownDepartment).split(" "), ...normalizeForMatch(knownInstitution).split(" ")]);
  const titleTerms = query.searchTerms.filter((term) => !excluded.has(term));
  const department = query.department ?? knownDepartment;
  const institutionName = query.institutionName ?? knownInstitution;
  const base = rows.filter((row) =>
    (!query.managementType || normalizeForMatch(row.management).includes(normalizeForMatch(query.managementType))) &&
    (!department || normalizeForMatch(row.department) === normalizeForMatch(department)) &&
    matchesRegion(row, query.region) &&
    (!query.careerType || (query.careerType === "PROFESORADO" ? normalizeForMatch(row.title).includes("PROFESOR") : normalizeForMatch(row.title).includes("TECNIC"))) &&
    (!query.trainingTypes?.length || query.trainingTypes.some((value) => normalizeForMatch(row.trainingType) === normalizeForMatch(value))) &&
    (!institutionName || normalizeForMatch(row.institution).includes(normalizeForMatch(institutionName))) &&
    (!titleTerms.length || titleTerms.every((term) => canonicalCareerTitle(row.title).includes(canonicalCareerTitle(term)))));
  const current = base.filter((row) => row.year === targetYear);
  let selected = query.analysisMode === "zero" ? current.filter((row) => indicatorValue(row, indicator) === 0) : current;
  if (query.analysisMode === "maximum" && selected.length) {
    const maximum = Math.max(...selected.map((row) => indicatorValue(row, indicator)));
    selected = selected.filter((row) => indicatorValue(row, indicator) === maximum);
  }
  const total = selected.reduce((sum, row) => sum + indicatorValue(row, indicator), 0);
  const value = query.analysisMode === "average" && selected.length ? Math.round(total / selected.length) : total;
  const institutions = new Set(selected.map((row) => `${row.cue}::${normalizeForMatch(row.institution)}`));
  const titles = [...new Map(base.map((row) => [canonicalCareerTitle(row.title), row.title])).values()].sort();
  const years = [...new Set(base.map((row) => row.year))].sort();
  const series = years.map((year) => {
    const yearRows = base.filter((row) => row.year === year);
    return { year, entrants: yearRows.reduce((sum, row) => sum + row.entrants, 0), enrollment: yearRows.reduce((sum, row) => sum + row.enrollment, 0), graduates: yearRows.reduce((sum, row) => sum + row.graduates, 0) };
  });
  const label = indicator === "graduates" ? "Egresados" : indicator === "entrants" ? "Ingresantes" : "Matrícula";
  const groups = ["zero", "maximum"].includes(query.analysisMode ?? "") ? [{ label: query.analysisMode === "zero" ? "Sin registros" : "Mayor valor", count: selected.length, items: selected.slice(0, 20).map((row) => ({ label: row.title, detail: `${row.institution} · ${indicatorValue(row, indicator)}` })) }] : [];
  const filters = [query.year ? `Año: ${targetYear}` : `Año configurado: ${targetYear}`, query.region ? `Región: ${query.region}` : "", query.managementType ? `Gestión: ${query.managementType}` : "", department ? `Departamento: ${department}` : "", institutionName ? `Institución: ${institutionName}` : "", titleTerms.length ? `Carrera: ${titleTerms.join(" ")}` : "", query.careerType ? `Tipo de carrera: ${query.careerType}` : ""].filter(Boolean);
  return {
    referenceYear: targetYear, metrics: [{ label, value }, { label: "Ofertas", value: selected.length }, { label: "Instituciones", value: institutions.size }],
    groups, totalMatches: selected.length, truncated: groups.some((group) => group.count > group.items.length), interpretedQuery: { ...query, department, institutionName, careerTitle: titleTerms.join(" ") || query.careerTitle },
    source: "CARRERAS_DETALLE", appliedFilters: filters, includedTitles: titles, series,
    institutionIds: [...new Set(selected.map((row) => createInstitutionId(row.cue, row.institution)))],
  };
}
