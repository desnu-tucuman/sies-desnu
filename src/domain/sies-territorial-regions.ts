import { normalizeForMatch } from "./institutions";

export const REGIONES_SIES = {
  CENTRO: ["CAPITAL"],
  NORTE: ["TRANCAS", "TAFI VIEJO"],
  ESTE: ["BURRUYACU", "CRUZ ALTA", "LEALES", "SIMOCA"],
  OESTE: ["YERBA BUENA", "LULES", "TAFI DEL VALLE", "FAMAILLA"],
  SUR: ["MONTEROS", "CHICLIGASTA", "RIO CHICO", "JUAN BAUTISTA ALBERDI", "LA COCHA", "GRANEROS"],
} as const;

export type SiesRegion = keyof typeof REGIONES_SIES;

export function detectSiesRegion(text: string): SiesRegion | undefined {
  const words = new Set(normalizeForMatch(text).split(" "));
  return (Object.keys(REGIONES_SIES) as SiesRegion[]).find((region) => words.has(region));
}

export function expandSiesRegion(region?: string): string[] {
  const normalized = normalizeForMatch(region);
  const key = (Object.keys(REGIONES_SIES) as SiesRegion[]).find((item) => item === normalized);
  return key ? [...REGIONES_SIES[key]] : [];
}

export function matchesAnyDepartment(actual: string, departments?: string[]): boolean {
  return !departments?.length || departments.some((department) => normalizeForMatch(actual) === normalizeForMatch(department));
}
