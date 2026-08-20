import Link from "next/link";
import { MultiSelectFilter } from "@/components/multi-select-filter";
import { EmptyState, SourceError } from "@/components/ui";
import { MapLoader } from "@/components/map/map-loader";
import { MapExportActions } from "@/components/map/map-export-actions";
import { MapManagementLegend } from "@/components/map/map-management-legend";
import { mapQueryFromParams } from "@/domain/geographic-offers";
import { toUrlSearchParams, type SearchParamsRecord } from "@/domain/url-params";
import { getGeographicInstitutions } from "@/server/services/geographic-institutions-service";
import { getGeographicOffers } from "@/server/services/geographic-offers-service";

export const dynamic = "force-dynamic";

type SearchParams = SearchParamsRecord;

function SelectFilter({ name, label, value, options }: { name: string; label: string; value: string; options: string[] }) {
  return <label><span>{label}</span><select name={name} defaultValue={value}><option value="">Todos</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>;
}

export default async function MapPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const urlParams = toUrlSearchParams(params);
  const query = mapQueryFromParams(urlParams);
  const offerMode = query.view === "offer";
  const exportSuffix = urlParams.size ? `?${urlParams.toString()}` : "";
  const shared = new URLSearchParams();
  if (query.search) shared.set("search", query.search);
  if (query.management) shared.set("management", query.management);
  if (query.department) shared.set("department", query.department);
  if (query.locality) shared.set("locality", query.locality);
  if (query.siteType) shared.set("siteType", query.siteType);
  const viewHref = (view: "instituciones" | "oferta") => { const next = new URLSearchParams(shared); next.set("vista", view); return `/mapa?${next}`; };

  try {
    const dataset = offerMode
      ? await getGeographicOffers(query)
      : await getGeographicInstitutions({ search: query.search, management: query.management, department: query.department, locality: query.locality, siteType: query.siteType, trainingType: query.trainingType, institutionId: query.institutionId });
    return <main className="contentWidth pageTop mapPage">
      <header className="pageHeading"><p className="eyebrow">Visualización territorial</p><h1>Mapa institucional</h1><p>{offerMode ? "Oferta formativa vigente en sedes, anexos y extensiones áulicas de Educación Superior No Universitaria." : "Instituciones, sedes, anexos y extensiones áulicas registradas en MAESTRA_INSTITUCIONES."}</p></header>

      <nav className="mapViewSelector" aria-label="Visualizar en el mapa"><span>Visualizar:</span><Link href={viewHref("instituciones")} aria-current={!offerMode ? "page" : undefined}>Instituciones</Link><Link href={viewHref("oferta")} aria-current={offerMode ? "page" : undefined}>Oferta 2026</Link></nav>

      <form className="filters mapFilters" method="get" action="/mapa">
        <input type="hidden" name="vista" value={offerMode ? "oferta" : "instituciones"} />
        <label className="searchField"><span>{offerMode ? "Buscar carrera, institución, CUE o CUI" : "Buscar institución, CUE o CUI"}</span><input type="search" name="search" aria-label={offerMode ? "Buscar carrera, institución, CUE o CUI" : "Buscar institución, CUE o CUI"} defaultValue={query.search} placeholder={offerMode ? "Ej.: Desarrollo de Software, IES Aguilares o 900034000" : "Ej.: IES Aguilares o 900034000"} /></label>
        <SelectFilter name="management" label="Gestión" value={query.management ?? ""} options={dataset.filters.management} />
        <SelectFilter name="department" label="Departamento" value={query.department ?? ""} options={dataset.filters.department} />
        <SelectFilter name="locality" label="Localidad" value={query.locality ?? ""} options={dataset.filters.locality} />
        <SelectFilter name="siteType" label="Tipo de sede" value={query.siteType ?? ""} options={dataset.filters.siteType} />
        {offerMode
          ? <SelectFilter name="offerType" label="Tipo de oferta" value={query.offerType ?? ""} options={"offerType" in dataset.filters ? dataset.filters.offerType : []} />
          : <MultiSelectFilter name="trainingType" label="Tipo de formación institucional" value={query.trainingType ?? []} options={"trainingType" in dataset.filters ? dataset.filters.trainingType : []} />}
        <div className="filterActions"><button type="submit">Aplicar filtros</button><Link href={`/mapa?vista=${offerMode ? "oferta" : "instituciones"}`}>Limpiar filtros</Link></div>
      </form>

      <MapExportActions total={dataset.total} exportSuffix={exportSuffix} mode={offerMode ? "offer" : "institutions"} />

      <section className="mapMetrics" aria-label="Resumen de ubicación">
        <article><span>{offerMode ? "Unidades de dictado" : "Total filtrado"}</span><strong>{dataset.total}</strong></article>
        <article><span>{offerMode ? "Unidades ubicadas" : "Registros ubicados"}</span><strong>{dataset.located.length}</strong></article>
        <article><span>Sin coordenadas válidas</span><strong>{dataset.unlocated.length}</strong></article>
      </section>

      {dataset.located.length ? <section className="mapFrame" aria-label={offerMode ? "Mapa de oferta 2026" : "Mapa de instituciones"}><MapManagementLegend managementValues={dataset.located.map((institution) => institution.management)} /><MapLoader institutions={dataset.located} /></section> : <EmptyState>No hay puntos con coordenadas válidas para los filtros seleccionados.</EmptyState>}

      <details className="unlocatedPanel">
        <summary>Ver registros sin ubicación <span>{dataset.unlocated.length}</span></summary>
        {dataset.unlocated.length ? <div className="tableScroll"><table><thead><tr><th>{offerMode ? "Unidad de dictado" : "Institución"}</th><th>CUE</th><th>Localidad</th><th>Departamento</th><th>Tipo de sede</th></tr></thead><tbody>{dataset.unlocated.map((institution) => <tr key={institution.id}><td>{offerMode ? institution.name : <Link className="institutionLink" href={`/instituciones/${institution.id}`}>{institution.name}</Link>}</td><td>{institution.cue || "No hay datos"}</td><td>{institution.locality || "No hay datos"}</td><td>{institution.department || "No hay datos"}</td><td>{institution.siteType || "No hay datos"}</td></tr>)}</tbody></table></div> : <p className="unlocatedEmpty">Todos los registros filtrados poseen coordenadas válidas.</p>}
      </details>
    </main>;
  } catch (error) {
    return <main className="contentWidth pageTop"><SourceError error={error} /></main>;
  }
}
