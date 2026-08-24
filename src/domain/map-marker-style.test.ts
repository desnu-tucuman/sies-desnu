import { describe, expect, it } from "vitest";
import { MANAGEMENT_MARKER_COLORS, clusterManagementKind, clusterMarkerColor, managementMarkerKind } from "./map-marker-style";

describe("codificación de marcadores por gestión", () => {
  it("asigna azul institucional oscuro a gestión estatal normalizada", () => {
    expect(managementMarkerKind("Estatal")).toBe("state");
    expect(managementMarkerKind("ESTATAL")).toBe("state");
    expect(MANAGEMENT_MARKER_COLORS.state).toBe("#0B4F8A");
  });

  it("asigna naranja a gestión privada normalizada", () => {
    expect(managementMarkerKind("Privado")).toBe("private");
    expect(managementMarkerKind("PRIVADO")).toBe("private");
    expect(MANAGEMENT_MARKER_COLORS.private).toBe("#E67E22");
  });

  it("asigna gris a gestión desconocida o vacía", () => {
    expect(managementMarkerKind("")).toBe("unknown");
    expect(managementMarkerKind("Cooperativa")).toBe("unknown");
    expect(MANAGEMENT_MARKER_COLORS.unknown).toBe("#5C6F79");
  });

  it("clasifica un cluster con gestiones distintas como mixto", () => {
    expect(clusterManagementKind(["Estatal", "Privado"])).toBe("mixed");
    expect(clusterMarkerColor(["Estatal", "Privado"])).toBe(MANAGEMENT_MARKER_COLORS.unknown);
    expect(clusterMarkerColor(["Estatal", "ESTATAL"])).toBe("#0B4F8A");
    expect(clusterMarkerColor(["Privado", "PRIVADA"])).toBe("#E67E22");
  });
});
