import Link from "next/link";
import React from "react";

export function MapExportActions({ total, exportSuffix }: { total: number; exportSuffix: string }) {
  return <div className="resultToolbar mapExportToolbar">
    <div className="downloadActions" aria-label="Descargas del mapa institucional">
      {total ? <>
        <Link href={`/api/export/mapa/csv${exportSuffix}`}>↓ Descargar CSV</Link>
        <Link href={`/api/export/mapa/pdf${exportSuffix}`}>↓ Descargar PDF</Link>
      </> : <>
        <button type="button" disabled>↓ Descargar CSV</button>
        <button type="button" disabled>↓ Descargar PDF</button>
      </>}
    </div>
    {!total ? <p className="exportHelp">No hay registros para exportar con los filtros seleccionados.</p> : null}
  </div>;
}
