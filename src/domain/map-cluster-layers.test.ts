import { describe, expect, it } from "vitest";
import { MAP_CLUSTER_LAYER_OPTIONS, mapClusterLayerKey } from "./map-cluster-layers";

describe("capas temporales del mapa interactivo", () => {
  it("mantiene desactivadas la cobertura y las patas de spiderfy", () => {
    expect(MAP_CLUSTER_LAYER_OPTIONS).toMatchObject({
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: false,
      zoomToBoundsOnClick: true,
    });
  });

  it("recrea la capa si cambian los registros o sus coordenadas", () => {
    const capital = [{ id: "capital", latitude: -26.83, longitude: -65.2 }];
    const capitalMoved = [{ id: "capital", latitude: -26.84, longitude: -65.2 }];
    const capitalAndSouth = [
      ...capital,
      { id: "sur", latitude: -27.58, longitude: -65.61 },
    ];

    expect(mapClusterLayerKey(capital)).not.toBe(mapClusterLayerKey(capitalMoved));
    expect(mapClusterLayerKey(capital)).not.toBe(mapClusterLayerKey(capitalAndSouth));
    expect(mapClusterLayerKey(capitalAndSouth)).toBe(mapClusterLayerKey([...capitalAndSouth].reverse()));
  });
});
