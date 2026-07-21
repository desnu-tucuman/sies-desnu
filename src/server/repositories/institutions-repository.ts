import "server-only";

import { readSheetTable } from "@/server/sheets/sheets-client";

export const INSTITUTIONS_SHEET = "MAESTRA_INSTITUCIONES";

export const INSTITUTIONS_HEADERS = [
  "cue_anexo", "cui", "nombre_establecimiento", "gestion",
  "tipo_formacion_base", "tipo_sede", "ambito", "direccion",
  "localidad", "departamento", "telefono", "email_institucional",
  "sitio_web", "internet", "turno", "horario", "estado_edificio",
  "comparte_edificio_con", "radio_socioeducativa", "consejo_consultivo",
  "fecha_creacion", "instrumento_creacion", "ubicacion_google_maps",
  "latitud_sede", "longitud_sede", "observaciones",
] as const;

export function getInstitutions() {
  return readSheetTable(INSTITUTIONS_SHEET, INSTITUTIONS_HEADERS);
}

