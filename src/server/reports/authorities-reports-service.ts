import "server-only";

import { filterAndSortAuthorities, type AuthorityDirectoryQuery } from "@/domain/authorities-directory";
import { getAuthoritiesDirectory } from "@/server/services/authorities-directory-service";
import { createExcelCsv } from "./csv-export-service";
import { createAuthoritiesDirectoryPdf } from "./pdf-export-service";
import { dateStamp, slugifyFilename } from "./report-utils";
import type { GeneratedReport } from "./reports-service";

const FILTERS: Array<[keyof AuthorityDirectoryQuery, string]> = [
  ["search", "Autoridad"], ["institution", "Institución o CUE"], ["role", "Cargo"], ["management", "Gestión"],
  ["department", "Departamento"], ["locality", "Localidad"], ["siteType", "Tipo de sede"], ["status", "Estado"],
];
function appliedFilters(query: AuthorityDirectoryQuery): string[] {
  return FILTERS.flatMap(([key, label]) => { const item = query[key]; return typeof item === "string" && item.trim() ? [`${label}: ${item.trim()}`] : []; });
}
function filenameSuffix(query: AuthorityDirectoryQuery): string {
  const values = [query.role, query.management, query.department].filter(Boolean).slice(0, 2);
  return values.length ? `_${slugifyFilename(values.join("_"), "filtro")}` : "";
}

export async function createAuthoritiesCsvReport(query: AuthorityDirectoryQuery): Promise<GeneratedReport> {
  const directory = await getAuthoritiesDirectory(); const rows = filterAndSortAuthorities(directory.authorities, query);
  const csv = createExcelCsv(
    ["cargo", "apellido_y_nombre", "institucion", "cue_anexo", "gestion", "tipo_sede", "localidad", "departamento", "telefono", "correo_electronico", "estado_autoridad", "ultima_actualizacion"],
    rows.map((row) => [row.role, row.name, row.institution, row.cue, row.management, row.siteType, row.locality, row.department, row.phone, row.email, row.status, row.lastUpdated]),
  );
  return { body: Buffer.from(csv, "utf8"), contentType: "text/csv; charset=utf-8", filename: `directorio_autoridades_sies${filenameSuffix(query)}_${dateStamp()}.csv` };
}

export async function createAuthoritiesPdfReport(query: AuthorityDirectoryQuery): Promise<GeneratedReport> {
  const directory = await getAuthoritiesDirectory(); const rows = filterAndSortAuthorities(directory.authorities, query);
  return { body: await createAuthoritiesDirectoryPdf(rows, { filters: appliedFilters(query) }), contentType: "application/pdf", filename: `directorio_autoridades_sies${filenameSuffix(query)}_${dateStamp()}.pdf` };
}
