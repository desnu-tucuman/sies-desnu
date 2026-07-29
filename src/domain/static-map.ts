import { TUCUMAN_CENTER } from "./geography";
import { getMapViewportStrategy } from "./map-viewport";

export interface GeographicPoint { latitude: number; longitude: number }
export interface StaticMapViewport { centerLatitude: number; centerLongitude: number; zoom: number; width: number; height: number }
export interface ProjectedMapPoint<T extends GeographicPoint = GeographicPoint> { item: T; x: number; y: number }
export interface MapPointCluster<T extends GeographicPoint = GeographicPoint> { x: number; y: number; items: T[] }

const TILE_SIZE = 256;
const MAX_LATITUDE = 85.05112878;

export function worldPixel(point: GeographicPoint, zoom: number): { x: number; y: number } {
  const scale = TILE_SIZE * 2 ** zoom;
  const latitude = Math.max(-MAX_LATITUDE, Math.min(MAX_LATITUDE, point.latitude));
  const sin = Math.sin(latitude * Math.PI / 180);
  return {
    x: (point.longitude + 180) / 360 * scale,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
  };
}

function geographicCenter(points: GeographicPoint[]): GeographicPoint {
  if (!points.length) return { latitude: TUCUMAN_CENTER[0], longitude: TUCUMAN_CENTER[1] };
  return {
    latitude: (Math.min(...points.map((point) => point.latitude)) + Math.max(...points.map((point) => point.latitude))) / 2,
    longitude: (Math.min(...points.map((point) => point.longitude)) + Math.max(...points.map((point) => point.longitude))) / 2,
  };
}

export function calculateStaticMapViewport(points: GeographicPoint[], width = 773, height = 250): StaticMapViewport {
  const strategy = getMapViewportStrategy(points.length);
  const center = geographicCenter(points);
  if (strategy.kind !== "bounds") return { centerLatitude: center.latitude, centerLongitude: center.longitude, zoom: strategy.zoom, width, height };
  const availableWidth = Math.max(1, width - strategy.padding[0] * 2);
  const availableHeight = Math.max(1, height - strategy.padding[1] * 2);
  let zoom = strategy.maxZoom;
  for (; zoom > 1; zoom -= 1) {
    const projected = points.map((point) => worldPixel(point, zoom));
    const spanX = Math.max(...projected.map((point) => point.x)) - Math.min(...projected.map((point) => point.x));
    const spanY = Math.max(...projected.map((point) => point.y)) - Math.min(...projected.map((point) => point.y));
    if (spanX <= availableWidth && spanY <= availableHeight) break;
  }
  return { centerLatitude: center.latitude, centerLongitude: center.longitude, zoom, width, height };
}

export function projectMapPoints<T extends GeographicPoint>(points: T[], viewport: StaticMapViewport): ProjectedMapPoint<T>[] {
  const center = worldPixel({ latitude: viewport.centerLatitude, longitude: viewport.centerLongitude }, viewport.zoom);
  return points.map((item) => {
    const pixel = worldPixel(item, viewport.zoom);
    return { item, x: pixel.x - center.x + viewport.width / 2, y: pixel.y - center.y + viewport.height / 2 };
  });
}

export function clusterMapPoints<T extends GeographicPoint>(points: ProjectedMapPoint<T>[], radius = 48): MapPointCluster<T>[] {
  const clusters: MapPointCluster<T>[] = [];
  for (const point of points) {
    const cluster = clusters.find((candidate) => Math.hypot(candidate.x - point.x, candidate.y - point.y) <= radius);
    if (!cluster) { clusters.push({ x: point.x, y: point.y, items: [point.item] }); continue; }
    const count = cluster.items.length;
    cluster.x = (cluster.x * count + point.x) / (count + 1);
    cluster.y = (cluster.y * count + point.y) / (count + 1);
    cluster.items.push(point.item);
  }
  return clusters;
}
