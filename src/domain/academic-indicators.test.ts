import { describe, expect, it } from "vitest";
import { createAcademicIndicatorRows, resolveAcademicIndicators } from "./academic-indicators";
import type { SiesConversationalQuery } from "./sies-responds";

const raw = [
  { anio_columna: "2024", cue_anexo: "1", titulo: "Técnico Superior en Farmacia", nombre_sede_oferta: "IES Sur", departamento_oferta: "CHICLIGASTA", gestion: "Estatal", tipo_carrera: "TECNICATURA", tipo_formacion: "TÉCNICA", matricula_total: "100", ingresantes: "30", egresados: "10" },
  { anio_columna: "2025", cue_anexo: "1", titulo: "Tecnicatura Superior en Farmacia", nombre_sede_oferta: "IES Sur", departamento_oferta: "CHICLIGASTA", gestion: "ESTATAL", tipo_carrera: "TECNICATURA", tipo_formacion: "TÉCNICA", matricula_total: "120", ingresantes: "40", egresados: "12" },
  { anio_columna: "2025", cue_anexo: "1", titulo: "Técnico Superior en Farmacia", nombre_sede_oferta: "IES Sur", departamento_oferta: "CHICLIGASTA", gestion: "ESTATAL", tipo_carrera: "TECNICATURA", tipo_formacion: "TÉCNICA", matricula_total: "120", ingresantes: "40", egresados: "12" },
  { anio_columna: "2025", cue_anexo: "2", titulo: "Profesorado de Inglés", nombre_sede_oferta: "IES Capital", departamento_oferta: "CAPITAL", gestion: "PRIVADA", tipo_carrera: "PROFESORADO", tipo_formacion: "DOCENTE", matricula_total: "80", ingresantes: "20", egresados: "0" },
];
const rows = createAcademicIndicatorRows(raw, "2025");
const query = (overrides: Partial<SiesConversationalQuery> = {}): SiesConversationalQuery => ({ intent: "indicadores_academicos", searchTerms: ["FARMACIA"], academicIndicator: "graduates", analysisMode: "total", ...overrides });

describe("indicadores académicos conversacionales", () => {
  it("suma egresados por carrera y normaliza títulos equivalentes", () => { const result = resolveAcademicIndicators("egresados en Farmacia", query(), rows, "2025"); expect(result.metrics[0].value).toBe(12); expect(result.includedTitles).toHaveLength(1); });
  it("sin año usa el año configurado", () => expect(resolveAcademicIndicators("Farmacia", query(), rows, "2025").referenceYear).toBe("2025"));
  it("respeta un año explícito", () => expect(resolveAcademicIndicators("Farmacia en 2024", query({ year: "2024" }), rows, "2025").metrics[0].value).toBe(10));
  it("filtra por región sur", () => expect(resolveAcademicIndicators("egresados en el sur", query({ searchTerms: [], region: "SUR" }), rows, "2025").totalMatches).toBe(1));
  it("filtra por gestión", () => expect(resolveAcademicIndicators("egresados estatales", query({ managementType: "ESTATAL" }), rows, "2025").metrics[0].value).toBe(12));
  it("devuelve evolución anual", () => expect(resolveAcademicIndicators("evolución Farmacia", query({ analysisMode: "evolution" }), rows, "2025").series).toHaveLength(2));
  it("encuentra carreras con cero egresados", () => { const result = resolveAcademicIndicators("carreras sin egresados", query({ searchTerms: [], analysisMode: "zero" }), rows, "2025"); expect(result.groups[0].items[0].label).toContain("Inglés"); });
  it("elimina duplicados del mismo año, unidad y título equivalente", () => expect(rows.filter((row) => row.year === "2025" && row.cue === "1")).toHaveLength(1));
  it("informa fuente, filtros, ofertas e instituciones", () => { const result = resolveAcademicIndicators("Farmacia en 2025", query({ year: "2025" }), rows, "2025"); expect(result.source).toBe("CARRERAS_DETALLE"); expect(result.appliedFilters).toContain("Año: 2025"); expect(result.metrics.map((item) => item.label)).toEqual(["Egresados", "Ofertas", "Instituciones"]); });
});
