import { describe, expect, it } from "vitest";
import { listReportQueryFromParams } from "./list-reports";

describe("consulta del generador de listados", () => {
  it("admite los cuatro tipos y conserva filtros", () => {
    const params = new URLSearchParams("type=career-places&preview=1&search=software&management=Estatal");
    expect(listReportQueryFromParams(params)).toMatchObject({ type: "career-places", preview: true, search: "software", management: "Estatal" });
  });

  it("usa instituciones ante un tipo desconocido", () => {
    expect(listReportQueryFromParams(new URLSearchParams("type=otro"))).toMatchObject({ type: "institutions", preview: false });
  });
});
