import "server-only";

import { createAuthoritiesDirectory } from "@/domain/authorities-directory";
import { getAuthoritiesSummary } from "@/server/repositories/authorities-summary-repository";
import { getInstitutions } from "@/server/repositories/institutions-repository";

export async function getAuthoritiesDirectory() {
  const [master, source] = await Promise.all([getInstitutions(), getAuthoritiesSummary()]);
  const result = createAuthoritiesDirectory(master.rows, source.rows);
  if (result.unmatchedRows || result.ambiguousRows) console.warn("[SIES] Autoridades sin unión territorial segura", { sheet: "AUTORIDADES_RESUMEN", unmatchedRows: result.unmatchedRows, ambiguousRows: result.ambiguousRows });
  if (result.duplicatesAvoided) console.warn("[SIES] Autoridades duplicadas omitidas", { sheet: "AUTORIDADES_RESUMEN", duplicatesAvoided: result.duplicatesAvoided });
  return result;
}
