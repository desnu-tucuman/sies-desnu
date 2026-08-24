import type { LocatedInstitution } from "./geography";

export const MAP_CLUSTER_LAYER_OPTIONS = {
  maxClusterRadius: 48,
  showCoverageOnHover: false,
  spiderfyOnMaxZoom: false,
  zoomToBoundsOnClick: true,
} as const;

export function mapClusterLayerKey(
  institutions: Array<Pick<LocatedInstitution, "id" | "latitude" | "longitude">>,
): string {
  return institutions
    .map((institution) => `${institution.id}:${institution.latitude}:${institution.longitude}`)
    .sort()
    .join("|");
}
