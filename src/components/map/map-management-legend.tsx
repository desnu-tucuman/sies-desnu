import React from "react";
import { managementMarkerKind } from "../../domain/map-marker-style";

export function MapManagementLegend({ managementValues }: { managementValues: string[] }) {
  const hasUnknown = managementValues.some((value) => managementMarkerKind(value) === "unknown");
  return <div className="mapLegend" aria-label="Leyenda de gestión institucional">
    <span><i className="legendState" /> Estatal</span>
    <span><i className="legendPrivate" /> Privado</span>
    {hasUnknown ? <span><i className="legendUnknown" /> Sin dato</span> : null}
  </div>;
}
