"use client";

import dynamic from "next/dynamic";
import type { LocatedInstitution } from "@/domain/geography";

const GeographicMap = dynamic(() => import("./geographic-map"), {
  ssr: false,
  loading: () => <div className="mapLoading" role="status">Cargando mapa…</div>,
});

export function MapLoader({ institutions }: { institutions: LocatedInstitution[] }) {
  return <GeographicMap institutions={institutions} />;
}

