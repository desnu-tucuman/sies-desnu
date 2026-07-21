import Link from "next/link";
import { DataValue, EmptyState, SourceError } from "@/components/ui";
import { authorityQueryFromParams, emailHref, queryAuthorities, telephoneHref, type AuthorityDirectoryQuery } from "@/domain/authorities-directory";
import { getAuthoritiesDirectory } from "@/server/services/authorities-directory-service";

export const dynamic = "force-dynamic";
type SearchParams = Record<string, string | string[] | undefined>;
function one(value: string | string[] | undefined): string { return Array.isArray(value) ? value[0] ?? "" : value ?? ""; }
function urlWith(params: SearchParams, changes: Record<string, string | number | undefined>): string {
  const next = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { const clean = one(value); if (clean) next.set(key, clean); });
  Object.entries(changes).forEach(([key, value]) => { if (value === undefined || value === "") next.delete(key); else next.set(key, String(value)); });
  return `/autoridades?${next.toString()}`;
}
function SelectFilter({ name, label, value, options }: { name: string; label: string; value: string; options: string[] }) {
  return <label><span>{label}</span><select name={name} defaultValue={value}><option value="">Todos</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>;
}
function SortLink({ label, field, params }: { label: string; field: NonNullable<AuthorityDirectoryQuery["sort"]>; params: SearchParams }) {
  const current = one(params.sort); const currentDirection = one(params.direction); const direction = current === field && currentDirection !== "desc" ? "desc" : "asc";
  return <Link className="sortLink" href={urlWith(params, { sort: field, direction, page: 1 })}>{label}{current === field ? <span aria-label={currentDirection === "desc" ? "descendente" : "ascendente"}>{currentDirection === "desc" ? " ↓" : " ↑"}</span> : null}</Link>;
}

export default async function AuthoritiesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams; const urlParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { const clean = one(value); if (clean) urlParams.set(key, clean); });
  const query: AuthorityDirectoryQuery = { ...authorityQueryFromParams(urlParams), pageSize: 20 };
  try {
    const directory = await getAuthoritiesDirectory();
    const result = queryAuthorities(directory.authorities, query);
    urlParams.delete("page"); const exportSuffix = urlParams.size ? `?${urlParams.toString()}` : "";
    return <main className="contentWidth pageTop">
      <header className="pageHeading"><p className="eyebrow">Información institucional</p><h1>Directorio de autoridades</h1><p>Autoridades registradas para instituciones, sedes, anexos y extensiones áulicas.</p></header>
      <form className="filters authorityFilters" method="get" action="/autoridades">
        <label className="searchField"><span>Apellido y nombre de la autoridad</span><input type="search" name="search" defaultValue={query.search} placeholder="Ej.: Pérez" /></label>
        <label><span>Institución o CUE</span><input type="search" name="institution" defaultValue={query.institution} placeholder="Nombre o CUE" /></label>
        <SelectFilter name="role" label="Cargo" value={query.role ?? ""} options={result.filters.role} />
        <SelectFilter name="management" label="Gestión" value={query.management ?? ""} options={result.filters.management} />
        <SelectFilter name="department" label="Departamento" value={query.department ?? ""} options={result.filters.department} />
        <SelectFilter name="locality" label="Localidad" value={query.locality ?? ""} options={result.filters.locality} />
        <SelectFilter name="siteType" label="Tipo de sede" value={query.siteType ?? ""} options={result.filters.siteType} />
        {result.filters.status.length > 1 ? <SelectFilter name="status" label="Estado de autoridad" value={query.status ?? ""} options={result.filters.status} /> : null}
        <div className="filterActions"><button type="submit">Aplicar filtros</button><Link href="/autoridades">Limpiar filtros</Link></div>
      </form>

      <section className="authorityMetrics" aria-label="Indicadores del directorio">
        <article><span>Autoridades encontradas</span><strong>{result.total}</strong></article><article><span>Instituciones representadas</span><strong>{result.institutionsRepresented}</strong></article>
        <article><span>Registros sin teléfono</span><strong>{result.withoutPhone}</strong></article><article><span>Registros sin correo</span><strong>{result.withoutEmail}</strong></article>
      </section>
      {directory.acephalousInstitutions.length ? <details className="acephalyNotice"><summary>ACEFALÍA <span>{directory.acephalousInstitutions.length}</span></summary><ul>{directory.acephalousInstitutions.map((item) => <li key={item.institutionId}><strong>ACEFALÍA</strong> — <Link href={`/instituciones/${item.institutionId}`}>{item.institution}</Link></li>)}</ul></details> : null}

      <div className="resultToolbar"><div className="resultSummary"><strong>{result.total}</strong> resultados</div><div className="downloadActions"><Link href={`/api/export/autoridades/csv${exportSuffix}`}>↓ Descargar CSV</Link><Link href={`/api/export/autoridades/pdf${exportSuffix}`}>↓ Descargar PDF</Link></div></div>
      {!result.items.length ? <EmptyState>No se encontraron autoridades con los filtros seleccionados.</EmptyState> : <>
        <div className="tableScroll"><table className="authorityTable"><thead><tr>
          <th><SortLink label="Cargo" field="role" params={params} /></th><th><SortLink label="Apellido y nombre" field="name" params={params} /></th><th><SortLink label="Institución o sede" field="institution" params={params} /></th>
          <th><SortLink label="Gestión" field="management" params={params} /></th><th><SortLink label="Tipo de sede" field="siteType" params={params} /></th><th><SortLink label="Localidad" field="locality" params={params} /></th>
          <th><SortLink label="Departamento" field="department" params={params} /></th><th>Teléfono</th><th>Correo electrónico</th>
        </tr></thead><tbody>{result.items.map((authority) => {
          const phoneLink = telephoneHref(authority.phone); const mailLink = emailHref(authority.email);
          return <tr key={authority.id}><td><DataValue value={authority.role} /></td><td><DataValue value={authority.name} /></td><td><Link className="institutionLink" href={`/instituciones/${authority.institutionId}`}>{authority.institution}</Link></td>
            <td><DataValue value={authority.management} /></td><td><DataValue value={authority.siteType} /></td><td><DataValue value={authority.locality} /></td><td><DataValue value={authority.department} /></td>
            <td>{phoneLink ? <a href={phoneLink}>{authority.phone}</a> : <DataValue value={authority.phone} />}</td><td>{mailLink ? <a href={mailLink}>{authority.email}</a> : <DataValue value={authority.email} />}</td></tr>;
        })}</tbody></table></div>
        <nav className="pagination" aria-label="Paginación"><Link aria-disabled={result.page === 1} href={urlWith(params, { page: Math.max(1, result.page - 1) })}>Anterior</Link><span>Página {result.page} de {result.pageCount}</span><Link aria-disabled={result.page === result.pageCount} href={urlWith(params, { page: Math.min(result.pageCount, result.page + 1) })}>Siguiente</Link></nav>
      </>}
    </main>;
  } catch (error) { return <main className="contentWidth pageTop"><SourceError error={error} /></main>; }
}
