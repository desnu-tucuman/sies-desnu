import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { MapPopupContent } from "./map-popup-content";

it("el popup conserva el tipo de sede", () => {
  const html = renderToStaticMarkup(<MapPopupContent institution={{
    id: "a", cue: "1", cui: "", name: "Extensión", management: "Estatal", baseTrainingType: "DOCENTE",
    siteType: "Extensión Áulica", address: "", locality: "", department: "", phone: "", email: "", schedule: "", sharedBuilding: "",
    latitude: -26.8, longitude: -65.2,
  }} />);
  expect(html).toContain("Tipo de sede"); expect(html).toContain("Extensión Áulica");
});

it("el popup de oferta muestra datos académicos y destaca la carrera buscada", () => {
  const html = renderToStaticMarkup(<MapPopupContent institution={{
    id: "b", cue: "2", cui: "2", name: "Extensión Santa Ana", responsibleInstitution: "IES Aguilares", management: "Estatal", baseTrainingType: "",
    siteType: "Extensión Áulica", address: "", locality: "SANTA ANA", department: "RÍO CHICO", phone: "", email: "", schedule: "", sharedBuilding: "",
    latitude: -27.4, longitude: -65.6, mapMode: "offer", offerType: "Mixta", careers: ["Profesorado de Inglés", "Desarrollo de Software"],
    matchedCareers: ["Desarrollo de Software"], enrollment: "100", entrants: "25", graduates: "5", referenceYear: "2026",
  }} />);
  expect(html).toContain("Institución responsable"); expect(html).toContain("Carreras vigentes"); expect(html).toContain("<mark>Desarrollo de Software</mark>"); expect(html).toContain("Matrícula 2026");
});
