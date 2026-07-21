import Link from "next/link";
import { notFound } from "next/navigation";
import { DataValue, SourceError } from "@/components/ui";
import { NO_DATA, type TrainingOffer } from "@/domain/institutions";
import { getInstitutionById } from "@/server/services/institutions-service";

export const dynamic = "force-dynamic";

function Field({ label, value }: { label: string; value?: string }) {
  return <div className="detailField"><dt>{label}</dt><dd><DataValue value={value} /></dd></div>;
}

function OfferList({ title, items }: { title: string; items?: string[] }) {
  return <section className="offerList"><h3>{title}</h3>{items?.length ? <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="noData">{NO_DATA}</p>}</section>;
}

function OfferMetrics({ offer }: { offer: TrainingOffer | null }) {
  return <dl className="offerMetrics"><Field label="Carreras" value={offer?.totalCareers} /><Field label="Matrícula" value={offer?.enrollment} /><Field label="Ingresantes" value={offer?.entrants} /><Field label="Egresados" value={offer?.graduates} /><Field label="Año de referencia" value={offer?.referenceYear} /></dl>;
}

export default async function InstitutionDetailPage({ params }: { params: Promise<{ identificador: string }> }) {
  const { identificador } = await params;
  let institution;
  try {
    ({ institution } = await getInstitutionById(identificador));
  } catch (error) {
    return <main className="contentWidth pageTop"><SourceError error={error} /></main>;
  }
  if (!institution) notFound();

  return <main className="contentWidth pageTop">
      <Link className="backLink" href="/instituciones">← Volver a instituciones</Link>
      <header className="detailHeading"><div><p className="eyebrow">Ficha institucional</p><h1>{institution.name}</h1><p>{institution.siteType || "No hay datos"} · {institution.management || "No hay datos"}</p></div><div className="detailActions"><span className="cueBadge">CUE {institution.cue || "No hay datos"}</span><Link href={`/api/export/instituciones/${institution.id}/pdf`}>↓ Descargar ficha PDF</Link><Link href={`/api/export/instituciones/${institution.id}/csv`}>↓ Descargar ficha CSV</Link></div></header>
      {institution.partialReasons.length ? <aside className="partialNotice"><strong>Datos parciales</strong><span>{institution.partialReasons.join(". ")}.</span></aside> : null}

      <section className="detailBlock identityBlock" aria-labelledby="identity-title"><div className="blockTitle"><span>01</span><div><p>Identidad</p><h2 id="identity-title">Información institucional</h2></div></div><dl className="detailGrid">
        <Field label="Nombre" value={institution.name} /><Field label="CUE" value={institution.cue} /><Field label="CUI" value={institution.cui} />
        <Field label="Gestión" value={institution.management} /><Field label="Tipo de sede" value={institution.siteType} /><Field label="Dirección" value={institution.address} />
        <Field label="Localidad" value={institution.locality} /><Field label="Departamento" value={institution.department} /><Field label="Teléfono" value={institution.phone} />
        <Field label="Correo electrónico" value={institution.email} /><Field label="Horario" value={institution.schedule} /><Field label="Edificio compartido" value={institution.sharedBuilding} />
      </dl></section>

      <section className="detailBlock authoritiesBlock" aria-labelledby="authorities-title"><div className="blockTitle"><span>02</span><div><p>Directivos</p><h2 id="authorities-title">Autoridades</h2></div></div>
        {institution.authorities.length ? <div className="authorityGrid">{institution.authorities.map((authority, index) => <article key={`${authority.name}-${index}`}><span className="authorityNumber">{String(index + 1).padStart(2, "0")}</span><h3><DataValue value={authority.name} /></h3><p className="role"><DataValue value={authority.role} /></p><dl><Field label="Teléfono" value={authority.phone} /><Field label="Correo" value={authority.email} /></dl></article>)}</div> : <p className="noDataBlock">No hay datos</p>}
      </section>

      <section className="detailBlock offerBlock" aria-labelledby="offer-title"><div className="blockTitle"><span>03</span><div><p>Oferta formativa</p><h2 id="offer-title">Carreras e indicadores</h2></div></div><OfferMetrics offer={institution.offer} /><div className="offerColumns"><OfferList title="Profesorados" items={institution.offer?.teachingDegrees} /><OfferList title="Tecnicaturas" items={institution.offer?.technicalDegrees} /><OfferList title="Otras formaciones superiores" items={institution.offer?.otherDegrees} /></div></section>
    </main>;
}
