import "server-only";

import { readSheetTable } from "@/server/sheets/sheets-client";

export const CAREERS_DETAIL_SHEET = "CARRERAS_DETALLE";
export const CAREERS_DETAIL_HEADERS = [
  "cue_anexo", "cui", "nombre_establecimiento", "titulo", "tipo_carrera",
  "tipo_formacion", "estado_carrera", "anio_columna", "matricula_total",
  "ingresantes", "egresados", "nombre_sede_oferta", "tipo_espacio_oferta",
  "localidad_oferta", "departamento_oferta", "latitud_oferta", "longitud_oferta",
  "observaciones", "oferta_vigente", "gestion",
] as const;

export function getCareersDetail() {
  return readSheetTable(CAREERS_DETAIL_SHEET, CAREERS_DETAIL_HEADERS);
}
