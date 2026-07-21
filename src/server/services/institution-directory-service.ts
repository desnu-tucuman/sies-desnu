import "server-only";

import { createInstitutionDirectoryRows } from "@/domain/institutions";
import { getInstitutions } from "@/server/repositories/institutions-repository";

const INSTITUTIONAL_FIELDS = [
  "cue_anexo", "nombre_establecimiento", "gestion", "departamento",
  "localidad", "tipo_sede", "tipo_formacion_base",
] as const;

export async function getInstitutionDirectory() {
  const master = await getInstitutions();
  let incompleteRows = 0;

  master.rows.forEach((row, index) => {
    const missingFields = INSTITUTIONAL_FIELDS.filter((field) => !row[field]?.trim());
    if (!missingFields.length) return;
    incompleteRows += 1;
    console.warn("[SIES] Fila institucional incompleta", {
      sheet: "MAESTRA_INSTITUCIONES",
      rowIdentifier: row.cue_anexo || `fila-${index + 2}`,
      rowNumber: index + 2,
      missingFields,
    });
  });

  if (incompleteRows) {
    console.warn(`[SIES] MAESTRA_INSTITUCIONES: ${incompleteRows} filas institucionales incompletas`);
  }

  return {
    institutions: createInstitutionDirectoryRows(master.rows),
    incompleteRows,
  };
}

