import { describe, expect, it } from "vitest";
import { navigationContextFromPath, routeSiesRespondsQuery } from "./sies-responds-router-service";

describe("enrutador provisional de SIES Responde", () => {
  const cases = [
    ["Busco un instituto o una sede", "institutions", "/instituciones"],
    ["¿Dónde se dicta el Profesorado de Inglés?", "offers", "/ofertas"],
    ["¿Quién dirige el IES Aguilares?", "authorities", "/autoridades"],
    ["Muéstrame la ubicación en el mapa", "map", "/mapa"],
    ["Necesito descargar un listado PDF", "lists", "/listados"],
  ] as const;

  it.each(cases)("deriva %s al módulo esperado", (text, intent, href) => {
    const response = routeSiesRespondsQuery({ text });
    expect(response.intent).toBe(intent);
    expect(response.actions[0].href).toBe(href);
  });

  it("no inventa una respuesta cuando no reconoce el tema", () => {
    const response = routeSiesRespondsQuery({ text: "Necesito ayuda con algo" });
    expect(response.intent).toBe("unknown");
    expect(response.text).toContain("No pude determinar");
  });

  it("prepara contexto de módulo e identificador institucional", () => {
    expect(navigationContextFromPath("/instituciones/abc123")).toEqual({ path: "/instituciones/abc123", module: "institutions", institutionId: "abc123" });
  });
});
