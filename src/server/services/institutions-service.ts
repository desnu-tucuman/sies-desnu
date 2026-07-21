import "server-only";

import { requireConsolidatedReferenceYear } from "@/domain/academic-offer";
import { joinInstitutionSources, type InstitutionDataset } from "@/domain/institutions";
import { getAuthoritiesSummary } from "@/server/repositories/authorities-summary-repository";
import { getCareersSummary } from "@/server/repositories/careers-summary-repository";
import { getConfig } from "@/server/repositories/config-repository";
import { getInstitutions } from "@/server/repositories/institutions-repository";
import type { SheetRow } from "@/server/sheets/types";

interface FieldCheck {
  sheet: string;
  rows: SheetRow[];
  fields: string[];
}

function logIncompleteRows(checks: FieldCheck[]): number {
  let affectedRows = 0;
  for (const check of checks) {
    check.rows.forEach((row, index) => {
      const missingFields = check.fields.filter((field) => !row[field]?.trim());
      if (!missingFields.length) return;
      affectedRows += 1;
      console.warn("[SIES] Fila con campos esperados vacíos", {
        sheet: check.sheet,
        rowIdentifier: row.cue_anexo || `fila-${index + 2}`,
        rowNumber: index + 2,
        missingFields,
      });
    });
  }
  if (affectedRows) console.warn(`[SIES] Total de filas incompletas revisadas: ${affectedRows}`);
  return affectedRows;
}

export async function getInstitutionDataset(): Promise<InstitutionDataset> {
  const [config, master, careers, authorities] = await Promise.all([
    getConfig(), getInstitutions(), getCareersSummary(), getAuthoritiesSummary(),
  ]);
  const referenceYear = requireConsolidatedReferenceYear(config);
  logIncompleteRows([
    { sheet: "MAESTRA_INSTITUCIONES", rows: master.rows, fields: ["nombre_establecimiento", "departamento", "localidad", "gestion", "tipo_sede"] },
    { sheet: "CARRERAS_RESUMEN", rows: careers.rows, fields: ["nombre_establecimiento", "nombre_sede_oferta", "departamento_oferta", "localidad_oferta", "gestion", "tipo_espacio_oferta"] },
    { sheet: "AUTORIDADES_RESUMEN", rows: authorities.rows, fields: ["nombre_establecimiento"] },
  ]);
  const dataset = joinInstitutionSources(master.rows, careers.rows, authorities.rows, referenceYear);

  if (dataset.issues.length) {
    console.warn("[SIES] Casos sin coincidencia entre fuentes", dataset.issues);
  }
  return dataset;
}

export async function getInstitutionById(id: string) {
  const dataset = await getInstitutionDataset();
  return { institution: dataset.institutions.find((item) => item.id === id) ?? null, dataset };
}
