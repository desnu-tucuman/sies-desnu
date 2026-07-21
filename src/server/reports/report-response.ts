import type { GeneratedReport } from "./reports-service";

export function downloadResponse(report: GeneratedReport): Response {
  return new Response(new Uint8Array(report.body), {
    status: 200,
    headers: {
      "Content-Type": report.contentType,
      "Content-Disposition": `attachment; filename="${report.filename}"`,
      "Content-Length": String(report.body.length),
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

