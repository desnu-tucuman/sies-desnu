import { describe, expect, it } from "vitest";
import { getBoundsForGeographicResults, getMapViewportStrategy } from "./map-viewport";

describe("encuadre del mapa institucional", () => {
  it("usa la vista provincial cuando no hay puntos", () => {
    expect(getMapViewportStrategy(0)).toEqual({ kind: "empty", zoom: 8 });
  });

  it("centra un único resultado con zoom cercano", () => {
    expect(getMapViewportStrategy(1)).toEqual({ kind: "single", zoom: 15 });
  });

  it("limita el zoom y amplía el margen para entre dos y cinco puntos", () => {
    expect(getMapViewportStrategy(2)).toEqual({ kind: "bounds", minZoom: 7, maxZoom: 14, padding: [30, 30] });
    expect(getMapViewportStrategy(5)).toEqual({ kind: "bounds", minZoom: 7, maxZoom: 14, padding: [30, 30] });
  });

  it("usa un máximo más amplio para conjuntos grandes y padding compacto en móviles", () => {
    expect(getMapViewportStrategy(6)).toEqual({ kind: "bounds", minZoom: 7, maxZoom: 12, padding: [30, 30] });
    expect(getMapViewportStrategy(3, true)).toEqual({ kind: "bounds", minZoom: 7, maxZoom: 14, padding: [24, 24] });
  });

  it("calcula bounds exclusivamente desde las coordenadas recibidas", () => {
    expect(getBoundsForGeographicResults([
      { latitude: -26.8, longitude: -65.2 },
      { latitude: -27.7, longitude: -65.6 },
    ])).toEqual({
      south: -27.7, west: -65.6, north: -26.8, east: -65.2,
      centerLatitude: -27.25, centerLongitude: -65.4,
    });
    expect(getBoundsForGeographicResults([])).toBeNull();
  });
});
