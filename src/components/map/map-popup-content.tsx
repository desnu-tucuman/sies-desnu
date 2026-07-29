import React from "react";
import Link from "next/link";
import type { LocatedInstitution } from "@/domain/geography";

function PopupValue({ label, value }: { label: string; value: string }) {
  return <p><strong>{label}:</strong> {value || "No hay datos"}</p>;
}

export function MapPopupContent({ institution }: { institution: LocatedInstitution }) {
  return <div className="mapPopup">
    <h3>{institution.name}</h3>
    <PopupValue label="CUE" value={institution.cue} />
    <PopupValue label="Gestión" value={institution.management} />
    <PopupValue label="Tipo de sede" value={institution.siteType} />
    <PopupValue label="Formación institucional" value={institution.baseTrainingType} />
    <PopupValue label="Localidad" value={institution.locality} />
    <PopupValue label="Departamento" value={institution.department} />
    <PopupValue label="Dirección" value={institution.address} />
    <Link href={`/instituciones/${institution.id}`}>Ver ficha institucional →</Link>
  </div>;
}
