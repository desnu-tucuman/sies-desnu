import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MapManagementLegend } from "./map-management-legend";

describe("leyenda del mapa", () => {
  it("muestra gestión y no categorías de tipo de sede", () => {
    const html = renderToStaticMarkup(<MapManagementLegend managementValues={["Estatal", "Privado"]} />);
    expect(html).toContain("Estatal"); expect(html).toContain("Privado");
    expect(html).not.toContain("Anexo"); expect(html).not.toContain("Extensión"); expect(html).not.toContain("Sin dato");
  });

  it("muestra Sin dato sólo cuando existe una gestión desconocida", () => {
    expect(renderToStaticMarkup(<MapManagementLegend managementValues={[""]} />)).toContain("Sin dato");
  });
});
