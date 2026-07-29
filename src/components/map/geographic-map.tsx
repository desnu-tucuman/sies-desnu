"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { TUCUMAN_CENTER, type LocatedInstitution } from "@/domain/geography";
import { managementMarkerKind } from "@/domain/map-marker-style";
import { getMapViewportStrategy } from "@/domain/map-viewport";
import { MapPopupContent } from "./map-popup-content";

const iconCache = new Map<string, L.DivIcon>();

function markerIcon(management: string): L.DivIcon {
  const kind = managementMarkerKind(management);
  const cached = iconCache.get(kind);
  if (cached) return cached;
  const icon = L.divIcon({
    className: `sies-map-marker marker-${kind}`,
    html: "<span></span>",
    iconSize: [24, 32],
    iconAnchor: [12, 31],
    popupAnchor: [0, -28],
  });
  iconCache.set(kind, icon);
  return icon;
}

function FitFilteredBounds({ institutions, singleMarker }: { institutions: LocatedInstitution[]; singleMarker: React.RefObject<L.Marker | null> }) {
  const map = useMap();
  useEffect(() => {
    const compact = window.matchMedia("(max-width: 720px)").matches;
    const strategy = getMapViewportStrategy(institutions.length, compact);
    map.invalidateSize();

    if (strategy.kind === "empty") {
      map.setView(TUCUMAN_CENTER, strategy.zoom);
      return;
    }

    if (strategy.kind === "single") {
      const institution = institutions[0];
      map.setView([institution.latitude, institution.longitude], strategy.zoom, { animate: false });
      const timer = window.setTimeout(() => singleMarker.current?.openPopup(), 0);
      return () => window.clearTimeout(timer);
    }

    const bounds = L.latLngBounds(institutions.map((institution) => [institution.latitude, institution.longitude]));
    map.fitBounds(bounds, { padding: strategy.padding, maxZoom: strategy.maxZoom, animate: false });
  }, [institutions, map, singleMarker]);
  return null;
}

function InstitutionMarker({ institution, markerRef }: { institution: LocatedInstitution; markerRef?: React.Ref<L.Marker> }) {
  const map = useMap();
  return (
    <Marker
      ref={markerRef}
      position={[institution.latitude, institution.longitude]}
      icon={markerIcon(institution.management)}
      eventHandlers={{
        click: (event) => {
          const marker = event.target as L.Marker;
          map.flyTo(marker.getLatLng(), Math.max(map.getZoom(), 15), { animate: true, duration: 0.6 });
          marker.openPopup();
        },
      }}
    >
      <Popup minWidth={250} autoPanPadding={[36, 36]}>
        <MapPopupContent institution={institution} />
      </Popup>
    </Marker>
  );
}

export default function GeographicMap({ institutions }: { institutions: LocatedInstitution[] }) {
  const singleMarker = useRef<L.Marker | null>(null);

  return (
    <MapContainer center={TUCUMAN_CENTER} zoom={8} className="institutionMap" scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitFilteredBounds institutions={institutions} singleMarker={singleMarker} />
      <MarkerClusterGroup chunkedLoading maxClusterRadius={48} showCoverageOnHover={false} zoomToBoundsOnClick spiderfyOnMaxZoom>
        {institutions.map((institution) => (
          <InstitutionMarker
            key={institution.id}
            institution={institution}
            markerRef={institutions.length === 1 ? singleMarker : undefined}
          />
        ))}
      </MarkerClusterGroup>
    </MapContainer>
  );
}
