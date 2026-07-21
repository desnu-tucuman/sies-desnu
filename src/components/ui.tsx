import type { ReactNode } from "react";

export function DataValue({ value }: { value?: string }) {
  return <>{value?.trim() || <span className="noData">No hay datos</span>}</>;
}

export function SourceError({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : "No fue posible consultar la fuente de datos.";
  return (
    <section className="stateCard errorPanel" role="alert">
      <p className="eyebrow">Fuente no disponible</p>
      <h1>No pudimos cargar la información</h1>
      <p className="errorMessage">{message}</p>
      <p>Intente nuevamente. Si el problema continúa, revise la conexión con Google Sheets.</p>
    </section>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="emptyState"><strong>Sin resultados</strong><p>{children}</p></div>;
}

