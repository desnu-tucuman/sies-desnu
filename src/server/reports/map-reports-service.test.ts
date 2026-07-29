import { beforeEach, describe, expect, it, vi } from "vitest";

const { getGeographicInstitutions, createMapInstitutionsPdf, createStaticInstitutionMap } = vi.hoisted(() => ({
  getGeographicInstitutions: vi.fn(), createMapInstitutionsPdf: vi.fn(async () => Buffer.from("PDF")), createStaticInstitutionMap: vi.fn(),
}));

vi.mock("@/server/services/geographic-institutions-service", () => ({ getGeographicInstitutions }));
vi.mock("./pdf-export-service", () => ({ createMapInstitutionsPdf, logPdfStage: vi.fn() }));
vi.mock("@/server/services/static-map-service", () => ({ createStaticInstitutionMap }));
vi.mock("server-only", () => ({}));

import { createMapCsvReport, createMapPdfReport } from "./map-reports-service";

const institution = (id: string, cue: string, name: string) => ({
  id, cue, name, cui: "", management: "ESTATAL", baseTrainingType: "DOCENTE", siteType: "SEDE",
  address: "Dirección", locality: "CAPITAL", department: "CAPITAL", phone: "", email: "", schedule: "", sharedBuilding: "",
  latitude: -26.8, longitude: -65.2,
});

const dataset = (rows = [institution("a", "1", "Institución incluida")]) => ({
  total: rows.length, located: rows, unlocated: [], anomalies: [], invalidCoordinates: [],
  filters: { management: [], department: [], locality: [], siteType: [], trainingType: [] },
});

describe("reportes filtrados del mapa", () => {
  beforeEach(() => {
    vi.clearAllMocks(); getGeographicInstitutions.mockResolvedValue(dataset());
    createStaticInstitutionMap.mockResolvedValue({ viewport: { width: 773, height: 250 }, tiles: [], clusters: [], attribution: "OpenStreetMap" });
  });

  it.each([
    ["sin filtros", {}],
    ["por departamento", { department: "CAPITAL" }],
    ["por formación múltiple", { trainingType: ["DOCENTE", "MIXTA"] }],
    ["por gestión", { management: "ESTATAL" }],
    ["por identificadores provenientes de CUE y nombre", { institutionId: ["unidad-a", "unidad-b"] }],
  ])("propaga al dataset la consulta %s", async (_label, query) => {
    await createMapCsvReport(query);
    expect(getGeographicInstitutions).toHaveBeenCalledWith(query);
  });

  it("genera CSV con BOM y únicamente las filas del dataset filtrado", async () => {
    getGeographicInstitutions.mockResolvedValue(dataset([institution("a", "1", "Institución incluida")]));
    const report = await createMapCsvReport({ department: "CAPITAL" });
    const text = report.body.toString("utf8");
    expect(text.startsWith("\uFEFF")).toBe(true);
    expect(text).toContain("Institución incluida");
    expect(text).not.toContain("Institución excluida");
    expect(text).toContain('"Latitud";"Longitud"');
  });

  it("incluye filtros y contadores activos en el PDF", async () => {
    await createMapPdfReport({ department: "CAPITAL", trainingType: ["DOCENTE", "MIXTA"] });
    expect(createMapInstitutionsPdf).toHaveBeenCalledWith(expect.any(Array), expect.objectContaining({
      filters: ["Departamento: CAPITAL", "Tipo de formación institucional: DOCENTE, MIXTA"],
      total: 1, located: 1, unlocated: 0,
      map: expect.objectContaining({ attribution: "OpenStreetMap" }),
    }));
  });
});
