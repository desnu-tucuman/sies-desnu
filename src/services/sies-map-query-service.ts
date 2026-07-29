import type { AcademicOfferItem } from "../domain/academic-offer";
import { normalizeForMatch, type InstitutionDirectoryItem } from "../domain/institutions";
import type { SiesConversationalQuery } from "../domain/sies-responds";

function mapSearchValue(query: SiesConversationalQuery): string {
  if (query.institutionName) return query.institutionName;
  const subject = query.careerTitle || query.searchTerms.join(" ");
  return [query.careerType, subject].filter(Boolean).join(" ");
}

export function buildSiesMapUrl(query: SiesConversationalQuery): string {
  const params = new URLSearchParams();
  const search = mapSearchValue(query);
  if (search) params.set("search", search);
  if (query.managementType) params.set("management", query.managementType);
  for (const trainingType of query.trainingTypes ?? []) params.append("trainingType", trainingType);
  if (query.department) params.set("department", query.department);
  if (query.locality) params.set("locality", query.locality);
  return `/mapa${params.size ? `?${params.toString()}` : ""}`;
}

function offerMatchesSearch(offer: AcademicOfferItem, search: string): boolean {
  const title = normalizeForMatch(offer.title);
  return normalizeForMatch(search).split(" ").filter(Boolean).every((term) => {
    if (term === "PROFESORADO" || term === "PROFESORADOS") return title.includes("PROFESOR");
    if (term === "TECNICATURA" || term === "TECNICATURAS") return title.includes("TECNIC");
    return title.includes(term);
  });
}

export function institutionIdsForOfferSearch(
  institutions: InstitutionDirectoryItem[],
  offers: AcademicOfferItem[],
  search: string,
): Set<string> {
  const exact = new Map(institutions.map((institution) => [
    `${institution.cue}::${normalizeForMatch(institution.name)}`,
    institution.id,
  ]));
  const byCue = new Map<string, InstitutionDirectoryItem[]>();
  for (const institution of institutions) {
    byCue.set(institution.cue, [...(byCue.get(institution.cue) ?? []), institution]);
  }

  const ids = new Set<string>();
  for (const offer of offers) {
    if (!offerMatchesSearch(offer, search)) continue;
    const exactId = exact.get(`${offer.cue}::${normalizeForMatch(offer.institution)}`);
    if (exactId) {
      ids.add(exactId);
      continue;
    }
    const cueMatches = byCue.get(offer.cue) ?? [];
    if (cueMatches.length === 1) ids.add(cueMatches[0].id);
  }
  return ids;
}
