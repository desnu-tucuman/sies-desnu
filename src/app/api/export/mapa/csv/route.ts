import { mapQueryFromParams } from "@/domain/geographic-offers";
import { EmptyMapExportError, createMapCsvReport } from "@/server/reports/map-reports-service";
import { downloadResponse } from "@/server/reports/report-response";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    return downloadResponse(await createMapCsvReport(mapQueryFromParams(new URL(request.url).searchParams)));
  } catch (error) {
    if (error instanceof EmptyMapExportError) return new Response(error.message, { status: 422 });
    throw error;
  }
}
