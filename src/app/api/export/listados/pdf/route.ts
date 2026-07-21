import { listReportQueryFromParams } from "@/domain/list-reports";
import { createListPdfReport } from "@/server/reports/list-reports-reports-service";
import { downloadResponse } from "@/server/reports/report-response";
export const dynamic = "force-dynamic";
export async function GET(request: Request) { return downloadResponse(await createListPdfReport(listReportQueryFromParams(new URL(request.url).searchParams))); }
