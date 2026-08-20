import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MapExportActions } from "./map-export-actions";

describe("acciones de exportación del mapa", () => {
  it("conserva todos los parámetros activos en ambas descargas", () => {
    const suffix = "?department=CAPITAL&trainingType=DOCENTE&trainingType=MIXTA";
    const html = renderToStaticMarkup(<MapExportActions total={23} exportSuffix={suffix} />);
    expect(html).toContain(`/api/export/mapa/csv${suffix.replaceAll("&", "&amp;")}`);
    expect(html).toContain(`/api/export/mapa/pdf${suffix.replaceAll("&", "&amp;")}`);
  });

  it("deshabilita ambas acciones y muestra ayuda cuando no hay resultados", () => {
    const html = renderToStaticMarkup(<MapExportActions total={0} exportSuffix="?department=INEXISTENTE" />);
    expect((html.match(/disabled/g) ?? [])).toHaveLength(2);
    expect(html).toContain("No hay registros para exportar con los filtros seleccionados.");
    expect(html).not.toContain("href=");
  });

  it("identifica de forma accesible las descargas de Oferta 2026", () => {
    const html = renderToStaticMarkup(<MapExportActions total={10} exportSuffix="?vista=oferta" mode="offer" />);
    expect(html).toContain('aria-label="Descargas del mapa de oferta 2026"');
  });
});
