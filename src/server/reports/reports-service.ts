import "server-only";

import { requireConsolidatedReferenceYear } from "@/domain/academic-offer";
import { filterAndSortInstitutions, type InstitutionQuery, type InstitutionView } from "@/domain/institutions";
import { getConfig } from "@/server/repositories/config-repository";
import { getInstitutionDirectory } from "@/server/services/institution-directory-service";
import { getInstitutionById } from "@/server/services/institutions-service";
import { createExcelCsv } from "./csv-export-service";
import { createInstitutionProfilePdf, createInstitutionsPdf, logPdfStage } from "./pdf-export-service";
import { appliedFilters, dateStamp, filteredFilenameSuffix, slugifyFilename } from "./report-utils";

export interface GeneratedReport {
  body: Buffer;
  contentType: string;
  filename: string;
}

export async function createInstitutionsCsvReport(query: InstitutionQuery): Promise<GeneratedReport> {
  const directory = await getInstitutionDirectory();
  const rows = filterAndSortInstitutions(directory.institutions, query);
  const csv = createExcelCsv(
    ["Nombre del establecimiento", "CUE", "CUI", "Gestión", "Localidad", "Departamento", "Tipo de sede", "Tipo de formación institucional", "Dirección", "Teléfono", "Correo electrónico", "Horario"],
    rows.map((row) => [row.name, row.cue, row.cui, row.management, row.locality, row.department, row.siteType, row.baseTrainingType, row.address, row.phone, row.email, row.schedule]),
  );
  return {
    body: Buffer.from(csv, "utf8"),
    contentType: "text/csv; charset=utf-8",
    filename: `instituciones_sies${filteredFilenameSuffix(query)}_${dateStamp()}.csv`,
  };
}

export async function createInstitutionsPdfReport(query: InstitutionQuery): Promise<GeneratedReport> {
  logPdfStage("instituciones", "inicio");
  const [directory, config] = await Promise.all([getInstitutionDirectory(), getConfig()]);
  const rows = filterAndSortInstitutions(directory.institutions, query);
  logPdfStage("instituciones", "carga de datos", { records: rows.length });
  const body = await createInstitutionsPdf(rows, {
    year: requireConsolidatedReferenceYear(config),
    filters: appliedFilters(query),
  });
  return {
    body,
    contentType: "application/pdf",
    filename: `listado_instituciones_sies${filteredFilenameSuffix(query)}_${dateStamp()}.pdf`,
  };
}

function profileCsv(institution: InstitutionView): string {
  const authorityHeaders = Array.from({ length: 4 }, (_, index) => [
    `Cargo ${index + 1}`, `Autoridad ${index + 1} - Nombre`, `Autoridad ${index + 1} - Teléfono`, `Autoridad ${index + 1} - Correo`,
  ]).flat();
  const authorityValues = Array.from({ length: 4 }, (_, index) => {
    const authority = institution.authorities.find((item) => item.position === index + 1);
    return [authority?.role ?? "", authority?.name ?? "", authority?.phone ?? "", authority?.email ?? ""];
  }).flat();
  return createExcelCsv(
    ["CUE", "CUI", "Nombre del establecimiento", "Gestión", "Tipo de sede", "Tipo de formación institucional", "Dirección", "Localidad", "Departamento", "Teléfono", "Correo electrónico", "Horario", "Cantidad de carreras", "Matrícula total", "Ingresantes", "Egresados", "Año de referencia", ...authorityHeaders, "Profesorados", "Tecnicaturas", "Otras formaciones superiores"],
    [[institution.cue, institution.cui, institution.name, institution.management, institution.siteType, institution.baseTrainingType, institution.address, institution.locality, institution.department, institution.phone, institution.email, institution.schedule, institution.offer?.totalCareers ?? "", institution.offer?.enrollment ?? "", institution.offer?.entrants ?? "", institution.offer?.graduates ?? "", institution.offer?.referenceYear ?? "", ...authorityValues, institution.offer?.teachingDegrees.join(" | ") ?? "", institution.offer?.technicalDegrees.join(" | ") ?? "", institution.offer?.otherDegrees.join(" | ") ?? ""]],
  );
}

export async function createInstitutionCsvReport(id: string): Promise<GeneratedReport | null> {
  const { institution } = await getInstitutionById(id);
  if (!institution) return null;
  return {
    body: Buffer.from(profileCsv(institution), "utf8"), contentType: "text/csv; charset=utf-8",
    filename: `ficha_institucional_${slugifyFilename(institution.name)}_${dateStamp()}.csv`,
  };
}

export async function createInstitutionPdfReport(id: string): Promise<GeneratedReport | null> {
  logPdfStage("ficha-institucional", "inicio");
  const { institution } = await getInstitutionById(id);
  logPdfStage("ficha-institucional", "carga de datos", { records: institution ? 1 : 0 });
  if (!institution) return null;
  return {
    body: await createInstitutionProfilePdf(institution), contentType: "application/pdf",
    filename: `ficha_institucional_${slugifyFilename(institution.name)}_${dateStamp()}.pdf`,
  };
}
