import type { InstitutionQuery } from "@/domain/institutions";

const FILTER_LABELS: Array<[keyof InstitutionQuery, string]> = [
  ["search", "Búsqueda"], ["management", "Gestión"], ["department", "Departamento"],
  ["locality", "Localidad"], ["siteType", "Tipo de sede"],
  ["trainingType", "Tipo de formación institucional"],
];

export function reportDate(date = new Date()): string {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "long", timeZone: "America/Argentina/Tucuman" }).format(date);
}

export function dateStamp(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Tucuman" }).format(date);
}

export function slugifyFilename(value: string, fallback = "institucion"): string {
  const slug = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 70);
  return slug || fallback;
}

export function appliedFilters(query: InstitutionQuery): string[] {
  const visible = FILTER_LABELS.flatMap(([key, label]) => {
    const value = query[key];
    if (Array.isArray(value)) return value.length ? [`${label}: ${value.join(", ")}`] : [];
    return typeof value === "string" && value.trim() ? [`${label}: ${value.trim()}`] : [];
  });
  return query.institutionId?.length ? [...visible, `Instituciones seleccionadas: ${query.institutionId.length}`] : visible;
}

export function filteredFilenameSuffix(query: InstitutionQuery): string {
  const values = [query.management, query.department, query.locality, query.siteType, ...(query.trainingType ?? [])]
    .filter((value): value is string => Boolean(value?.trim())).slice(0, 2);
  return values.length ? `_${slugifyFilename(values.join("_"), "filtro")}` : "";
}
