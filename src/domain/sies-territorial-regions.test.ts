import { describe, expect, it } from "vitest";
import { detectSiesRegion, expandSiesRegion, matchesAnyDepartment, REGIONES_SIES } from "./sies-territorial-regions";

describe("regiones territoriales SIES", () => {
  it("usa Capital como centro", () => expect(REGIONES_SIES.CENTRO).toEqual(["CAPITAL"]));
  it.each(["sur", "norte", "este", "oeste", "centro"])("detecta %s como palabra territorial", (region) => expect(detectSiesRegion(`ofertas en el ${region}`)).toBe(region.toUpperCase()));
  it("expande y compara departamentos ignorando tildes", () => {
    expect(expandSiesRegion("SUR")).toContain("RIO CHICO");
    expect(matchesAnyDepartment("RÍO CHICO", expandSiesRegion("SUR"))).toBe(true);
  });
});
