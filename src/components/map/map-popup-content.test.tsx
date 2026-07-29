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
