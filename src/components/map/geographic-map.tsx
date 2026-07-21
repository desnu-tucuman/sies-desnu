"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { TUCUMAN_CENTER, type LocatedInstitution } from "@/domain/geography";
import { getMapViewportStrategy } from "@/domain/map-viewport";

const iconCache = new Map<string, L.DivIcon>();

function markerKind(siteType: string): string {
  const normalized = siteType.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  if (normalized.includes("EXTENSION")) return "extension";
  if (normalized.includes("ANEXO")) return "annex";
  return "headquarters";
}

function markerIcon(siteType: string): L.DivIcon {
  const kind = markerKind(siteType);
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

function PopupValue({ label, value }: { label: string; value: string }) {
  return <p><strong>{label}:</strong> {value || "No hay datos"}</p>;
}

function InstitutionMarker({ institution, markerRef }: { institution: LocatedInstitution; markerRef?: React.Ref<L.Marker> }) {
  const map = useMap();
  return (
    <Marker
      ref={markerRef}
      position={[institution.latitude, institution.longitude]}
      icon={markerIcon(institution.siteType)}
      eventHandlers={{
        click: (event) => {
          const marker = event.target as L.Marker;
          map.flyTo(marker.getLatLng(), Math.max(map.getZoom(), 15), { animate: true, duration: 0.6 });
          marker.openPopup();
        },
      }}
    >
      <Popup minWidth={250} autoPanPadding={[36, 36]}>
        <div className="mapPopup">
          <h3>{institution.name}</h3>
          <PopupValue label="CUE" value={institution.cue} />
          <PopupValue label="Gestión" value={institution.management} />
          <PopupValue label="Tipo de sede" value={institution.siteType} />
          <PopupValue label="Formación institucional" value={institution.baseTrainingType} />
          <PopupValue label="Localidad" value={institution.locality} />
          <PopupValue label="Departamento" value={institution.department} />
          <PopupValue label="Dirección" value={institution.address} />
          <Link href={`/instituciones/${institution.id}`}>Ver ficha institucional →</Link>
        </div>
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
