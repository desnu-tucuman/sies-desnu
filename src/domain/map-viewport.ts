export type MapViewportStrategy =
  | { kind: "empty"; zoom: number }
  | { kind: "single"; zoom: number }
  | { kind: "bounds"; minZoom: number; maxZoom: number; padding: [number, number] };

export interface GeographicResultCoordinates { latitude: number; longitude: number }

export interface GeographicResultsBounds {
  south: number;
  west: number;
  north: number;
  east: number;
  centerLatitude: number;
  centerLongitude: number;
}

export function getBoundsForGeographicResults(results: GeographicResultCoordinates[]): GeographicResultsBounds | null {
  if (!results.length) return null;
  const latitudes = results.map((result) => result.latitude);
  const longitudes = results.map((result) => result.longitude);
  const south = Math.min(...latitudes); const north = Math.max(...latitudes);
  const west = Math.min(...longitudes); const east = Math.max(...longitudes);
  return {
    south, west, north, east,
    centerLatitude: (south + north) / 2,
    centerLongitude: (west + east) / 2,
  };
}

export function getMapViewportStrategy(pointCount: number, compact = false): MapViewportStrategy {
  if (pointCount <= 0) return { kind: "empty", zoom: 8 };
  if (pointCount === 1) return { kind: "single", zoom: 15 };

  return {
    kind: "bounds",
    minZoom: 7,
    maxZoom: pointCount <= 5 ? 14 : 12,
    padding: compact ? [24, 24] : [30, 30],
  };
}
