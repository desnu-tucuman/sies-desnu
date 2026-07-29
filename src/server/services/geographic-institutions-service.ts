import "server-only";

import { validateInstitutionCoordinates, type LocatedInstitution, type UnlocatedInstitution } from "@/domain/geography";
import { createInstitutionDirectoryRows, filterAndSortInstitutions, queryInstitutions, type InstitutionQuery } from "@/domain/institutions";
import { getInstitutions } from "@/server/repositories/institutions-repository";
import { getAcademicOfferDataset } from "@/server/services/academic-offer-service";
import { institutionIdsForOfferSearch } from "@/services/sies-map-query-service";

export async function getGeographicInstitutions(query: InstitutionQuery) {
  const master = await getInstitutions();
  const directory = createInstitutionDirectoryRows(master.rows);
  const baseQuery = { ...query, search: undefined };
  const baseDirectory = filterAndSortInstitutions(directory, baseQuery);
  const institutionalMatches = new Set(filterAndSortInstitutions(directory, query).map((institution) => institution.id));
  let academicMatches = new Set<string>();
  if (query.search) {
    const academicDataset = await getAcademicOfferDataset();
    academicMatches = institutionIdsForOfferSearch(directory, academicDataset.offers, query.search);
  }
  const searchMatches = academicMatches.size ? academicMatches : institutionalMatches;
  const filteredDirectory = query.search
    ? baseDirectory.filter((institution) => searchMatches.has(institution.id))
    : baseDirectory;
  const selectedIds = new Set(filteredDirectory.map((institution) => institution.id));
  const located: LocatedInstitution[] = [];
  const unlocated: UnlocatedInstitution[] = [];

  master.rows.forEach((row, index) => {
    const institution = directory[index];
    if (!selectedIds.has(institution.id)) return;
    const validation = validateInstitutionCoordinates(row.latitud_sede, row.longitud_sede);
    if (validation.valid) {
      located.push({ ...institution, latitude: validation.latitude, longitude: validation.longitude });
      return;
    }

    const record = {
      ...institution,
      coordinateIssue: validation.issue,
      rawLatitude: validation.rawLatitude,
      rawLongitude: validation.rawLongitude,
    } satisfies UnlocatedInstitution;
    unlocated.push(record);

    if (validation.issue !== "missing") {
      console.warn("[SIES] Coordenadas institucionales no utilizables", {
        sheet: "MAESTRA_INSTITUCIONES",
        rowIdentifier: row.cue_anexo || `fila-${index + 2}`,
        rowNumber: index + 2,
        institution: row.nombre_establecimiento,
        latitude: validation.rawLatitude,
        longitude: validation.rawLongitude,
        reason: validation.issue,
      });
    }
  });

  return {
    total: filteredDirectory.length,
    located,
    unlocated,
    anomalies: unlocated.filter((institution) => institution.coordinateIssue === "outside_tucuman_range"),
    invalidCoordinates: unlocated.filter((institution) => institution.coordinateIssue === "invalid"),
    filters: queryInstitutions(directory, { pageSize: 5 }).filters,
  };
}
