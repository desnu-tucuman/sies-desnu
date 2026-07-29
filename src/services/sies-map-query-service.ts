import type { SiesConversationalQuery } from "../domain/sies-responds";

export function buildSiesMapUrl(query: SiesConversationalQuery, institutionIds: string[] = []): string {
  const params = new URLSearchParams();
  const search = query.institutionCue || query.institutionName;
  if (search) params.set("search", search);
  for (const institutionId of institutionIds) params.append("institutionId", institutionId);
  if (query.managementType) params.set("management", query.managementType);
  for (const trainingType of query.trainingTypes ?? []) params.append("trainingType", trainingType);
  if (query.department) params.set("department", query.department);
  if (query.locality) params.set("locality", query.locality);
  if (query.siteType) params.set("siteType", query.siteType);
  return `/mapa${params.size ? `?${params.toString()}` : ""}`;
}
