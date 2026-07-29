import "server-only";

import { validateInstitutionCoordinates, type LocatedInstitution, type UnlocatedInstitution } from "@/domain/geography";
import { createInstitutionDirectoryRows, filterAndSortInstitutions, queryInstitutions, type InstitutionQuery } from "@/domain/institutions";
import { getInstitutions } from "@/server/repositories/institutions-repository";

export async function getGeographicInstitutions(query: InstitutionQuery) {
  const master = await getInstitutions();
  const directory = createInstitutionDirectoryRows(master.rows);
  const filteredDirectory = filterAndSortInstitutions(directory, query);
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
