import { describe, expect, it } from "vitest";
import { calculateStaticMapViewport, clusterMapPoints, projectMapPoints, separateMapPoints } from "./static-map";

describe("mapa estático para PDF", () => {
  it("reutiliza zoom 15 para una institución", () => {
    const viewport = calculateStaticMapViewport([{ latitude: -26.8, longitude: -65.2 }]);
    expect(viewport).toMatchObject({ centerLatitude: -26.8, centerLongitude: -65.2, zoom: 15 });
  });

  it("respeta maxZoom 14 para pocos puntos y 12 para conjuntos grandes", () => {
    const close = [{ latitude: -26.8, longitude: -65.2 }, { latitude: -26.801, longitude: -65.201 }];
    expect(calculateStaticMapViewport(close).zoom).toBe(14);
    expect(calculateStaticMapViewport([...close, ...Array.from({ length: 5 }, (_, index) => ({ latitude: -26.802 - index / 10000, longitude: -65.202 }))]).zoom).toBe(12);
  });

  it("mantiene puntos dentro del área con padding y agrupa los cercanos", () => {
    const points = [
      { latitude: -26.8, longitude: -65.2, id: "a" },
      { latitude: -26.8001, longitude: -65.2001, id: "b" },
      { latitude: -27.2, longitude: -65.6, id: "c" },
    ];
    const viewport = calculateStaticMapViewport(points);
    const projected = projectMapPoints(points, viewport);
    expect(projected.every((point) => point.x >= 29 && point.x <= viewport.width - 29 && point.y >= 29 && point.y <= viewport.height - 29)).toBe(true);
    expect(clusterMapPoints(projected, 48).map((cluster) => cluster.items.length)).toEqual([2, 1]);
  });

  it("mantiene marcadores individuales y separa los que se superponen", () => {
    const points = [
      { item: { latitude: -26.8, longitude: -65.2, id: "a" }, x: 100, y: 100 },
      { item: { latitude: -26.8, longitude: -65.2, id: "b" }, x: 100, y: 100 },
      { item: { latitude: -26.8, longitude: -65.2, id: "c" }, x: 100, y: 100 },
    ];
    const separated = separateMapPoints(points);
    expect(separated).toHaveLength(3);
    expect(separated.every((point) => point.items.length === 1)).toBe(true);
    expect(Math.hypot(separated[0].x - separated[1].x, separated[0].y - separated[1].y)).toBeGreaterThanOrEqual(18);
    expect(Math.hypot(separated[1].x - separated[2].x, separated[1].y - separated[2].y)).toBeGreaterThanOrEqual(18);
  });

  it("encuadra Matemática en zoom 9 con el lienzo geográfico del PDF", () => {
    const points = [
      { latitude: -26.81420364, longitude: -65.22538889 },
      { latitude: -27.4335133, longitude: -65.62345728 },
      { latitude: -27.030612, longitude: -65.305464 },
      { latitude: -27.165889, longitude: -65.49805 },
      { latitude: -27.771459, longitude: -65.586548 },
      { latitude: -26.827401, longitude: -65.205075 },
      { latitude: -26.818344, longitude: -65.216688 },
      { latitude: -26.84374717, longitude: -65.21559429 },
      { latitude: -27.34826562, longitude: -65.59316283 },
    ];
    const viewport = calculateStaticMapViewport(points, 480, 480);
    const projected = projectMapPoints(points, viewport);
    expect(viewport.zoom).toBe(9);
    expect(viewport.centerLatitude).toBeCloseTo(-27.29283132, 8);
    expect(viewport.centerLongitude).toBeCloseTo(-65.41426614, 8);
    expect(projected.every((point) => point.x >= 30 && point.x <= 450 && point.y >= 30 && point.y <= 450)).toBe(true);
  });
});
