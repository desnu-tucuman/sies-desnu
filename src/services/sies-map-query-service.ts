import type { SiesConversationalQuery } from "../domain/sies-responds";

export function buildSiesMapUrl(query: SiesConversationalQuery, institutionIds: string[] = []): string {
  const params = new URLSearchParams();
  const offerMode = query.intent === "ofertas" || query.intent === "indicadores_academicos";
  if (offerMode) params.set("vista", "oferta");
  const search = query.institutionCue || query.institutionName || (offerMode ? query.careerTitle : undefined);
  if (search) params.set("search", search);
  for (const institutionId of institutionIds) params.append("institutionId", institutionId);
  if (query.managementType) params.set("management", query.managementType);
  if (!offerMode) for (const trainingType of query.trainingTypes ?? []) params.append("trainingType", trainingType);
  if (query.department) params.set("department", query.department);
  if (query.locality) params.set("locality", query.locality);
  if (query.siteType) params.set("siteType", query.siteType);
  return `/mapa${params.size ? `?${params.toString()}` : ""}`;
}
