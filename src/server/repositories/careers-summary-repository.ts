import "server-only";

import { readSheetTable } from "@/server/sheets/sheets-client";

export const CAREERS_SUMMARY_SHEET = "CARRERAS_RESUMEN";

export const CAREERS_SUMMARY_HEADERS = [
  "cue_anexo", "cui", "nombre_establecimiento", "nombre_sede_oferta",
  "tipo_espacio_oferta", "gestion", "localidad_oferta",
  "departamento_oferta", "latitud_oferta", "longitud_oferta",
  "cantidad_carreras", "cantidad_profesorados", "cantidad_tecnicaturas",
  "cantidad_otras_formaciones", "carreras", "profesorados", "tecnicaturas",
  "otras_formaciones", "tiene_profesorados", "tiene_tecnicaturas",
  "tiene_otras_formaciones", "tipo_oferta_resumen", "matricula_total",
  "ingresantes", "egresados", "anio_referencia",
] as const;

export function getCareersSummary() {
  return readSheetTable(CAREERS_SUMMARY_SHEET, CAREERS_SUMMARY_HEADERS);
}

