import { describe, expect, it } from "vitest";
import { getMapViewportStrategy } from "./map-viewport";

describe("encuadre del mapa institucional", () => {
  it("usa la vista provincial cuando no hay puntos", () => {
    expect(getMapViewportStrategy(0)).toEqual({ kind: "empty", zoom: 8 });
  });

  it("centra un único resultado con zoom cercano", () => {
    expect(getMapViewportStrategy(1)).toEqual({ kind: "single", zoom: 15 });
  });

  it("limita el zoom y amplía el margen para entre dos y cinco puntos", () => {
    expect(getMapViewportStrategy(2)).toEqual({ kind: "bounds", maxZoom: 14, padding: [48, 48] });
    expect(getMapViewportStrategy(5)).toEqual({ kind: "bounds", maxZoom: 14, padding: [48, 48] });
  });

  it("usa un máximo más amplio para conjuntos grandes y padding compacto en móviles", () => {
    expect(getMapViewportStrategy(6)).toEqual({ kind: "bounds", maxZoom: 12, padding: [48, 48] });
    expect(getMapViewportStrategy(3, true)).toEqual({ kind: "bounds", maxZoom: 14, padding: [30, 30] });
  });
});
