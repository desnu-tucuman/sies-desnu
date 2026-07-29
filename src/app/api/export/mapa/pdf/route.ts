import { institutionQueryFromParams } from "@/domain/institutions";
import { EmptyMapExportError, createMapPdfReport } from "@/server/reports/map-reports-service";
import { downloadResponse } from "@/server/reports/report-response";
import { StaticMapRenderError } from "@/server/services/static-map-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    return downloadResponse(await createMapPdfReport(institutionQueryFromParams(new URL(request.url).searchParams)));
  } catch (error) {
    if (error instanceof EmptyMapExportError) return new Response(error.message, { status: 422 });
    if (error instanceof StaticMapRenderError) return new Response(error.message, { status: 502 });
    throw error;
  }
}
