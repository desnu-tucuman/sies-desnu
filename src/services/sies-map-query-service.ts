import type { SiesConversationalQuery } from "../domain/sies-responds";

export function buildSiesMapUrl(query: SiesConversationalQuery): string {
  const params = new URLSearchParams();
  const search = query.institutionCue || query.institutionName;
  if (search) params.set("search", search);
  if (query.managementType) params.set("management", query.managementType);
  for (const trainingType of query.trainingTypes ?? []) params.append("trainingType", trainingType);
  if (query.department) params.set("department", query.department);
  if (query.locality) params.set("locality", query.locality);
  if (query.siteType) params.set("siteType", query.siteType);
  return `/mapa${params.size ? `?${params.toString()}` : ""}`;
}
