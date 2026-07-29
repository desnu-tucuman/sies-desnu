import { describe, expect, it } from "vitest";
import { MANAGEMENT_MARKER_COLORS, clusterManagementKind, managementMarkerKind } from "./map-marker-style";

describe("codificación de marcadores por gestión", () => {
  it("asigna azul institucional oscuro a gestión estatal normalizada", () => {
    expect(managementMarkerKind("Estatal")).toBe("state");
    expect(managementMarkerKind("ESTATAL")).toBe("state");
    expect(MANAGEMENT_MARKER_COLORS.state).toBe("#123E68");
  });

  it("asigna azul institucional claro a gestión privada normalizada", () => {
    expect(managementMarkerKind("Privado")).toBe("private");
    expect(managementMarkerKind("PRIVADO")).toBe("private");
    expect(MANAGEMENT_MARKER_COLORS.private).toBe("#155FA4");
  });

  it("asigna gris a gestión desconocida o vacía", () => {
    expect(managementMarkerKind("")).toBe("unknown");
    expect(managementMarkerKind("Cooperativa")).toBe("unknown");
    expect(MANAGEMENT_MARKER_COLORS.unknown).toBe("#5C6F79");
  });

  it("clasifica un cluster con gestiones distintas como mixto", () => {
    expect(clusterManagementKind(["Estatal", "Privado"])).toBe("mixed");
  });
});
