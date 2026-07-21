export type MapViewportStrategy =
  | { kind: "empty"; zoom: number }
  | { kind: "single"; zoom: number }
  | { kind: "bounds"; maxZoom: number; padding: [number, number] };

export function getMapViewportStrategy(pointCount: number, compact = false): MapViewportStrategy {
  if (pointCount <= 0) return { kind: "empty", zoom: 8 };
  if (pointCount === 1) return { kind: "single", zoom: 15 };

  return {
    kind: "bounds",
    maxZoom: pointCount <= 5 ? 14 : 12,
    padding: compact ? [30, 30] : [48, 48],
  };
}
