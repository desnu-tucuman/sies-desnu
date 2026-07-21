import Link from "next/link";
import { SourceError } from "@/components/ui";
import { getInstitutionDataset } from "@/server/services/institutions-service";

export const dynamic = "force-dynamic";

const shortcuts = [
  { title: "Consulta de instituciones", text: "Busque sedes, anexos y extensiones áulicas.", href: "/instituciones", active: true },
  { title: "Consulta de ofertas", text: "Explore carreras y lugares de dictado.", active: true, href: "/ofertas" },
  { title: "Directorio de autoridades", text: "Consulte responsables institucionales.", href: "/autoridades", active: true },
  { title: "Generación de listados", text: "Prepare informes según sus filtros.", href: "/listados", active: true },
];

export default async function HomePage() {
  try {
    const dataset = await getInstitutionDataset();
    return (
      <main>
        <section className="homeHero">
          <div className="contentWidth">
            <p className="eyebrow lightEyebrow">Dirección de Educación Superior No Universitaria</p>
            <h1>SIES</h1>
            <p className="heroTitle">Sistema de Información de Educación Superior No Universitaria</p>
            <p className="heroCopy">Una herramienta interna para consultar información institucional y académica de forma clara, directa y actualizada.</p>
            <div className="heroMeta"><span>Año de referencia <strong>{dataset.referenceYear || "No hay datos"}</strong></span><span>Última actualización <strong>{dataset.lastUpdated}</strong></span></div>
          </div>
        </section>
        <section className="contentWidth homeSection" aria-labelledby="access-title">
          <p className="eyebrow">Accesos rápidos</p><h2 id="access-title">¿Qué necesita consultar?</h2>
          <div className="shortcutGrid">
            {shortcuts.map((item) => item.active ? (
              <Link className="shortcut activeShortcut" href={item.href!} key={item.title}><span className="shortcutMark" aria-hidden="true">→</span><h3>{item.title}</h3><p>{item.text}</p></Link>
            ) : (
              <article className="shortcut disabledShortcut" key={item.title}><span className="soon">Próximamente</span><h3>{item.title}</h3><p>{item.text}</p></article>
            ))}
          </div>
        </section>
      </main>
    );
  } catch (error) {
    return <main className="contentWidth pageTop"><SourceError error={error} /></main>;
  }
}
