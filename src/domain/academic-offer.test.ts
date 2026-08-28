import { describe, expect, it } from "vitest";
import {
  AcademicOfferConfigurationError,
  consolidatedDataCaption,
  createAcademicOfferRows,
  filterCareersByConsolidatedYear,
  NoConsolidatedAcademicDataError,
  requireConsolidatedReferenceYear,
  summarizeAcademicOffers,
  requireConsolidatedAcademicRows,
  queryAcademicOffers,
} from "./academic-offer";

describe("año consolidado de Oferta Académica", () => {
  it("lee exclusivamente ANIO_ACTUAL", () => {
    expect(requireConsolidatedReferenceYear(new Map([
      ["ANIO_ACTUAL", "2025"], ["CICLO_VIGENTE", "2026"], ["MOSTRAR_SOLO_VIGENTE", "TRUE"],
    ]))).toBe("2025");
  });

  it("no acepta un parámetro ausente, vacío o no numérico", () => {
    expect(() => requireConsolidatedReferenceYear(new Map())).toThrow(AcademicOfferConfigurationError);
    expect(() => requireConsolidatedReferenceYear(new Map([["ANIO_ACTUAL", "  "]]))).toThrow("está vacío");
    expect(() => requireConsolidatedReferenceYear(new Map([["ANIO_ACTUAL", "dos mil veinticinco"]]))).toThrow("debe ser numérico");
  });

  it("filtra anio_columna sin inferir otro año", () => {
    const rows = [{ anio_columna: "2024", titulo: "A" }, { anio_columna: "2025", titulo: "B" }];
    expect(filterCareersByConsolidatedYear(rows, "2025")).toEqual([{ anio_columna: "2025", titulo: "B" }]);
    expect(filterCareersByConsolidatedYear(rows, "2026")).toEqual([]);
  });

  it("genera el texto institucional y el error de año sin datos", () => {
    expect(consolidatedDataCaption("2025")).toBe("Datos del último año consolidado del Relevamiento Anual (RA): 2025");
    expect(new NoConsolidatedAcademicDataError("2026").message).toBe("No hay datos consolidados disponibles para el año configurado: 2026.");
    expect(() => requireConsolidatedAcademicRows([], "2026")).toThrow("No hay datos consolidados disponibles para el año configurado: 2026.");
  });

  it("busca por título, filtra y conserva los textos originales", () => {
    const offers = createAcademicOfferRows([
      { titulo: "Profesorado de Educación Primaria", nombre_establecimiento: "Escuela Normal", gestion: "ESTATAL", departamento_oferta: "CAPITAL", tipo_carrera: "PROFESORADO", tipo_formacion: "DOCENTE" },
      { titulo: "Tecnicatura Superior en Turismo", nombre_sede_oferta: "IES Aguilares", gestion: "PRIVADA", departamento_oferta: "RÍO CHICO", tipo_carrera: "TECNICATURA", tipo_formacion: "TÉCNICA" },
    ], "2025");
    expect(queryAcademicOffers(offers, { search: "educacion primaria" }).items[0].title).toBe("Profesorado de Educación Primaria");
    expect(queryAcademicOffers(offers, { management: "privada", careerType: "tecnicatura" }).items[0].institution).toBe("IES Aguilares");
    expect(queryAcademicOffers(offers, { department: "rio chico" }).total).toBe(1);
  });

  it("ordena y pagina resultados", () => {
    const offers = createAcademicOfferRows(Array.from({ length: 7 }, (_, index) => ({ titulo: `Carrera ${7 - index}`, matricula_total: String(index) })), "2025");
    const result = queryAcademicOffers(offers, { sort: "title", direction: "asc", page: 2, pageSize: 5 });
    expect(result.total).toBe(7);
    expect(result.pageCount).toBe(2);
    expect(result.items).toHaveLength(2);
  });

  it("resume el mismo universo filtrado sin confundir registros con ofertas", () => {
    const offers = createAcademicOfferRows([
      { cue_anexo: "1", cui: "CUI-1", titulo: "Profesorado de Matemática", nombre_sede_oferta: "IES Capital", localidad_oferta: "SAN MIGUEL", departamento_oferta: "CAPITAL", gestion: "PRIVADA", matricula_total: "100", ingresantes: "30", egresados: "10" },
      { cue_anexo: "1", cui: "CUI-1", titulo: "PROFESORADO DE MATEMATICA", nombre_sede_oferta: "IES Capital", localidad_oferta: "SAN MIGUEL", departamento_oferta: "CAPITAL", gestion: "PRIVADA", matricula_total: "40", ingresantes: "12", egresados: "4" },
      { cue_anexo: "2", titulo: "Profesorado de Matemática", nombre_sede_oferta: "IES Sur", localidad_oferta: "CONCEPCIÓN", departamento_oferta: "CHICLIGASTA", gestion: "ESTATAL", matricula_total: "80", ingresantes: "20", egresados: "8" },
      { cue_anexo: "2", titulo: "Tecnicatura Superior en Software", nombre_sede_oferta: "IES Sur", localidad_oferta: "CONCEPCIÓN", departamento_oferta: "CHICLIGASTA", gestion: "ESTATAL", matricula_total: "1.200", ingresantes: "200", egresados: "50" },
    ], "2026");

    expect(summarizeAcademicOffers(offers)).toEqual({
      institutions: 2, offers: 3, careers: 2,
      enrollment: 1420, entrants: 262, graduates: 72,
    });
    expect(queryAcademicOffers(offers, { search: "matematica", management: "privada", department: "capital" }).summary).toEqual({
      institutions: 1, offers: 1, careers: 1,
      enrollment: 140, entrants: 42, graduates: 14,
    });
  });
});
