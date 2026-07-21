import { describe, expect, it } from "vitest";
import type { SheetRow } from "@/server/sheets/types";
import { createAuthoritiesDirectory, emailHref, queryAuthorities, telephoneHref } from "./authorities-directory";

const master = (cue: string, name: string, overrides: SheetRow = {}): SheetRow => ({ cue_anexo: cue, nombre_establecimiento: name, gestion: "Estatal", tipo_sede: "Sede", localidad: "CAPITAL", departamento: "CAPITAL", ...overrides });

describe("directorio de autoridades", () => {
  it("expande posiciones reales y no crea filas vacías", () => {
    const result = createAuthoritiesDirectory([master("1", "Institución A")], [{
      cue_anexo: "1", nombre_establecimiento: "Institucion A", cargo_1: "RECTOR", autoridad_1_nombre: "Pérez, Ana",
      cargo_2: "REGENTE", autoridad_2_nombre: "Gómez, Luis", autoridad_2_telefono: "381-555555",
    }]);
    expect(result.authorities).toHaveLength(2);
    expect(result.authorities.map((item) => item.role)).toEqual(["RECTOR", "REGENTE"]);
  });

  it("une extensiones con CUE compartido por nombre y evita multiplicarlas", () => {
    const masters = [master("9", "Sede Central"), master("9", "Ext. Áulica Santa Ana", { tipo_sede: "Extensión Áulica", localidad: "SANTA ANA" })];
    const result = createAuthoritiesDirectory(masters, [{ cue_anexo: "9", nombre_establecimiento: "EXT. AULICA SANTA ANA", cargo_1: "COORDINADOR", autoridad_1_nombre: "Persona Uno" }]);
    expect(result.authorities).toHaveLength(1);
    expect(result.authorities[0]).toMatchObject({ institution: "Ext. Áulica Santa Ana", siteType: "Extensión Áulica" });
  });

  it("usa un nombre territorial único cuando el CUE difiere entre fuentes", () => {
    const result = createAuthoritiesDirectory([master("100", "IES Trancas")], [{ cue_anexo: "999", nombre_establecimiento: "IES TRANCAS", cargo_1: "RECTOR", autoridad_1_nombre: "Persona Uno" }]);
    expect(result.authorities).toHaveLength(1);
    expect(result.unmatchedRows).toBe(0);
  });

  it("no inventa una autoridad para instituciones acéfalas", () => {
    const result = createAuthoritiesDirectory([master("2", "Institución Acéfala")], [{ cue_anexo: "2", nombre_establecimiento: "Institución Acéfala", estado_autoridad: "Acéfala", cargo_1: "INSTITUCIÓN ACÉFALA" }]);
    expect(result.authorities).toHaveLength(0);
    expect(result.acephalousInstitutions[0].status).toBe("ACEFALÍA");
  });

  it("deduplica repeticiones exactas dentro de una unidad", () => {
    const row = { cue_anexo: "1", nombre_establecimiento: "Institución A", cargo_1: "RECTOR", autoridad_1_nombre: "Ana Pérez", cargo_2: "RECTOR", autoridad_2_nombre: "Ana Pérez" };
    const result = createAuthoritiesDirectory([master("1", "Institución A")], [row]);
    expect(result.authorities).toHaveLength(1);
    expect(result.duplicatesAvoided).toBe(1);
  });

  it("busca, filtra, ordena, pagina y calcula indicadores", () => {
    const joined = createAuthoritiesDirectory([master("1", "Institución A"), master("2", "Institución B", { gestion: "Privado" })], [
      { cue_anexo: "1", nombre_establecimiento: "Institución A", cargo_1: "RECTOR", autoridad_1_nombre: "Pérez, Ana", autoridad_1_mail: "ana@example.com" },
      { cue_anexo: "2", nombre_establecimiento: "Institución B", cargo_1: "DIRECTOR", autoridad_1_nombre: "Gómez, Luis", autoridad_1_telefono: "381555555" },
    ]);
    expect(queryAuthorities(joined.authorities, { search: "perez" }).total).toBe(1);
    expect(queryAuthorities(joined.authorities, { role: "director", management: "privado" }).total).toBe(1);
    const all = queryAuthorities(joined.authorities, { pageSize: 5 });
    expect(all).toMatchObject({ total: 2, institutionsRepresented: 2, withoutPhone: 1, withoutEmail: 1 });
  });

  it("sólo genera enlaces para contactos con formato válido", () => {
    expect(telephoneHref("(381) 555-5555")).toBe("tel:3815555555");
    expect(telephoneHref("SIN DATOS")).toBeNull();
    expect(emailHref("persona@example.com")).toBe("mailto:persona@example.com");
    expect(emailHref("correo incompleto")).toBeNull();
  });
});
