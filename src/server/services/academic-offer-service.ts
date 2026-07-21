import "server-only";

import {
  consolidatedDataCaption,
  createAcademicOfferRows,
  filterCareersByConsolidatedYear,
  requireConsolidatedAcademicRows,
  requireConsolidatedReferenceYear,
} from "@/domain/academic-offer";
import { getCareersDetail } from "@/server/repositories/careers-detail-repository";
import { getConfig } from "@/server/repositories/config-repository";

export async function getAcademicOfferDataset() {
  const config = await getConfig();
  const referenceYear = requireConsolidatedReferenceYear(config);
  const careers = await getCareersDetail();
  const rows = requireConsolidatedAcademicRows(filterCareersByConsolidatedYear(careers.rows, referenceYear), referenceYear);

  return {
    referenceYear,
    caption: consolidatedDataCaption(referenceYear),
    offers: createAcademicOfferRows(rows, referenceYear),
    futureConfiguration: {
      currentCycle: config.get("CICLO_VIGENTE")?.trim() ?? "",
      showOnlyCurrent: config.get("MOSTRAR_SOLO_VIGENTE")?.trim() ?? "",
    },
  };
}
