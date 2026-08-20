import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LocatedInstitution } from "@/domain/geography";

const { getGeographicInstitutions, getGeographicOffers, createMapInstitutionsPdf, createStaticInstitutionMap } = vi.hoisted(() => ({
  getGeographicInstitutions: vi.fn(), getGeographicOffers: vi.fn(), createMapInstitutionsPdf: vi.fn(async () => Buffer.from("PDF")), createStaticInstitutionMap: vi.fn(),
}));

vi.mock("@/server/services/geographic-institutions-service", () => ({ getGeographicInstitutions }));
vi.mock("@/server/services/geographic-offers-service", () => ({ getGeographicOffers }));
vi.mock("./pdf-export-service", () => ({ createMapInstitutionsPdf, logPdfStage: vi.fn() }));
vi.mock("@/server/services/static-map-service", () => ({ createStaticInstitutionMap }));
vi.mock("server-only", () => ({}));

import { createMapCsvReport, createMapPdfReport } from "./map-reports-service";

const institution = (id: string, cue: string, name: string): LocatedInstitution => ({
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
    getGeographicOffers.mockResolvedValue(dataset());
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
    expect(text).toContain('"Tipo de sede"');
    expect(text).toContain('"SEDE"');
    expect(text).toContain('"Latitud";"Longitud"');
  });

  it("incluye filtros y contadores activos en el PDF", async () => {
    await createMapPdfReport({ department: "CAPITAL", trainingType: ["DOCENTE", "MIXTA"] });
    expect(createMapInstitutionsPdf).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ siteType: "SEDE" }),
    ]), expect.objectContaining({
      filters: ["Vista: Instituciones", "Departamento: CAPITAL", "Tipo de formación institucional: DOCENTE, MIXTA"],
      total: 1, located: 1, unlocated: 0,
      map: expect.objectContaining({ attribution: "OpenStreetMap" }),
    }));
  });

  it("exporta la vista de oferta con el dataset y columnas académicas filtradas", async () => {
    getGeographicOffers.mockResolvedValue(dataset([{
      ...institution("oferta", "2", "Extensión Santa Ana"), mapMode: "offer", responsibleInstitution: "IES Aguilares", offerType: "Mixta",
      careers: ["Desarrollo de Software"], enrollment: "100", entrants: "25", graduates: "5",
    }]));
    const report = await createMapCsvReport({ view: "offer", search: "software" });
    const text = report.body.toString("utf8");
    expect(getGeographicOffers).toHaveBeenCalledWith({ view: "offer", search: "software" });
    expect(text).toContain("Institución responsable"); expect(text).toContain("Desarrollo de Software"); expect(text).toContain("Matrícula 2026");
  });
});
