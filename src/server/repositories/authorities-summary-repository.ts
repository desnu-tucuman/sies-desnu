import "server-only";

import { readSheetTable } from "@/server/sheets/sheets-client";

export const AUTHORITIES_SUMMARY_SHEET = "AUTORIDADES_RESUMEN";

export const AUTHORITIES_SUMMARY_HEADERS = [
  "cue_anexo", "nombre_establecimiento", "cargo_1", "autoridad_1_nombre",
  "autoridad_1_telefono", "autoridad_1_mail", "cargo_2",
  "autoridad_2_nombre", "autoridad_2_telefono", "autoridad_2_mail", "cargo_3",
  "autoridad_3_nombre", "autoridad_3_telefono", "autoridad_3_mail", "cargo_4",
  "autoridad_4_nombre", "autoridad_4_telefono", "autoridad_4_mail",
  "cantidad_autoridades", "autoridades_texto", "estado_autoridad",
  "ultima_actualizacion",
] as const;

export function getAuthoritiesSummary() {
  return readSheetTable(AUTHORITIES_SUMMARY_SHEET, AUTHORITIES_SUMMARY_HEADERS);
}

