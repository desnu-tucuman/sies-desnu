import { afterEach, describe, expect, it } from "vitest";
import { appLastUpdated } from "./app-metadata";

const originalValue = process.env.SIES_LAST_UPDATED;

afterEach(() => {
  if (originalValue === undefined) delete process.env.SIES_LAST_UPDATED;
  else process.env.SIES_LAST_UPDATED = originalValue;
});

describe("fecha de actualización de SIES", () => {
  it("muestra la fecha registrada durante el build", () => {
    process.env.SIES_LAST_UPDATED = "20/08/2026";
    expect(appLastUpdated()).toBe("20/08/2026");
  });

  it("usa una fecha válida y nunca muestra una cadena vacía", () => {
    process.env.SIES_LAST_UPDATED = "   ";
    expect(appLastUpdated(new Date("2026-08-20T12:00:00-03:00"))).toBe("20/08/2026");
  });
});
