import { describe, expect, it } from "vitest";
import type { AcademicOfferItem } from "../domain/academic-offer";
import type { InstitutionDirectoryItem } from "../domain/institutions";
import { buildSiesMapUrl, institutionIdsForOfferSearch } from "./sies-map-query-service";

describe("acciones del mapa de SIES Responde", () => {
  it("traslada título y gestión usando los parámetros existentes del mapa", () => {
    expect(buildSiesMapUrl({
      intent: "ofertas", searchTerms: ["INGLES"], careerType: "PROFESORADO",
      careerTitle: "INGLES", managementType: "ESTATAL",
    })).toBe("/mapa?search=PROFESORADO+INGLES&management=ESTATAL");
  });

  it("traslada departamento y múltiples tipos de formación", () => {
    expect(buildSiesMapUrl({
      intent: "ofertas", searchTerms: ["INGLES"], careerTitle: "INGLES", department: "CAPITAL",
      trainingTypes: ["DOCENTE", "MIXTA"],
    })).toBe("/mapa?search=INGLES&trainingType=DOCENTE&trainingType=MIXTA&department=CAPITAL");
  });
});

const institution = (id: string, cue: string, name: string): InstitutionDirectoryItem => ({
  id, cue, name, cui: "", management: "ESTATAL", baseTrainingType: "DOCENTE", siteType: "SEDE",
  address: "", locality: "", department: "", phone: "", email: "", schedule: "", sharedBuilding: "",
});

const offer = (cue: string, name: string, title: string): AcademicOfferItem => ({
  id: `${cue}-${title}`, cue, institution: name, title, management: "ESTATAL", locality: "", department: "",
  careerType: "PROFESORADO", trainingType: "DOCENTE", careerStatus: "", enrollment: "", entrants: "",
  graduates: "", referenceYear: "2025",
});

describe("resolución académica de search para el mapa", () => {
  it("convierte una búsqueda de carrera en instituciones sin agrupar CUE ambiguos", () => {
    const institutions = [
      institution("a", "1", "IES CAPITAL"), institution("b", "2", "IES SUR"), institution("c", "2", "EXTENSIÓN NORTE"),
    ];
    const offers = [
      offer("1", "IES CAPITAL", "PROFESORADO DE INGLÉS"),
      offer("2", "EXTENSIÓN NORTE", "PROFESORADO DE INGLÉS"),
      offer("2", "NOMBRE SIN COINCIDENCIA", "PROFESORADO DE INGLÉS"),
      offer("1", "IES CAPITAL", "TECNICATURA EN TURISMO"),
    ];
    expect([...institutionIdsForOfferSearch(institutions, offers, "INGLES")]).toEqual(["a", "c"]);
  });
});
