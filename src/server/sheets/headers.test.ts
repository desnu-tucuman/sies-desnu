import { describe, expect, it } from "vitest";
import { SheetHeadersError } from "./errors";
import { columnLetter, validateHeaders } from "./headers";

describe("validateHeaders", () => {
  it("acepta todas las columnas requeridas", () => {
    expect(() => validateHeaders("CONFIG", ["parametro", "valor"], ["parametro", "valor"])).not.toThrow();
  });

  it("informa hoja, faltantes y encontradas", () => {
    expect(() => validateHeaders("CONFIG", ["parametro"], ["parametro", "valor"])).toThrowError(
      new SheetHeadersError("CONFIG", ["valor"], ["parametro"]),
    );
  });
});

describe("columnLetter", () => {
  it.each([[1, "A"], [26, "Z"], [27, "AA"]])("convierte %i en %s", (input, expected) => {
    expect(columnLetter(input)).toBe(expected);
  });
});

