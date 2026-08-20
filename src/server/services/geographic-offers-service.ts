import "server-only";

import { createGeographicOfferRows, filterGeographicOffers, geographicOfferFilters, type GeographicOfferQuery } from "@/domain/geographic-offers";
import { validateInstitutionCoordinates, type LocatedInstitution, type UnlocatedInstitution } from "@/domain/geography";
import { getCareersSummary } from "@/server/repositories/careers-summary-repository";

export async function getGeographicOffers(query: GeographicOfferQuery) {
  const source = await getCareersSummary();
  const all = createGeographicOfferRows(source.rows, query.search);
  const filtered = filterGeographicOffers(all, query);
  const located: LocatedInstitution[] = [];
  const unlocated: UnlocatedInstitution[] = [];

  filtered.forEach((offer, index) => {
    const validation = validateInstitutionCoordinates(offer.rawLatitude, offer.rawLongitude);
    if (validation.valid) {
      located.push({ ...offer, latitude: validation.latitude, longitude: validation.longitude });
      return;
    }
    unlocated.push({ ...offer, coordinateIssue: validation.issue, rawLatitude: validation.rawLatitude, rawLongitude: validation.rawLongitude });
    if (validation.issue !== "missing") console.warn("[SIES] Coordenadas de oferta no utilizables", {
      sheet: "CARRERAS_RESUMEN", rowIdentifier: offer.cue || `fila-${index + 2}`, offerUnit: offer.name,
      latitude: validation.rawLatitude, longitude: validation.rawLongitude, reason: validation.issue,
    });
  });

  return {
    total: filtered.length, located, unlocated,
    anomalies: unlocated.filter((row) => row.coordinateIssue === "outside_tucuman_range"),
    invalidCoordinates: unlocated.filter((row) => row.coordinateIssue === "invalid"),
    filters: geographicOfferFilters(all),
  };
}
