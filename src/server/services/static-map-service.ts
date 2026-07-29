import "server-only";

import type { LocatedInstitution } from "@/domain/geography";
import { calculateStaticMapViewport, projectMapPoints, type MapPointCluster, type StaticMapViewport, worldPixel } from "@/domain/static-map";
import { clusterMapPoints } from "@/domain/static-map";

const TILE_SIZE = 256;
const tileCache = new Map<string, Promise<Buffer>>();

export class StaticMapRenderError extends Error {
  constructor(message = "No se pudo obtener la cartografía necesaria para generar el PDF. Intenta nuevamente en unos instantes.") {
    super(message);
    this.name = "StaticMapRenderError";
  }
}

export interface StaticMapTile { body: Buffer; x: number; y: number; width: number; height: number }
export interface StaticInstitutionMap {
  viewport: StaticMapViewport;
  tiles: StaticMapTile[];
  clusters: MapPointCluster<LocatedInstitution>[];
  attribution: string;
}

async function fetchTile(zoom: number, x: number, y: number): Promise<Buffer> {
  const tileCount = 2 ** zoom;
  const wrappedX = ((x % tileCount) + tileCount) % tileCount;
  const key = `${zoom}/${wrappedX}/${y}`;
  const cached = tileCache.get(key);
  if (cached) return cached;
  const request = (async () => {
    if (y < 0 || y >= tileCount) throw new StaticMapRenderError();
    const response = await fetch(`https://tile.openstreetmap.org/${key}.png`, {
      headers: { "User-Agent": "SIES-DESNU/1.0 (PDF institucional; Ministerio de Educacion de Tucuman)" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok || !response.headers.get("content-type")?.startsWith("image/")) throw new StaticMapRenderError();
    return Buffer.from(await response.arrayBuffer());
  })().catch((error) => {
    tileCache.delete(key);
    if (error instanceof StaticMapRenderError) throw error;
    throw new StaticMapRenderError();
  });
  tileCache.set(key, request);
  return request;
}

export async function createStaticInstitutionMap(institutions: LocatedInstitution[], width = 773, height = 250): Promise<StaticInstitutionMap> {
  const viewport = calculateStaticMapViewport(institutions, width, height);
  const center = worldPixel({ latitude: viewport.centerLatitude, longitude: viewport.centerLongitude }, viewport.zoom);
  const minTileX = Math.floor((center.x - width / 2) / TILE_SIZE);
  const maxTileX = Math.floor((center.x + width / 2) / TILE_SIZE);
  const minTileY = Math.floor((center.y - height / 2) / TILE_SIZE);
  const maxTileY = Math.floor((center.y + height / 2) / TILE_SIZE);
  const requests: Array<Promise<StaticMapTile>> = [];
  for (let tileY = minTileY; tileY <= maxTileY; tileY += 1) {
    for (let tileX = minTileX; tileX <= maxTileX; tileX += 1) {
      requests.push(fetchTile(viewport.zoom, tileX, tileY).then((body) => ({
        body,
        x: tileX * TILE_SIZE - center.x + width / 2,
        y: tileY * TILE_SIZE - center.y + height / 2,
        width: TILE_SIZE,
        height: TILE_SIZE,
      })));
    }
  }
  return {
    viewport,
    tiles: await Promise.all(requests),
    clusters: clusterMapPoints(projectMapPoints(institutions, viewport), 48),
    attribution: "© OpenStreetMap contributors · Leaflet",
  };
}
