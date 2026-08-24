import React from "react";
import Link from "next/link";
import type { LocatedInstitution } from "@/domain/geography";
import { MANAGEMENT_MARKER_COLORS, managementMarkerKind } from "../../domain/map-marker-style";

function PopupValue({ label, value }: { label: string; value: string }) {
  return <p><strong>{label}:</strong> {value || "No hay datos"}</p>;
}

function PopupManagement({ value }: { value: string }) {
  const color = MANAGEMENT_MARKER_COLORS[managementMarkerKind(value)];
  return <p><strong>Gestión:</strong> <i className="popupManagementDot" style={{ backgroundColor: color }} aria-hidden="true" /> {value || "No hay datos"}</p>;
}

export function MapPopupContent({ institution }: { institution: LocatedInstitution }) {
  if (institution.mapMode === "offer") {
    const highlighted = new Set(institution.matchedCareers ?? []);
    return <div className="mapPopup offerMapPopup">
      <h3>{institution.name}</h3>
      <PopupValue label="Institución responsable" value={institution.responsibleInstitution ?? ""} />
      <PopupValue label="CUE" value={institution.cue} />
      <PopupValue label="Tipo de sede" value={institution.siteType} />
      <PopupValue label="Localidad" value={institution.locality} />
      <PopupValue label="Departamento" value={institution.department} />
      <PopupManagement value={institution.management} />
      <PopupValue label="Tipo de oferta" value={institution.offerType ?? ""} />
      <div className="popupCareers"><strong>Carreras vigentes:</strong><ul>{institution.careers?.map((career) => <li key={career}>{highlighted.has(career) ? <mark>{career}</mark> : career}</li>)}</ul></div>
      <div className="popupMetrics"><span>Matrícula 2026 <strong>{institution.enrollment || "No hay datos"}</strong></span><span>Ingresantes 2026 <strong>{institution.entrants || "No hay datos"}</strong></span><span>Egresados 2026 <strong>{institution.graduates || "No hay datos"}</strong></span></div>
      <Link href={`/ofertas?institution=${encodeURIComponent(institution.name)}`}>Ver oferta académica →</Link>
    </div>;
  }
  return <div className="mapPopup">
    <h3>{institution.name}</h3>
    <PopupValue label="CUE" value={institution.cue} />
    <PopupManagement value={institution.management} />
    <PopupValue label="Tipo de sede" value={institution.siteType} />
    <PopupValue label="Formación institucional" value={institution.baseTrainingType} />
    <PopupValue label="Localidad" value={institution.locality} />
    <PopupValue label="Departamento" value={institution.department} />
    <PopupValue label="Dirección" value={institution.address} />
    <Link href={`/instituciones/${institution.id}`}>Ver ficha institucional →</Link>
  </div>;
}
