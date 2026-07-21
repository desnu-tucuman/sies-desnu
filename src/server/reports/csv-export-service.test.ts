import { describe, expect, it } from "vitest";
import { createExcelCsv, neutralizeSpreadsheetFormula } from "./csv-export-service";

describe("exportación CSV segura", () => {
  it("incluye BOM, usa punto y coma y conserva caracteres españoles", () => {
    const csv = createExcelCsv(["Institución", "Gestión"], [["Extensión Áulica Ñandú", "TÉCNICA"]]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('"Institución";"Gestión"');
    expect(csv).toContain("Extensión Áulica Ñandú");
  });

  it.each(["=SUM(A1:A2)", "+1", "-2", "@dato"])("neutraliza fórmulas: %s", (value) => {
    expect(neutralizeSpreadsheetFormula(value)).toBe(`'${value}`);
  });

  it("escapa comillas y saltos de línea", () => {
    expect(createExcelCsv(["Dato"], [['Texto "citado"\nsegunda línea']])).toContain('"Texto ""citado""\nsegunda línea"');
  });
});

