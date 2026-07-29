import { describe, expect, it } from "vitest";
import { interpretSiesConversationalQuery } from "./sies-conversational-query-interpreter";

describe("intérprete estructurado de SIES Responde", () => {
  it("detecta indicadores académicos, año y modo", () => {
    expect(interpretSiesConversationalQuery("¿Cuántos egresados hubo en Farmacia en 2025?")).toMatchObject({ intent: "indicadores_academicos", academicIndicator: "graduates", year: "2025", searchTerms: ["FARMACIA"], analysisMode: "total" });
  });
  it("interpreta profesorados de inglés agrupados por departamento", () => {
    expect(interpretSiesConversationalQuery("¿En qué departamentos hay profesorados de inglés?")).toMatchObject({
      intent: "ofertas", careerType: "PROFESORADO", searchTerms: ["INGLES"], requestedGrouping: "department", requestedMetric: "count",
    });
  });

  it("expande la región sur sin usarla como término de búsqueda", () => {
    expect(interpretSiesConversationalQuery("¿Qué tecnicaturas se dictan en el sur?")).toMatchObject({
      intent: "ofertas", careerType: "TECNICATURA", region: "SUR", searchTerms: [],
      departments: ["MONTEROS", "CHICLIGASTA", "RIO CHICO", "JUAN BAUTISTA ALBERDI", "LA COCHA", "GRANEROS"],
    });
  });

  it("interpreta formación docente como DOCENTE o MIXTA", () => {
    expect(interpretSiesConversationalQuery("Institutos con formación docente en Capital")).toMatchObject({
      intent: "instituciones", trainingTypes: ["DOCENTE", "MIXTA"], searchTerms: ["DOCENTE", "CAPITAL"],
    });
  });

  it("extrae el nombre útil de una consulta de autoridades", () => {
    expect(interpretSiesConversationalQuery("¿Quién dirige el IES Aguilares?")).toMatchObject({ intent: "autoridades", searchTerms: ["ENSENANZA", "SUPERIOR", "AGUILARES"] });
  });

  it("separa la gestión estatal de los términos del título", () => {
    expect(interpretSiesConversationalQuery("¿Qué institutos estatales dictan el Profesorado de Inglés?")).toMatchObject({
      intent: "ofertas", managementType: "ESTATAL", careerType: "PROFESORADO", searchTerms: ["INGLES"],
    });
  });
});
