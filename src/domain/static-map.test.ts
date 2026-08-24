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
    expect(projected.every((point) => point.x >= 47 && point.x <= viewport.width - 47 && point.y >= 47 && point.y <= viewport.height - 47)).toBe(true);
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
});
