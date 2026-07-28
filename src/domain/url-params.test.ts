import { describe, expect, it } from "vitest";
import { toUrlSearchParams } from "./url-params";

describe("parámetros URL multivalor", () => {
  it("conserva todos los valores al paginar y exportar", () => {
    const params = toUrlSearchParams({ trainingType: ["DOCENTE", "MIXTA"], page: "2" });
    expect(params.getAll("trainingType")).toEqual(["DOCENTE", "MIXTA"]);
    expect(params.get("page")).toBe("2");
  });
});
