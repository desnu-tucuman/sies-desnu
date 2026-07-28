import Link from "next/link";
import { MultiSelectFilter } from "@/components/multi-select-filter";
import { EmptyState, SourceError } from "@/components/ui";
import { MapLoader } from "@/components/map/map-loader";
import { institutionQueryFromParams } from "@/domain/institutions";
import { toUrlSearchParams, type SearchParamsRecord } from "@/domain/url-params";
import { getGeographicInstitutions } from "@/server/services/geographic-institutions-service";

export const dynamic = "force-dynamic";

type SearchParams = SearchParamsRecord;

function SelectFilter({ name, label, value, options }: { name: string; label: string; value: string; options: string[] }) {
  return <label><span>{label}</span><select name={name} defaultValue={value}><option value="">Todos</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>;
}

export default async function MapPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const urlParams = toUrlSearchParams(params);
  const query = institutionQueryFromParams(urlParams);

  try {
    const dataset = await getGeographicInstitutions(query);
    return <main className="contentWidth pageTop mapPage">
      <header className="pageHeading"><p className="eyebrow">Visualización territorial</p><h1>Mapa institucional</h1><p>Instituciones, sedes, anexos y extensiones áulicas registradas en MAESTRA_INSTITUCIONES.</p></header>

      <form className="filters mapFilters" method="get" action="/mapa">
        <label className="searchField"><span>Nombre del establecimiento o CUE</span><input type="search" name="search" defaultValue={query.search} placeholder="Ej.: Ext. Áulica Santa Ana" /></label>
        <SelectFilter name="management" label="Gestión" value={query.management ?? ""} options={dataset.filters.management} />
        <SelectFilter name="department" label="Departamento" value={query.department ?? ""} options={dataset.filters.department} />
        <SelectFilter name="locality" label="Localidad" value={query.locality ?? ""} options={dataset.filters.locality} />
        <SelectFilter name="siteType" label="Tipo de sede" value={query.siteType ?? ""} options={dataset.filters.siteType} />
        <MultiSelectFilter name="trainingType" label="Tipo de formación institucional" value={query.trainingType ?? []} options={dataset.filters.trainingType} />
        <div className="filterActions"><button type="submit">Aplicar filtros</button><Link href="/mapa">Limpiar filtros</Link></div>
      </form>

      <section className="mapMetrics" aria-label="Resumen de ubicación">
        <article><span>Total filtrado</span><strong>{dataset.total}</strong></article>
        <article><span>Registros ubicados</span><strong>{dataset.located.length}</strong></article>
        <article><span>Sin coordenadas válidas</span><strong>{dataset.unlocated.length}</strong></article>
      </section>

      {dataset.located.length ? <section className="mapFrame" aria-label="Mapa de instituciones"><div className="mapLegend"><span><i className="legendHeadquarters" /> Sede</span><span><i className="legendAnnex" /> Anexo</span><span><i className="legendExtension" /> Extensión áulica</span></div><MapLoader institutions={dataset.located} /></section> : <EmptyState>No hay puntos con coordenadas válidas para los filtros seleccionados.</EmptyState>}

      <details className="unlocatedPanel">
        <summary>Ver registros sin ubicación <span>{dataset.unlocated.length}</span></summary>
        {dataset.unlocated.length ? <div className="tableScroll"><table><thead><tr><th>Institución</th><th>CUE</th><th>Localidad</th><th>Departamento</th><th>Tipo de sede</th></tr></thead><tbody>{dataset.unlocated.map((institution) => <tr key={institution.id}><td><Link className="institutionLink" href={`/instituciones/${institution.id}`}>{institution.name}</Link></td><td>{institution.cue || "No hay datos"}</td><td>{institution.locality || "No hay datos"}</td><td>{institution.department || "No hay datos"}</td><td>{institution.siteType || "No hay datos"}</td></tr>)}</tbody></table></div> : <p className="unlocatedEmpty">Todos los registros filtrados poseen coordenadas válidas.</p>}
      </details>
    </main>;
  } catch (error) {
    return <main className="contentWidth pageTop"><SourceError error={error} /></main>;
  }
}
