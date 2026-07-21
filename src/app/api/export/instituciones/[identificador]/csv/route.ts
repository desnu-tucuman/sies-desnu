import { downloadResponse } from "@/server/reports/report-response";
import { createInstitutionCsvReport } from "@/server/reports/reports-service";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ identificador: string }> }) {
  const { identificador } = await params;
  const report = await createInstitutionCsvReport(identificador);
  return report ? downloadResponse(report) : new Response("Institución no encontrada", { status: 404 });
}

