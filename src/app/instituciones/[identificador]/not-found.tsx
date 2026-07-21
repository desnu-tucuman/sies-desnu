import Link from "next/link";

export default function InstitutionNotFound() {
  return <main className="contentWidth pageTop"><section className="stateCard"><p className="eyebrow">Ficha institucional</p><h1>Institución no encontrada</h1><p>El identificador no corresponde a una unidad territorial disponible.</p><Link className="button" href="/instituciones">Volver a la consulta</Link></section></main>;
}

