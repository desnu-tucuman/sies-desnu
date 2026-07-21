import { institutionQueryFromParams } from "@/domain/institutions";
import { downloadResponse } from "@/server/reports/report-response";
import { createInstitutionsCsvReport } from "@/server/reports/reports-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const query = institutionQueryFromParams(new URL(request.url).searchParams);
  return downloadResponse(await createInstitutionsCsvReport(query));
}

