import { describe, expect, it } from "vitest";
import { buildSiesMapUrl } from "./sies-map-query-service";

describe("acciones del mapa de SIES Responde", () => {
  it("abre las consultas académicas en Oferta 2026 y usa el título como búsqueda", () => {
    expect(buildSiesMapUrl({
      intent: "ofertas", searchTerms: ["INGLES"], careerType: "PROFESORADO",
      careerTitle: "INGLES", managementType: "ESTATAL",
    }, ["unit-a", "unit-b"])).toBe("/mapa?vista=oferta&search=INGLES&institutionId=unit-a&institutionId=unit-b&management=ESTATAL");
  });

  it("separa departamento y múltiples tipos de formación sin construir search", () => {
    expect(buildSiesMapUrl({
      intent: "instituciones", searchTerms: ["DOCENTE", "CAPITAL"], department: "CAPITAL",
      trainingTypes: ["DOCENTE", "MIXTA"],
    })).toBe("/mapa?trainingType=DOCENTE&trainingType=MIXTA&department=CAPITAL");
  });

  it("usa exclusivamente nombre o CUE institucional para search", () => {
    expect(buildSiesMapUrl({
      intent: "instituciones", searchTerms: ["CAPITAL"], institutionName: "IES CAPITAL",
      institutionCue: "900012300", locality: "SAN MIGUEL DE TUCUMÁN", siteType: "SEDE",
    })).toBe("/mapa?search=900012300&locality=SAN+MIGUEL+DE+TUCUM%C3%81N&siteType=SEDE");
  });
});
