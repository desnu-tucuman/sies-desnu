import { academicOfferQueryFromParams } from "@/domain/academic-offer";
import { createAcademicOffersPdfReport } from "@/server/reports/academic-offer-reports-service";
import { downloadResponse } from "@/server/reports/report-response";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return downloadResponse(await createAcademicOffersPdfReport(academicOfferQueryFromParams(new URL(request.url).searchParams)));
}
