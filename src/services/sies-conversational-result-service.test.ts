import { describe, expect, it } from "vitest";
import type { AcademicOfferItem } from "../domain/academic-offer";
import { interpretSiesConversationalQuery } from "./sies-conversational-query-interpreter";
import { resolveOfferConversation } from "./sies-conversational-result-service";

const offer = (overrides: Partial<AcademicOfferItem>): AcademicOfferItem => ({
  id: "1", cue: "1", cui: "1", title: "PROFESORADO DE INGLÉS", institution: "IES CAPITAL", management: "ESTATAL",
  locality: "SAN MIGUEL DE TUCUMÁN", department: "CAPITAL", careerType: "PROFESORADO", trainingType: "DOCENTE",
  careerStatus: "ACTIVA", enrollment: "10", entrants: "2", graduates: "1", referenceYear: "2025", ...overrides,
});

describe("resultados conversacionales basados en datos", () => {
  it("cuenta ofertas, instituciones y departamentos y agrupa instituciones", () => {
    const text = "¿En qué departamentos hay profesorados de inglés?";
    const rows = [
      offer({ id: "1", cue: "1" }),
      offer({ id: "2", cue: "1", title: "PROFESORADO DE INGLÉS - SEGUNDA COHORTE" }),
      offer({ id: "3", cue: "2", institution: "IES MONTEROS", locality: "MONTEROS", department: "MONTEROS" }),
      offer({ id: "4", cue: "3", institution: "IES TÉCNICO", title: "TECNICATURA EN INFORMÁTICA", careerType: "TECNICATURA" }),
    ];
    const result = resolveOfferConversation(text, interpretSiesConversationalQuery(text), rows, "2025");
    expect(result.metrics).toEqual(expect.arrayContaining([
      { label: "Departamentos", value: 2 }, { label: "Instituciones", value: 2 }, { label: "Ofertas", value: 3 },
    ]));
    expect(result.groups.map((group) => group.label)).toEqual(["CAPITAL", "MONTEROS"]);
    expect(result.groups[0]).toMatchObject({ count: 2, items: [{ label: "IES CAPITAL" }] });
    expect(result.institutionIds).toHaveLength(2);
  });

  it("limita las tecnicaturas a los departamentos expandidos de la región", () => {
    const text = "¿Qué tecnicaturas se dictan en el sur?";
    const rows = [
      offer({ id: "1", title: "TECNICATURA EN TURISMO", careerType: "TECNICATURA", department: "MONTEROS" }),
      offer({ id: "2", title: "TECNICATURA EN TURISMO", careerType: "TECNICATURA", department: "CAPITAL" }),
      offer({ id: "3", title: "TECNICATURA EN TURISMO", careerType: "TECNICATURA", department: "RÍO CHICO" }),
    ];
    const result = resolveOfferConversation(text, interpretSiesConversationalQuery(text), rows, "2025");
    expect(result.totalMatches).toBe(2);
    expect(result.groups.map((group) => group.label)).toEqual(["MONTEROS", "RÍO CHICO"]);
  });
});
