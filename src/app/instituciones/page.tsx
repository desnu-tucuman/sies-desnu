import Link from "next/link";
import { DataValue, EmptyState, SourceError } from "@/components/ui";
import { institutionQueryFromParams, queryInstitutions, type InstitutionQuery } from "@/domain/institutions";
import { getInstitutionDirectory } from "@/server/services/institution-directory-service";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function urlWith(params: SearchParams, changes: Record<string, string | number | undefined>): string {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const clean = one(value);
    if (clean) next.set(key, clean);
  }
  for (const [key, value] of Object.entries(changes)) {
    if (value === undefined || value === "") next.delete(key); else next.set(key, String(value));
  }
  return `/instituciones?${next.toString()}`;
}

function SortLink({ label, field, params }: { label: string; field: NonNullable<InstitutionQuery["sort"]>; params: SearchParams }) {
  const current = one(params.sort);
  const currentDirection = one(params.direction);
  const direction = current === field && currentDirection !== "desc" ? "desc" : "asc";
  return <Link className="sortLink" href={urlWith(params, { sort: field, direction, page: 1 })}>{label}{current === field ? <span aria-label={currentDirection === "desc" ? "descendente" : "ascendente"}>{currentDirection === "desc" ? " ↓" : " ↑"}</span> : null}</Link>;
}

function SelectFilter({ name, label, value, options }: { name: string; label: string; value: string; options: string[] }) {
  return <label><span>{label}</span><select name={name} defaultValue={value}><option value="">Todos</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>;
}

export default async function InstitutionsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  try {
    const directory = await getInstitutionDirectory();
    const urlParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => { const clean = one(value); if (clean) urlParams.set(key, clean); });
    const query: InstitutionQuery = { ...institutionQueryFromParams(urlParams), pageSize: 20 };
    const result = queryInstitutions(directory.institutions, query);
    urlParams.delete("page");
    const exportQuery = urlParams.toString();
    const exportSuffix = exportQuery ? `?${exportQuery}` : "";

    return <main className="contentWidth pageTop">
      <header className="pageHeading"><p className="eyebrow">Consulta institucional</p><h1>Instituciones, sedes y extensiones</h1><p>Directorio institucional de sedes, anexos y extensiones áulicas registrado en MAESTRA_INSTITUCIONES.</p></header>

      <form className="filters" method="get" action="/instituciones">
        <label className="searchField"><span>Nombre del establecimiento o CUE</span><input type="search" name="search" defaultValue={query.search} placeholder="Ej.: Ext. Áulica Santa Ana" /></label>
        <SelectFilter name="management" label="Gestión" value={query.management ?? ""} options={result.filters.management} />
        <SelectFilter name="department" label="Departamento" value={query.department ?? ""} options={result.filters.department} />
        <SelectFilter name="locality" label="Localidad" value={query.locality ?? ""} options={result.filters.locality} />
        <SelectFilter name="siteType" label="Tipo de sede" value={query.siteType ?? ""} options={result.filters.siteType} />
        <SelectFilter name="trainingType" label="Tipo de formación institucional" value={query.trainingType ?? ""} options={result.filters.trainingType} />
        <div className="filterActions"><button type="submit">Aplicar filtros</button><Link href="/instituciones">Limpiar filtros</Link></div>
      </form>

      <div className="resultToolbar"><div className="resultSummary" aria-live="polite"><strong>{result.total}</strong> registros encontrados</div><div className="downloadActions"><Link href={`/api/export/instituciones/csv${exportSuffix}`}>↓ Descargar CSV</Link><Link href={`/api/export/instituciones/pdf${exportSuffix}`}>↓ Descargar PDF</Link></div></div>
      {result.items.length === 0 ? <EmptyState>No se encontraron instituciones con los filtros seleccionados. Pruebe limpiar o ampliar la búsqueda.</EmptyState> : <>
        <div className="tableScroll"><table><thead><tr>
          <th><SortLink label="Institución o sede" field="name" params={params} /></th><th>CUE</th>
          <th><SortLink label="Gestión" field="management" params={params} /></th>
          <th><SortLink label="Localidad" field="locality" params={params} /></th>
          <th><SortLink label="Departamento" field="department" params={params} /></th>
          <th><SortLink label="Tipo de sede" field="siteType" params={params} /></th>
          <th><SortLink label="Tipo de formación institucional" field="trainingType" params={params} /></th>
        </tr></thead><tbody>{result.items.map((institution) => <tr key={institution.id}>
          <td><Link className="institutionLink" href={`/instituciones/${institution.id}`}>{institution.name}</Link></td>
          <td><DataValue value={institution.cue} /></td><td><DataValue value={institution.management} /></td>
          <td><DataValue value={institution.locality} /></td><td><DataValue value={institution.department} /></td>
          <td><DataValue value={institution.siteType} /></td><td><DataValue value={institution.baseTrainingType} /></td>
        </tr>)}</tbody></table></div>
        <nav className="pagination" aria-label="Paginación"><Link aria-disabled={result.page === 1} href={result.page === 1 ? urlWith(params, { page: 1 }) : urlWith(params, { page: result.page - 1 })}>Anterior</Link><span>Página {result.page} de {result.pageCount}</span><Link aria-disabled={result.page === result.pageCount} href={result.page === result.pageCount ? urlWith(params, { page: result.pageCount }) : urlWith(params, { page: result.page + 1 })}>Siguiente</Link></nav>
      </>}
    </main>;
  } catch (error) {
    return <main className="contentWidth pageTop"><SourceError error={error} /></main>;
  }
}
