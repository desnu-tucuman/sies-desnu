import React from "react";
import { MANAGEMENT_MARKER_COLORS, managementMarkerKind } from "../../domain/map-marker-style";

export function MapManagementLegend({ managementValues }: { managementValues: string[] }) {
  const hasUnknown = managementValues.some((value) => managementMarkerKind(value) === "unknown");
  return <div className="mapLegend" aria-label="Leyenda de gestión institucional">
    <span><i style={{ backgroundColor: MANAGEMENT_MARKER_COLORS.state }} /> Estatal</span>
    <span><i style={{ backgroundColor: MANAGEMENT_MARKER_COLORS.private }} /> Privado</span>
    {hasUnknown ? <span><i style={{ backgroundColor: MANAGEMENT_MARKER_COLORS.unknown }} /> Sin dato</span> : null}
  </div>;
}
