import "server-only";

import { normalizeForMatch, safeText } from "@/domain/institutions";
import type { SiesConversationalResult, SiesRespondsAction, SiesRespondsQuery, SiesRespondsResponse } from "@/domain/sies-responds";
import { getAcademicOfferDataset } from "@/server/services/academic-offer-service";
import { getAuthoritiesDirectory } from "@/server/services/authorities-directory-service";
import { getInstitutionDirectory } from "@/server/services/institution-directory-service";
import { interpretSiesConversationalQuery } from "@/services/sies-conversational-query-interpreter";
import { resolveAuthorityConversation, resolveInstitutionConversation, resolveOfferConversation } from "@/services/sies-conversational-result-service";
import { buildSiesMapUrl } from "@/services/sies-map-query-service";
import { routeSiesRespondsQuery } from "@/services/sies-responds-router-service";

function action(label: string, href: string, intent: SiesRespondsAction["intent"]): SiesRespondsAction { return { label, href, intent }; }

function metric(result: SiesConversationalResult, label: string): number {
  return result.metrics.find((item) => item.label === label)?.value ?? 0;
}

function noun(value: number, singular: string, plural: string): string { return value === 1 ? singular : plural; }

function offerActions(result: SiesConversationalResult): SiesRespondsAction[] {
  const query = result.interpretedQuery;
  const params = new URLSearchParams();
  if (query.careerTitle) params.set("search", query.careerTitle);
  if (query.managementType) params.set("management", query.managementType);
  if (query.department) params.set("department", query.department);
  if (query.locality) params.set("locality", query.locality);
  return [action("Ampliar en Ofertas", `/ofertas${params.size ? `?${params}` : ""}`, "offers"), action("Ver instituciones", "/instituciones", "institutions"), action("Consultar el mapa", buildSiesMapUrl(query), "map")];
}

function responseWithResult(intent: SiesRespondsResponse["intent"], text: string, result: SiesConversationalResult, actions: SiesRespondsAction[]): SiesRespondsResponse {
  return { intent, text, result, actions };
}

export async function answerSiesRespondsQuery(input: SiesRespondsQuery): Promise<SiesRespondsResponse> {
  const text = safeText(input.text).slice(0, 500);
  const structured = interpretSiesConversationalQuery(text);
  const trace = (details: Record<string, unknown>) => console.info("[SIES Responde]", {
    originalQuery: text,
    normalizedQuery: normalizeForMatch(text),
    parsedQuery: structured,
    ...details,
  });
  trace({ stage: "interpreted", fallbackReason: null });
  try {
    if (structured.intent === "ofertas") {
      const dataset = await getAcademicOfferDataset();
      const result = resolveOfferConversation(text, structured, dataset.offers, dataset.referenceYear);
      trace({ stage: "data-filtered", source: "CARRERAS_DETALLE", sourceOffersCount: dataset.offers.length, filteredResultsCount: result.totalMatches, filters: result.interpretedQuery, fallbackReason: null });
      const summary = result.totalMatches
        ? `Encontré ${metric(result, "Ofertas")} ofertas en ${metric(result, "Instituciones")} instituciones y ${metric(result, "Departamentos")} departamentos para el año de referencia ${dataset.referenceYear}.`
        : `No encontré ofertas que coincidan con la consulta en los datos consolidados de ${dataset.referenceYear}. Puedes ampliar o reformular los términos.`;
      return responseWithResult("offers", summary, result, offerActions(result));
    }
    if (structured.intent === "instituciones" || structured.intent === "territorio") {
      const directory = await getInstitutionDirectory();
      const result = resolveInstitutionConversation(text, structured, directory.institutions);
      trace({ stage: "data-filtered", source: "MAESTRA_INSTITUCIONES", sourceInstitutionsCount: directory.institutions.length, filteredResultsCount: result.totalMatches, filters: result.interpretedQuery, fallbackReason: null });
      const summary = result.totalMatches
        ? `Encontré ${metric(result, "Instituciones")} instituciones en ${metric(result, "Departamentos")} departamentos y ${metric(result, "Localidades")} localidades.`
        : "No encontré instituciones que coincidan con todos los términos indicados. Puedes ampliar o reformular la consulta.";
      const isMap = structured.intent === "territorio";
      const mapUrl = buildSiesMapUrl(result.interpretedQuery);
      const actions = isMap
        ? [action("Abrir resultados en el mapa", mapUrl, "map"), action("Ver instituciones", "/instituciones", "institutions")]
        : [action("Ampliar en Instituciones", "/instituciones", "institutions"), action("Consultar el mapa", mapUrl, "map")];
      return responseWithResult(isMap ? "map" : "institutions", summary, result, actions);
    }
    if (structured.intent === "autoridades") {
      const directory = await getAuthoritiesDirectory();
      const result = resolveAuthorityConversation(text, structured, directory.authorities);
      trace({ stage: "data-filtered", source: "AUTORIDADES_RESUMEN", sourceAuthoritiesCount: directory.authorities.length, filteredResultsCount: result.totalMatches, filters: result.interpretedQuery, fallbackReason: null });
      const authorityCount = metric(result, "Autoridades"); const institutionCount = metric(result, "Instituciones");
      const summary = result.totalMatches
        ? `Encontré ${authorityCount} ${noun(authorityCount, "autoridad", "autoridades")} correspondiente${authorityCount === 1 ? "" : "s"} a ${institutionCount} ${noun(institutionCount, "institución", "instituciones")}.`
        : "No encontré autoridades que coincidan con todos los términos indicados. Puedes reformular el nombre o consultar el directorio completo.";
      return responseWithResult("authorities", summary, result, [action("Ampliar en Autoridades", "/autoridades", "authorities"), action("Ver instituciones", "/instituciones", "institutions")]);
    }
    trace({ stage: "fallback", fallbackReason: `unsupported-intent:${structured.intent}` });
    return routeSiesRespondsQuery({ text, context: input.context });
  } catch (error) {
    console.error("[SIES Responde]", { originalQuery: text, normalizedQuery: normalizeForMatch(text), parsedQuery: structured, stage: "fallback", fallbackReason: "structured-query-error", error: error instanceof Error ? { name: error.name } : { name: "UnknownError" } });
    const fallback = routeSiesRespondsQuery({ text, context: input.context });
    return { ...fallback, text: `No pude consultar los datos en este momento. ${fallback.text}` };
  }
}
