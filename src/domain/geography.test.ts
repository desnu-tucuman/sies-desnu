import { describe, expect, it } from "vitest";
import { validateInstitutionCoordinates } from "./geography";

describe("validación geográfica institucional", () => {
  it("acepta coordenadas válidas dentro de Tucumán", () => {
    expect(validateInstitutionCoordinates("-26.82", "-65.21")).toEqual({ valid: true, latitude: -26.82, longitude: -65.21 });
  });

  it("admite coma decimal", () => {
    expect(validateInstitutionCoordinates("-27,10", "-65,50")).toMatchObject({ valid: true, latitude: -27.1, longitude: -65.5 });
  });

  it("distingue ausencia, valor inválido y punto fuera de rango", () => {
    expect(validateInstitutionCoordinates("", "")).toMatchObject({ valid: false, issue: "missing" });
    expect(validateInstitutionCoordinates("dato", "-65.2")).toMatchObject({ valid: false, issue: "invalid" });
    expect(validateInstitutionCoordinates("-34.6", "-58.4")).toMatchObject({ valid: false, issue: "outside_tucuman_range" });
  });

  it("rechaza coordenadas fuera del rango global", () => {
    expect(validateInstitutionCoordinates("-126", "-65")).toMatchObject({ valid: false, issue: "invalid" });
  });
});

