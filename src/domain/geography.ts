import type { InstitutionDirectoryItem } from "./institutions";

export const TUCUMAN_CENTER: [number, number] = [-26.95, -65.35];
export const TUCUMAN_BOUNDS = {
  minLatitude: -29,
  maxLatitude: -25,
  minLongitude: -67,
  maxLongitude: -64,
} as const;

export type CoordinateIssue = "missing" | "invalid" | "outside_tucuman_range";

export interface LocatedInstitution extends InstitutionDirectoryItem {
  latitude: number;
  longitude: number;
}

export interface UnlocatedInstitution extends InstitutionDirectoryItem {
  coordinateIssue: CoordinateIssue;
  rawLatitude: string;
  rawLongitude: string;
}

export type CoordinateValidation =
  | { valid: true; latitude: number; longitude: number }
  | { valid: false; issue: CoordinateIssue; rawLatitude: string; rawLongitude: string };

function parseCoordinate(value: unknown): number | null {
  const text = value === null || value === undefined ? "" : String(value).trim();
  if (!text) return null;
  const number = Number(text.replace(",", "."));
  return Number.isFinite(number) ? number : null;
}

export function validateInstitutionCoordinates(
  rawLatitude: unknown,
  rawLongitude: unknown,
): CoordinateValidation {
  const latitudeText = rawLatitude === null || rawLatitude === undefined ? "" : String(rawLatitude).trim();
  const longitudeText = rawLongitude === null || rawLongitude === undefined ? "" : String(rawLongitude).trim();
  if (!latitudeText && !longitudeText) {
    return { valid: false, issue: "missing", rawLatitude: latitudeText, rawLongitude: longitudeText };
  }

  const latitude = parseCoordinate(rawLatitude);
  const longitude = parseCoordinate(rawLongitude);
  if (latitude === null || longitude === null || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return { valid: false, issue: "invalid", rawLatitude: latitudeText, rawLongitude: longitudeText };
  }

  if (
    latitude < TUCUMAN_BOUNDS.minLatitude || latitude > TUCUMAN_BOUNDS.maxLatitude ||
    longitude < TUCUMAN_BOUNDS.minLongitude || longitude > TUCUMAN_BOUNDS.maxLongitude
  ) {
    return { valid: false, issue: "outside_tucuman_range", rawLatitude: latitudeText, rawLongitude: longitudeText };
  }

  return { valid: true, latitude, longitude };
}

