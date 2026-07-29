import { normalizeForMatch, safeText } from "../domain/institutions";
import type { SiesConversationalQuery } from "../domain/sies-responds";
import { detectSiesRegion, expandSiesRegion } from "../domain/sies-territorial-regions";

const STOP_WORDS = new Set([
  "A", "AL", "ALGUN", "ALGUNA", "ALGUNOS", "CON", "CUAL", "CUALES", "DE", "DEL", "DONDE", "EL", "EN", "ESTA", "ESTAN",
  "HAY", "LA", "LAS", "LOS", "ME", "QUE", "QUIEN", "QUIENES", "SE", "SON", "UN", "UNA", "VER", "QUIERO",
  "CARRERA", "CARRERAS", "OFERTA", "OFERTAS", "DICTA", "DICTAN", "PROFESORADO", "PROFESORADOS", "TECNICATURA", "TECNICATURAS",
  "INSTITUCION", "INSTITUCIONES", "INSTITUTO", "INSTITUTOS", "SEDE", "SEDES", "AUTORIDAD", "AUTORIDADES", "DIRECTOR", "DIRECTORA",
  "RECTOR", "RECTORA", "DIRIGE", "IES", "FORMACION", "SUR", "NORTE", "ESTE", "OESTE", "CENTRO", "TUCUMAN", "DEPARTAMENTO", "DEPARTAMENTOS", "LOCALIDAD", "LOCALIDADES", "CANTIDAD", "CUANTOS", "CUANTAS",
  "EGRESADO", "EGRESADOS", "INGRESANTE", "INGRESANTES", "MATRICULA", "EVOLUCION", "CRECIMIENTO", "DISMINUCION", "TOTAL", "PROMEDIO", "HUBO", "TUVO", "TUVIERON", "REGISTRARON", "NO", "SIN", "CERO", "MAS", "MAYOR", "PERIODO",
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
  const academicIndicator = has("EGRESADO", "EGRESADOS") ? "graduates" as const : has("INGRESANTE", "INGRESANTES") ? "entrants" as const : has("MATRICULA") ? "enrollment" as const : undefined;
  const intent = academicIndicator || has("EVOLUCION", "CRECIMIENTO", "DISMINUCION") ? "indicadores_academicos"
    : has("AUTORIDAD", "DIRECTOR", "DIRECTORA", "RECTOR", "RECTORA", "DIRIGE", "TELEFONO", "CORREO") ? "autoridades"
    : has("CARRERA", "PROFESORADO", "TECNICATURA", "OFERTA", "TITULO", "SE DICTA", "DICTAN") ? "ofertas"
      : has("MAPA", "UBICACION", "CERCA", "DIRECCION") ? "territorio"
        : has("LISTADO", "PDF", "CSV", "DESCARGAR", "EXPORTAR") ? "listados"
          : has("INSTITUTO", "INSTITUCION", "ESTABLECIMIENTO", "SEDE", "ANEXO", "EXTENSION AULICA") ? "instituciones"
            : "unknown";
  const managementType = has("PRIVADA", "PRIVADO") ? "PRIVADA" as const : has("ESTATAL", "PUBLICA", "PUBLICO") ? "ESTATAL" as const : undefined;
  const managementWords = new Set(["ESTATAL", "ESTATALES", "PUBLICA", "PUBLICAS", "PUBLICO", "PUBLICOS", "PRIVADA", "PRIVADAS", "PRIVADO", "PRIVADOS"]);
  const year = normalized.match(/\b(19|20)\d{2}\b/)?.[0];
  const region = detectSiesRegion(normalized);
  const searchTerms = terms(normalized).filter((term) => !managementWords.has(term) && term !== year);
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
    academicIndicator,
    year,
    region,
    departments: expandSiesRegion(region),
    analysisMode: has("EVOLUCION", "CRECIMIENTO", "DISMINUCION") ? "evolution" : has("PROMEDIO") ? "average" : has("MAS ", "MAYOR") ? "maximum" : has("CERO", "NO REGISTRARON", "SIN EGRESADOS", "SIN INGRESANTES") ? "zero" : "total",
  };
}
