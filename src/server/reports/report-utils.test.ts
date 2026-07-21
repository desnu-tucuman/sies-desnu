import { describe, expect, it } from "vitest";
import { appliedFilters, filteredFilenameSuffix, slugifyFilename } from "./report-utils";

describe("utilidades de reportes", () => {
  it("sanitiza nombres de archivo", () => {
    expect(slugifyFilename('Ext. Áulica / "Santa Ana"')).toBe("ext_aulica_santa_ana");
  });

  it("describe solamente filtros activos", () => {
    expect(appliedFilters({ management: "Estatal", department: "RÍO CHICO", locality: "" }))
      .toEqual(["Gestión: Estatal", "Departamento: RÍO CHICO"]);
  });

  it("genera un sufijo breve y seguro", () => {
    expect(filteredFilenameSuffix({ management: "Estatal", department: "RÍO CHICO" }))
      .toBe("_estatal_rio_chico");
  });
});

