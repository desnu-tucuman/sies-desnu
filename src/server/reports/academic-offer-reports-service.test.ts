import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAcademicOfferDataset, createAcademicOffersPdf } = vi.hoisted(() => ({
  getAcademicOfferDataset: vi.fn(),
  createAcademicOffersPdf: vi.fn(async (rows: unknown[], metadata: unknown) => {
    void rows; void metadata;
    return Buffer.from("PDF");
  }),
}));

vi.mock("@/domain/academic-offer", async () => import("../../domain/academic-offer"));
vi.mock("@/server/services/academic-offer-service", () => ({ getAcademicOfferDataset }));
vi.mock("./pdf-export-service", () => ({ createAcademicOffersPdf, logPdfStage: vi.fn() }));
vi.mock("server-only", () => ({}));

import type { AcademicOfferItem } from "@/domain/academic-offer";
import { createAcademicOffersCsvReport, createAcademicOffersPdfReport } from "./academic-offer-reports-service";

function offer(overrides: Partial<AcademicOfferItem>): AcademicOfferItem {
  return {
    id: "1", cue: "1", cui: "CUI-1", title: "Profesorado de Matemática", institution: "IES Capital",
    management: "PRIVADA", locality: "SAN MIGUEL", department: "CAPITAL", careerType: "PROFESORADO",
    trainingType: "DOCENTE", careerStatus: "VIGENTE", enrollment: "100", entrants: "30", graduates: "10",
    referenceYear: "2026", ...overrides,
  };
}

describe("reportes filtrados de oferta académica", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAcademicOfferDataset.mockResolvedValue({
      referenceYear: "2026",
      offers: [
        offer({ id: "a" }),
        offer({ id: "b", enrollment: "40", entrants: "12", graduates: "4" }),
        offer({ id: "c", cue: "2", cui: "CUI-2", institution: "IES Sur", management: "ESTATAL", department: "CHICLIGASTA", enrollment: "80" }),
      ],
    });
  });

  it("incorpora al PDF el resumen del mismo conjunto filtrado", async () => {
    await createAcademicOffersPdfReport({ search: "matematica", management: "privada", department: "capital" });
    expect(createAcademicOffersPdf).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: "a" }), expect.objectContaining({ id: "b" })]),
      expect.objectContaining({
        year: "2026",
        summary: { institutions: 1, offers: 1, careers: 1, enrollment: 140, entrants: 42, graduates: 14 },
      }),
    );
    expect(createAcademicOffersPdf.mock.calls[0][0]).toHaveLength(2);
  });

  it("mantiene en CSV sólo los registros del mismo filtro", async () => {
    const report = await createAcademicOffersCsvReport({ management: "estatal", department: "chicligasta" });
    const csv = report.body.toString("utf8");
    expect(csv).toContain("IES Sur");
    expect(csv).not.toContain("IES Capital");
  });
});
