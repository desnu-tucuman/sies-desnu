import Link from "next/link";
import { ListTypeSelector } from "@/components/lists/list-type-selector";
import { MultiSelectFilter } from "@/components/multi-select-filter";
import { DataValue, EmptyState, SourceError } from "@/components/ui";
import { listReportQueryFromParams, type ListReportQuery } from "@/domain/list-reports";
import { toUrlSearchParams, type SearchParamsRecord } from "@/domain/url-params";
import { getListReport } from "@/server/services/list-reports-service";

export const dynamic = "force-dynamic";
type SearchParams = SearchParamsRecord;
function SelectFilter({ name, label, value, options }: { name: string; label: string; value: string; options?: string[] }) {
  return <label><span>{label}</span><select name={name} defaultValue={value}><option value="">Todos</option>{(options ?? []).map((option) => <option key={option} value={option}>{option}</option>)}</select></label>;
}
function CommonTerritoryFilters({ query, options, training = false }: { query: ListReportQuery; options: Record<string, string[]>; training?: boolean }) {
  return <><SelectFilter name="management" label="Gestión" value={query.management ?? ""} options={options.management} /><SelectFilter name="department" label="Departamento" value={query.department ?? ""} options={options.department} /><SelectFilter name="locality" label="Localidad" value={query.locality ?? ""} options={options.locality} /><SelectFilter name="siteType" label="Tipo de sede" value={query.siteType ?? ""} options={options.siteType} />{training ? <MultiSelectFilter name="trainingType" label="Tipo de formación institucional" value={query.institutionalTrainingTypes ?? []} options={options.trainingType ?? []} /> : null}</>;
}

export default async function ListsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams; const urlParams = toUrlSearchParams(params);
  const query = listReportQueryFromParams(urlParams);
  try {
    const report = await getListReport(query);
    urlParams.delete("preview"); const exportQuery = urlParams.toString();
    return <main className="contentWidth pageTop listsPage">
      <header className="pageHeading"><p className="eyebrow">Generador de informes</p><h1>Listados</h1><p>Seleccione un tipo, aplique filtros y genere una vista previa antes de descargar.</p></header>
      <section className="listStep"><div className="stepNumber">1</div><div><h2>Seleccione el tipo de listado</h2><ListTypeSelector value={query.type} /></div></section>
      <section className="listStep"><div className="stepNumber">2</div><div className="stepContent"><h2>Configure los filtros</h2>
        <form className="filters listFilters" method="get" action="/listados"><input type="hidden" name="type" value={query.type} /><input type="hidden" name="preview" value="1" />
          {query.type === "institutions" ? <><label className="searchField"><span>Nombre o CUE</span><input type="search" name="search" defaultValue={query.search} /></label><CommonTerritoryFilters query={query} options={report.options} training /></> : null}
          {query.type === "institution-offers" ? <><label className="searchField"><span>Título o palabra incluida</span><input type="search" name="search" defaultValue={query.search} /></label><SelectFilter name="institution" label="Institución" value={query.institution ?? ""} options={report.options.institution} /><CommonTerritoryFilters query={query} options={report.options} training /><SelectFilter name="careerType" label="Tipo de carrera" value={query.careerType ?? ""} options={report.options.careerType} /></> : null}
          {query.type === "career-places" ? <><label className="searchField"><span>Título o palabra incluida</span><input type="search" name="search" defaultValue={query.search} /></label><SelectFilter name="institution" label="Institución" value={query.institution ?? ""} options={report.options.institution} /><CommonTerritoryFilters query={query} options={report.options} /><SelectFilter name="careerType" label="Tipo de carrera" value={query.careerType ?? ""} options={report.options.careerType} /><SelectFilter name="trainingType" label="Tipo de formación" value={query.trainingType ?? ""} options={report.options.trainingType} /></> : null}
          {query.type === "authorities" ? <><label className="searchField"><span>Nombre de la autoridad</span><input type="search" name="search" defaultValue={query.search} /></label><SelectFilter name="role" label="Cargo" value={query.role ?? ""} options={report.options.role} /><SelectFilter name="institution" label="Institución" value={query.institution ?? ""} options={report.options.institution} /><CommonTerritoryFilters query={query} options={report.options} /></> : null}
          <div className="filterActions"><button type="submit">Generar vista previa</button><Link href={`/listados?type=${query.type}`}>Limpiar filtros</Link></div>
        </form>
      </div></section>

      {query.preview ? <section className="listStep previewStep"><div className="stepNumber">3</div><div className="stepContent"><div className="previewHeading"><div><h2>Vista previa</h2><p><strong>{report.rows.length}</strong> resultados{report.year ? ` · Año de referencia: ${report.year}` : ""}</p></div>{report.rows.length ? <div className="downloadActions"><Link href={`/api/export/listados/csv?${exportQuery}`}>↓ Descargar CSV</Link><Link href={`/api/export/listados/pdf?${exportQuery}`}>↓ Descargar PDF</Link></div> : null}</div>
        <div className="appliedFilters"><strong>Filtros aplicados:</strong> {report.filtersApplied.length ? report.filtersApplied.join(" · ") : "Sin filtros"}</div>
        {report.partialCount ? <div className="partialNotice"><strong>Datos parciales</strong><span>{report.partialCount} registros no pudieron completarse o vincularse con seguridad.</span></div> : null}
        {!report.rows.length ? <EmptyState>No se encontraron resultados con los filtros seleccionados.</EmptyState> : report.hierarchicalOffers ? <div className="hierarchicalPreview">{report.hierarchicalOffers.slice(0, 6).map((block) => <article key={`${block.management}-${block.institution}`}><span>{block.management}</span><h3>{block.institution}</h3><p>{block.locality || "No hay datos"} · {block.department || "No hay datos"} · {block.siteType || "No hay datos"}</p><ul>{block.offers.slice(0, 5).map((offer) => <li key={offer}>{offer}</li>)}</ul></article>)}</div> : <div className="tableScroll"><table className="listPreviewTable"><thead><tr>{report.columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{report.rows.slice(0, 10).map((row, index) => <tr key={index}>{row.map((value, cell) => <td key={cell}><DataValue value={value} /></td>)}</tr>)}</tbody></table></div>}
        {report.rows.length > 10 ? <p className="previewLimit">La vista previa muestra los primeros registros. La descarga incluye los {report.rows.length} resultados.</p> : null}
      </div></section> : null}
    </main>;
  } catch (error) { return <main className="contentWidth pageTop"><SourceError error={error} /></main>; }
}
