import { normalizeForMatch, safeText } from "../domain/institutions";
import type { SiesConversationalQuery } from "../domain/sies-responds";

const STOP_WORDS = new Set([
  "A", "AL", "ALGUN", "ALGUNA", "ALGUNOS", "CON", "CUAL", "CUALES", "DE", "DEL", "DONDE", "EL", "EN", "ESTA", "ESTAN",
  "HAY", "LA", "LAS", "LOS", "ME", "QUE", "QUIEN", "QUIENES", "SE", "SON", "UN", "UNA", "VER", "QUIERO",
  "CARRERA", "CARRERAS", "OFERTA", "OFERTAS", "DICTA", "DICTAN", "PROFESORADO", "PROFESORADOS", "TECNICATURA", "TECNICATURAS",
  "INSTITUCION", "INSTITUCIONES", "INSTITUTO", "INSTITUTOS", "SEDE", "SEDES", "AUTORIDAD", "AUTORIDADES", "DIRECTOR", "DIRECTORA",
  "RECTOR", "RECTORA", "DIRIGE", "IES", "FORMACION", "SUR", "TUCUMAN", "DEPARTAMENTO", "DEPARTAMENTOS", "LOCALIDAD", "LOCALIDADES", "CANTIDAD", "CUANTOS", "CUANTAS",
]);

function terms(normalized: string): string[] {
  return [...new Set(normalized.split(" ").filter((term) => term.length > 2 && !STOP_WORDS.has(term)))];
}

export function interpretSiesConversationalQuery(text: string): SiesConversationalQuery {
  const original = safeText(text);
  const normalized = normalizeForMatch(original);
  const has = (...values: string[]) => values.some((value) => normalized.includes(value));
  const careerType = has("PROFESORADO", "PROFESORADOS") ? "PROFESORADO" as const
    : has("TECNICATURA", "TECNICATURAS") ? "TECNICATURA" as const : undefined;
  const intent = has("AUTORIDAD", "DIRECTOR", "DIRECTORA", "RECTOR", "RECTORA", "DIRIGE", "TELEFONO", "CORREO") ? "autoridades"
    : has("CARRERA", "PROFESORADO", "TECNICATURA", "OFERTA", "TITULO", "SE DICTA", "DICTAN") ? "ofertas"
      : has("MAPA", "UBICACION", "CERCA", "DIRECCION") ? "territorio"
        : has("LISTADO", "PDF", "CSV", "DESCARGAR", "EXPORTAR") ? "listados"
          : has("INSTITUTO", "INSTITUCION", "ESTABLECIMIENTO", "SEDE", "ANEXO", "EXTENSION AULICA") ? "instituciones"
            : "unknown";
  const managementType = has("PRIVADA", "PRIVADO") ? "PRIVADA" as const : has("ESTATAL", "PUBLICA", "PUBLICO") ? "ESTATAL" as const : undefined;
  const managementWords = new Set(["ESTATAL", "ESTATALES", "PUBLICA", "PUBLICAS", "PUBLICO", "PUBLICOS", "PRIVADA", "PRIVADAS", "PRIVADO", "PRIVADOS"]);
  const searchTerms = terms(normalized).filter((term) => !managementWords.has(term));
  if (/(^| )IES( |$)/.test(normalized)) searchTerms.unshift("ENSENANZA", "SUPERIOR");
  return {
    intent,
    searchTerms,
    careerType,
    careerTitle: intent === "ofertas" && searchTerms.length ? searchTerms.join(" ") : undefined,
    institutionName: intent === "autoridades" && searchTerms.length ? searchTerms.join(" ") : undefined,
    managementType,
    trainingTypes: has("FORMACION DOCENTE") ? ["DOCENTE", "MIXTA"] : has("FORMACION TECNICA") ? ["TÉCNICA", "MIXTA"] : undefined,
    requestedGrouping: has("DEPARTAMENTO", "DEPARTAMENTOS") ? "department" : has("LOCALIDAD", "LOCALIDADES") ? "locality" : has("INSTITUCION", "INSTITUCIONES", "INSTITUTO", "INSTITUTOS") ? "institution" : undefined,
    requestedMetric: has("CUANTOS", "CUANTAS", "CANTIDAD", "EN QUE") ? "count" : undefined,
  };
}
