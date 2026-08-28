import Link from "next/link";
import { DataValue, EmptyState, SourceError } from "@/components/ui";
import { academicOfferQueryFromParams, queryAcademicOffers, type AcademicOfferQuery, type AcademicOfferSummary } from "@/domain/academic-offer";
import { getAcademicOfferDataset } from "@/server/services/academic-offer-service";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;
function one(value: string | string[] | undefined): string { return Array.isArray(value) ? value[0] ?? "" : value ?? ""; }

function urlWith(params: SearchParams, changes: Record<string, string | number | undefined>): string {
  const next = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { const clean = one(value); if (clean) next.set(key, clean); });
  Object.entries(changes).forEach(([key, value]) => { if (value === undefined || value === "") next.delete(key); else next.set(key, String(value)); });
  return `/ofertas?${next.toString()}`;
}

function SelectFilter({ name, label, value, options }: { name: string; label: string; value: string; options: string[] }) {
  return <label><span>{label}</span><select name={name} defaultValue={value}><option value="">Todos</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>;
}

function SortLink({ label, field, params }: { label: string; field: NonNullable<AcademicOfferQuery["sort"]>; params: SearchParams }) {
  const current = one(params.sort); const currentDirection = one(params.direction);
  const direction = current === field && currentDirection !== "desc" ? "desc" : "asc";
  return <Link className="sortLink" href={urlWith(params, { sort: field, direction, page: 1 })}>{label}{current === field ? <span aria-label={currentDirection === "desc" ? "descendente" : "ascendente"}>{currentDirection === "desc" ? " ↓" : " ↑"}</span> : null}</Link>;
}

const SUMMARY_ITEMS: Array<[keyof AcademicOfferSummary, string]> = [
  ["institutions", "Instituciones"], ["offers", "Ofertas"], ["careers", "Carreras"],
  ["enrollment", "Matrícula"], ["entrants", "Ingresantes"], ["graduates", "Egresados"],
];
const numberFormatter = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 });

function OfferQuerySummary({ summary }: { summary: AcademicOfferSummary }) {
  return <section className="offerQuerySummary" aria-labelledby="offer-query-summary-title">
    <h2 id="offer-query-summary-title">Resumen de la consulta</h2>
    <div className="offerSummaryGrid">
      {SUMMARY_ITEMS.map(([key, label]) => <article key={key}><span>{label}</span><strong>{numberFormatter.format(summary[key])}</strong></article>)}
    </div>
  </section>;
}

export default async function AcademicOffersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const urlParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { const clean = one(value); if (clean) urlParams.set(key, clean); });
  const query: AcademicOfferQuery = { ...academicOfferQueryFromParams(urlParams), pageSize: 20 };

  try {
    const dataset = await getAcademicOfferDataset();
    const result = queryAcademicOffers(dataset.offers, query);
    urlParams.delete("page");
    const exportSuffix = urlParams.size ? `?${urlParams.toString()}` : "";
    return <main className="contentWidth pageTop">
      <header className="pageHeading"><p className="eyebrow">Consulta académica</p><h1>Oferta Académica</h1><p className="referenceCaption">{dataset.caption}</p></header>

      <form className="filters offerFilters" method="get" action="/ofertas">
        <label className="searchField"><span>Nombre de la carrera o título</span><input type="search" name="search" defaultValue={query.search} placeholder="Ej.: Profesorado de Educación Primaria" /></label>
        <SelectFilter name="institution" label="Institución" value={query.institution ?? ""} options={result.filters.institution} />
        <SelectFilter name="management" label="Gestión" value={query.management ?? ""} options={result.filters.management} />
        <SelectFilter name="department" label="Departamento" value={query.department ?? ""} options={result.filters.department} />
        <SelectFilter name="locality" label="Localidad" value={query.locality ?? ""} options={result.filters.locality} />
        <SelectFilter name="careerType" label="Tipo de carrera" value={query.careerType ?? ""} options={result.filters.careerType} />
        <SelectFilter name="trainingType" label="Tipo de formación" value={query.trainingType ?? ""} options={result.filters.trainingType} />
        {result.filters.careerStatus.length ? <SelectFilter name="careerStatus" label="Estado de la carrera" value={query.careerStatus ?? ""} options={result.filters.careerStatus} /> : null}
        <div className="filterActions"><button type="submit">Aplicar filtros</button><Link href="/ofertas">Limpiar filtros</Link></div>
      </form>

      <OfferQuerySummary summary={result.summary} />
      <div className="resultToolbar"><div className="resultSummary" aria-live="polite"><strong>{numberFormatter.format(result.total)}</strong> registros estadísticos · <strong>{numberFormatter.format(result.summary.offers)}</strong> ofertas académicas</div><div className="downloadActions"><Link href={`/api/export/ofertas/csv${exportSuffix}`}>↓ Descargar CSV</Link><Link href={`/api/export/ofertas/pdf${exportSuffix}`}>↓ Descargar PDF</Link></div></div>
      {!result.items.length ? <EmptyState>No se encontraron carreras con los filtros seleccionados.</EmptyState> : <>
        <div className="tableScroll"><table className="offerTable"><thead><tr>
          <th><SortLink label="Título" field="title" params={params} /></th><th><SortLink label="Institución o sede" field="institution" params={params} /></th>
          <th><SortLink label="Gestión" field="management" params={params} /></th><th><SortLink label="Localidad" field="locality" params={params} /></th>
          <th><SortLink label="Departamento" field="department" params={params} /></th><th><SortLink label="Tipo de carrera" field="careerType" params={params} /></th>
          <th><SortLink label="Tipo de formación" field="trainingType" params={params} /></th><th><SortLink label="Matrícula" field="enrollment" params={params} /></th>
          <th><SortLink label="Ingresantes" field="entrants" params={params} /></th><th><SortLink label="Egresados" field="graduates" params={params} /></th>
        </tr></thead><tbody>{result.items.map((offer) => <tr key={offer.id}>
          <td><DataValue value={offer.title} /></td><td><DataValue value={offer.institution} /></td><td><DataValue value={offer.management} /></td>
          <td><DataValue value={offer.locality} /></td><td><DataValue value={offer.department} /></td><td><DataValue value={offer.careerType} /></td>
          <td><DataValue value={offer.trainingType} /></td><td><DataValue value={offer.enrollment} /></td><td><DataValue value={offer.entrants} /></td><td><DataValue value={offer.graduates} /></td>
        </tr>)}</tbody></table></div>
        <nav className="pagination" aria-label="Paginación"><Link aria-disabled={result.page === 1} href={urlWith(params, { page: Math.max(1, result.page - 1) })}>Anterior</Link><span>Página {result.page} de {result.pageCount}</span><Link aria-disabled={result.page === result.pageCount} href={urlWith(params, { page: Math.min(result.pageCount, result.page + 1) })}>Siguiente</Link></nav>
      </>}
    </main>;
  } catch (error) {
    return <main className="contentWidth pageTop"><SourceError error={error} /></main>;
  }
}
