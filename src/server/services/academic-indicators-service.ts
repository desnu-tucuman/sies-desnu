import "server-only";

import { createAcademicIndicatorRows } from "@/domain/academic-indicators";
import { requireConsolidatedReferenceYear } from "@/domain/academic-offer";
import { getCareersDetail } from "@/server/repositories/careers-detail-repository";
import { getConfig } from "@/server/repositories/config-repository";

export async function getAcademicIndicatorDataset() {
  const config = await getConfig();
  const referenceYear = requireConsolidatedReferenceYear(config);
  const careers = await getCareersDetail();
  return { referenceYear, rows: createAcademicIndicatorRows(careers.rows, referenceYear) };
}
