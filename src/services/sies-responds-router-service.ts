import { normalizeForMatch, safeText } from "../domain/institutions";
import type { SiesRespondsAction, SiesRespondsIntent, SiesRespondsNavigationContext, SiesRespondsQuery, SiesRespondsResponse } from "../domain/sies-responds";

const ROUTES: Record<Exclude<SiesRespondsIntent, "unknown">, { label: string; href: string; description: string }> = {
  institutions: { label: "Abrir Instituciones", href: "/instituciones", description: "la consulta institucional" },
  offers: { label: "Abrir Ofertas", href: "/ofertas", description: "la oferta académica" },
  authorities: { label: "Abrir Autoridades", href: "/autoridades", description: "el directorio de autoridades" },
  map: { label: "Abrir Mapa", href: "/mapa", description: "la ubicación territorial" },
  lists: { label: "Abrir Listados", href: "/listados", description: "la generación y descarga de listados" },
};

const KEYWORDS: Record<Exclude<SiesRespondsIntent, "unknown">, string[]> = {
  institutions: ["INSTITUTO", "INSTITUCION", "ESTABLECIMIENTO", "SEDE", "ANEXO", "EXTENSION AULICA"],
  offers: ["CARRERA", "PROFESORADO", "TECNICATURA", "OFERTA", "TITULO", "SE DICTA", "DICTAN", "CURSAR"],
  authorities: ["DIRECTOR", "DIRECTORA", "RECTOR", "RECTORA", "AUTORIDAD", "TELEFONO", "CORREO", "CONTACTO", "DIRIGE"],
  map: ["DONDE", "MAPA", "UBICACION", "CERCA", "DIRECCION", "LOCALIZAR"],
  lists: ["LISTADO", "PDF", "CSV", "DESCARGAR", "EXPORTAR", "INFORME"],
};

const PRIORITY: Array<Exclude<SiesRespondsIntent, "unknown">> = ["offers", "authorities", "lists", "map", "institutions"];

function action(intent: Exclude<SiesRespondsIntent, "unknown">): SiesRespondsAction {
  return { intent, label: ROUTES[intent].label, href: ROUTES[intent].href };
}

export function routeSiesRespondsQuery(query: SiesRespondsQuery): SiesRespondsResponse {
  const normalized = normalizeForMatch(safeText(query.text));
  const ranked = PRIORITY.map((intent) => ({
    intent,
    score: KEYWORDS[intent].filter((keyword) => normalized.includes(keyword)).length,
  })).sort((a, b) => b.score - a.score || PRIORITY.indexOf(a.intent) - PRIORITY.indexOf(b.intent));
  const primary = ranked[0];

  if (!normalized || !primary.score) {
    return {
      intent: "unknown",
      text: "No pude determinar todavía qué información necesitas. Puedes reformular la consulta o elegir uno de los módulos del SIES.",
      actions: [action("institutions"), action("offers"), action("map")],
    };
  }

  const related = ranked.filter((item) => item.score > 0 && item.intent !== primary.intent).map((item) => item.intent);
  const fallback = (["institutions", "offers", "map"] as const).filter((intent) => intent !== primary.intent);
  const actionIntents = [primary.intent, ...related, ...fallback].filter((intent, index, all) => all.indexOf(intent) === index).slice(0, 3);
  return {
    intent: primary.intent,
    text: `Esta consulta parece referirse a ${ROUTES[primary.intent].description}. Puedes continuar en el módulo correspondiente para consultar los datos disponibles.`,
    actions: actionIntents.map(action),
  };
}

export function navigationContextFromPath(path: string): SiesRespondsNavigationContext {
  const clean = path || "/";
  const segments = clean.split("/").filter(Boolean);
  const activeModule = segments[0] === "instituciones" ? "institutions"
    : segments[0] === "mapa" ? "map"
      : segments[0] === "ofertas" ? "offers"
        : segments[0] === "autoridades" ? "authorities"
          : segments[0] === "listados" ? "lists"
            : segments[0] === "responde" ? "responds"
              : segments.length === 0 ? "home" : "other";
  return { path: clean, module: activeModule, institutionId: activeModule === "institutions" && segments[1] ? segments[1] : undefined };
}

export function contextHint(module: ReturnType<typeof navigationContextFromPath>["module"]): string {
  if (module === "institutions") return "Estás consultando una institución o el directorio institucional. Puedes preguntar sobre sus datos, autoridades u oferta.";
  if (module === "offers") return "Estás consultando la oferta académica. Puedes preguntar por carreras o lugares de dictado.";
  if (module === "authorities") return "Estás consultando autoridades. Puedes preguntar por cargos o contactos institucionales.";
  if (module === "map") return "Estás consultando el mapa. Puedes preguntar por instituciones y ubicaciones.";
  if (module === "lists") return "Estás preparando listados. Puedes preguntar qué módulo contiene la información que necesitas.";
  return "Puedes preguntar sobre instituciones, carreras, autoridades, territorio o listados.";
}
