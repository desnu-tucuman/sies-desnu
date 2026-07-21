import { authorityQueryFromParams } from "@/domain/authorities-directory";
import { createAuthoritiesPdfReport } from "@/server/reports/authorities-reports-service";
import { downloadResponse } from "@/server/reports/report-response";

export const dynamic = "force-dynamic";
export async function GET(request: Request) { return downloadResponse(await createAuthoritiesPdfReport(authorityQueryFromParams(new URL(request.url).searchParams))); }
