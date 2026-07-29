import { SiesRespondsConversation } from "@/components/sies-responds/conversation";
import { safeText } from "@/domain/institutions";
import { navigationContextFromPath } from "@/services/sies-responds-router-service";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;
function one(value: string | string[] | undefined): string { return Array.isArray(value) ? value[0] ?? "" : value ?? ""; }

export default async function SiesRespondsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const initialQuery = safeText(one(params.q));
  const contextPath = safeText(one(params.contextPath)) || "/responde";
  const context = navigationContextFromPath(contextPath.startsWith("/") ? contextPath : "/responde");
  return <main className="contentWidth pageTop respondsPage">
    <header className="respondsPageHeading"><div><p className="eyebrow">Orientación conversacional</p><h1>SIES Responde</h1><p>Consulta en lenguaje cotidiano información sobre instituciones, carreras, autoridades y territorio.</p></div><div className="respondsPhaseBadge">Fase inicial · orientación por temas</div></header>
    <div className="respondsNotice" role="note"><strong>Alcance de las respuestas</strong><span>Las respuestas se basan exclusivamente en los datos disponibles en el SIES.</span></div>
    <SiesRespondsConversation initialQuery={initialQuery} context={context} />
    <p className="respondsPrivacy">SIES Responde utiliza exclusivamente información institucional disponible en el sistema. No debe utilizarse para ingresar datos personales, sensibles o confidenciales.</p>
  </main>;
}
