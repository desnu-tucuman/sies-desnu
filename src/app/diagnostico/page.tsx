import Link from "next/link";
import { getSheetsDiagnostics } from "@/server/services/diagnostics-service";

export const dynamic = "force-dynamic";

function publicErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Ocurrió un error desconocido al consultar Google Sheets.";
}

export default async function DiagnosticsPage() {
  try {
    const diagnostics = await getSheetsDiagnostics();
    return (
      <main className="shell">
        <section className="panel" aria-labelledby="diagnostic-title">
          <div className="status statusOk"><span aria-hidden="true">✓</span> Conexión correcta</div>
          <p className="eyebrow">Diagnóstico de la fuente de datos</p>
          <h1 id="diagnostic-title">Google Sheets disponible</h1>
          <p className="lead">Las cuatro hojas requeridas respondieron y sus encabezados son válidos.</p>

          <dl className="metrics">
            <div><dt>Año vigente</dt><dd>{diagnostics.currentYear}</dd></div>
            <div><dt>Instituciones</dt><dd>{diagnostics.counts.institutions}</dd></div>
            <div><dt>Resúmenes de carreras</dt><dd>{diagnostics.counts.careersSummary}</dd></div>
            <div><dt>Resúmenes de autoridades</dt><dd>{diagnostics.counts.authoritiesSummary}</dd></div>
          </dl>

          <Link className="textLink" href="/">Volver al inicio</Link>
        </section>
      </main>
    );
  } catch (error) {
    return (
      <main className="shell">
        <section className="panel errorPanel" role="alert" aria-labelledby="diagnostic-title">
          <div className="status statusError"><span aria-hidden="true">!</span> Conexión no disponible</div>
          <p className="eyebrow">Diagnóstico de la fuente de datos</p>
          <h1 id="diagnostic-title">No se pudo validar Google Sheets</h1>
          <p className="errorMessage">{publicErrorMessage(error)}</p>
          <p>Revise las variables de entorno, el permiso Lector y los encabezados informados.</p>
          <Link className="textLink" href="/">Volver al inicio</Link>
        </section>
      </main>
    );
  }
}

