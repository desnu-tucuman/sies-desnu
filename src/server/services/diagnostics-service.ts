import "server-only";

import { getAuthoritiesSummary } from "@/server/repositories/authorities-summary-repository";
import { getCareersSummary } from "@/server/repositories/careers-summary-repository";
import { getConfig } from "@/server/repositories/config-repository";
import { getInstitutions } from "@/server/repositories/institutions-repository";

export interface SheetsDiagnostics {
  connected: true;
  currentYear: string;
  counts: {
    institutions: number;
    careersSummary: number;
    authoritiesSummary: number;
  };
}

export async function getSheetsDiagnostics(): Promise<SheetsDiagnostics> {
  const [config, institutions, careersSummary, authoritiesSummary] =
    await Promise.all([
      getConfig(),
      getInstitutions(),
      getCareersSummary(),
      getAuthoritiesSummary(),
    ]);

  const currentYear = config.get("CICLO_VIGENTE") ?? config.get("ANIO_ACTUAL");
  if (!currentYear) {
    throw new Error(
      'La hoja "CONFIG" no contiene los parámetros CICLO_VIGENTE ni ANIO_ACTUAL.',
    );
  }

  return {
    connected: true,
    currentYear,
    counts: {
      institutions: institutions.rows.length,
      careersSummary: careersSummary.rows.length,
      authoritiesSummary: authoritiesSummary.rows.length,
    },
  };
}

