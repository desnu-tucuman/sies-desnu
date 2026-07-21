import { authorityQueryFromParams } from "@/domain/authorities-directory";
import { createAuthoritiesCsvReport } from "@/server/reports/authorities-reports-service";
import { downloadResponse } from "@/server/reports/report-response";

export const dynamic = "force-dynamic";
export async function GET(request: Request) { return downloadResponse(await createAuthoritiesCsvReport(authorityQueryFromParams(new URL(request.url).searchParams))); }
