import { describe, expect, it } from "vitest";
import { compareText, createInstitutionDirectoryRows, createInstitutionId, institutionQueryFromParams, joinInstitutionSources, normalizeForMatch, queryInstitutions, safeText, splitOfferList } from "./institutions";
import type { SheetRow } from "@/server/sheets/types";

const master = (overrides: Partial<SheetRow> = {}): SheetRow => ({
  cue_anexo: "900190400", cui: "900074300",
  nombre_establecimiento: "EXT. ÁULICA ALDERETES - IES INT. DE LAS AMÉRICAS",
  gestion: "Estatal", tipo_formacion_base: "TÉCNICA", tipo_sede: "Extensión Áulica",
  direccion: "", localidad: "ALDERETES", departamento: "CRUZ ALTA", telefono: "",
  email_institucional: "", horario: "SIN DATOS", comparte_edificio_con: "", estado_edificio: "",
  ...overrides,
});

describe("normalización y unión institucional", () => {
  it("compara sin distinguir tildes, mayúsculas ni espacios", () => {
    expect(normalizeForMatch("  Ext. Áulica  ")).toBe(normalizeForMatch("EXT. AULICA"));
  });

  it("convierte valores nulos o indefinidos en texto seguro", () => {
    expect(safeText(undefined)).toBe("");
    expect(safeText(null)).toBe("");
    expect(compareText(undefined, "Institución")).toBeLessThan(0);
  });

  it("crea identificadores distintos para nombres territoriales con el mismo CUE", () => {
    expect(createInstitutionId("1", "Sede A")).not.toBe(createInstitutionId("1", "Sede B"));
  });

  it("separa carreras concatenadas y elimina elementos vacíos", () => {
    expect(splitOfferList("Profesorado A | Tecnicatura B | ")).toEqual(["Profesorado A", "Tecnicatura B"]);
  });

  it("une una extensión áulica por CUE y nombre normalizado", () => {
    const careers = [{ cue_anexo: "900190400", nombre_establecimiento: master().nombre_establecimiento,
      nombre_sede_oferta: "EXT. AULICA ALDERETES - IES INT. DE LAS AMERICAS", tipo_oferta_resumen: "Técnica",
      cantidad_carreras: "2", matricula_total: "90", ingresantes: "41", egresados: "0", anio_referencia: "2025",
      profesorados: "", tecnicaturas: "Carrera A | Carrera B", otras_formaciones: "" }];
    const authorities = [{ cue_anexo: "900190400", nombre_establecimiento: master().nombre_establecimiento,
      cargo_1: "RECTOR", autoridad_1_nombre: "Persona Uno", autoridad_1_telefono: "", autoridad_1_mail: "" }];
    const result = joinInstitutionSources([master()], careers, authorities, "2025");
    expect(result.institutions[0].offer?.technicalDegrees).toEqual(["Carrera A", "Carrera B"]);
    expect(result.institutions[0].authorities).toHaveLength(1);
    expect(result.issues).toHaveLength(0);
  });

  it("conserva una institución sin contacto y marca fuentes parciales", () => {
    const result = joinInstitutionSources([master()], [], [], "2025");
    expect(result.institutions[0].phone).toBe("");
    expect(result.institutions[0].partialReasons).toHaveLength(2);
  });

  it("integra una sede con dos autoridades", () => {
    const sede = master({ cue_anexo: "900061600", cui: "900061600", nombre_establecimiento: "CONSERVATORIO PROVINCIAL DE MUSICA", tipo_sede: "Sede", tipo_formacion_base: "DOCENTE" });
    const careers = [{ cue_anexo: sede.cue_anexo, nombre_sede_oferta: sede.nombre_establecimiento, nombre_establecimiento: sede.nombre_establecimiento, tipo_oferta_resumen: "Docente", cantidad_carreras: "3", matricula_total: "152", ingresantes: "27", egresados: "4", anio_referencia: "2025", profesorados: "Profesor A | Profesor B", tecnicaturas: "", otras_formaciones: "" }];
    const authorities = [{ cue_anexo: sede.cue_anexo, nombre_establecimiento: sede.nombre_establecimiento, cargo_1: "RECTOR", autoridad_1_nombre: "Autoridad Uno", autoridad_1_telefono: "", autoridad_1_mail: "", cargo_2: "REGENTE", autoridad_2_nombre: "Autoridad Dos", autoridad_2_telefono: "", autoridad_2_mail: "" }];
    const result = joinInstitutionSources([sede], careers, authorities, "2025");
    expect(result.institutions[0].siteType).toBe("Sede");
    expect(result.institutions[0].authorities).toHaveLength(2);
  });

  it("preserva la clasificación mixta y permite filtrarla", () => {
    const mixed = master({ cue_anexo: "900066400", nombre_establecimiento: "ESC. NORMAL SUPERIOR MANUEL BELGRANO", tipo_formacion_base: "MIXTA", tipo_sede: "Sede" });
    const dataset = joinInstitutionSources([mixed], [], [], "2025");
    const result = queryInstitutions(dataset.institutions, { trainingType: ["mixta"] });
    expect(result.total).toBe(1);
    expect(result.items[0].baseTrainingType).toBe("MIXTA");
  });

  it("combina múltiples tipos de formación con lógica OR", () => {
    const rows = createInstitutionDirectoryRows([
      master({ cue_anexo: "1", nombre_establecimiento: "Docente", tipo_formacion_base: "DOCENTE" }),
      master({ cue_anexo: "2", nombre_establecimiento: "Mixta", tipo_formacion_base: "MIXTA" }),
      master({ cue_anexo: "3", nombre_establecimiento: "Técnica", tipo_formacion_base: "TÉCNICA" }),
    ]);
    const result = queryInstitutions(rows, { trainingType: ["docente", "MIXTA"] });
    expect(result.items.map((item) => item.baseTrainingType).sort()).toEqual(["DOCENTE", "MIXTA"]);
  });

  it("admite una extensión áulica sin datos de contacto", () => {
    const santaAna = master({ cue_anexo: "900034000", nombre_establecimiento: "EXT. ÁULICA SANTA ANA - IES AGUILARES", localidad: "SANTA ANA", telefono: "", email_institucional: "" });
    const result = joinInstitutionSources([santaAna], [], [], "2025");
    expect(result.institutions[0]).toMatchObject({ phone: "", email: "", siteType: "Extensión Áulica" });
  });

  it("tolera un orden inválido, campos vacíos y pagina sin romperse", () => {
    const rows = joinInstitutionSources([
      master({ cue_anexo: "1", nombre_establecimiento: "Institución B", localidad: "" }),
      master({ cue_anexo: "2", nombre_establecimiento: "Institución A", departamento: "" }),
    ], [], [], "2025").institutions;
    rows[0].locality = undefined as unknown as string;
    const result = queryInstitutions(rows, { sort: "" as never, page: 99, pageSize: 5 });
    expect(result.items.map((item) => item.name)).toEqual(["Institución A", "Institución B"]);
    expect(result.page).toBe(1);
  });

  it("deduplica variantes del filtro sin modificar el valor original mostrado", () => {
    const rows = createInstitutionDirectoryRows([
      master({ cue_anexo: "1", nombre_establecimiento: "Institución A", tipo_formacion_base: "TÉCNICA" }),
      master({ cue_anexo: "2", nombre_establecimiento: "Institución B", tipo_formacion_base: "Técnica" }),
      master({ cue_anexo: "3", nombre_establecimiento: "Institución C", tipo_formacion_base: "ARTÍSTICA NO SUPERIOR" }),
    ]);
    const result = queryInstitutions(rows, {});
    expect(result.filters.trainingType).toEqual(["ARTÍSTICA NO SUPERIOR", "TÉCNICA"]);
    expect(result.items.find((item) => item.cue === "2")?.baseTrainingType).toBe("Técnica");
  });

  it("mantiene sede, anexo y extensión como unidades con rutas independientes", () => {
    const rows = createInstitutionDirectoryRows([
      master({ cue_anexo: "10", nombre_establecimiento: "Institución Sede", tipo_sede: "Sede" }),
      master({ cue_anexo: "10", nombre_establecimiento: "Institución Anexo", tipo_sede: "Anexo" }),
      master({ cue_anexo: "10", nombre_establecimiento: "Institución Extensión", tipo_sede: "Extensión Áulica" }),
    ]);
    expect(new Set(rows.map((row) => row.id)).size).toBe(3);
    expect(rows.map((row) => row.siteType)).toEqual(["Sede", "Anexo", "Extensión Áulica"]);
  });

  it("interpreta para pantalla y exportación los mismos filtros", () => {
    const params = new URLSearchParams("search=Santa+Ana&management=Estatal&department=RIO+CHICO&siteType=Extensi%C3%B3n+%C3%81ulica&trainingType=T%C3%89CNICA");
    expect(institutionQueryFromParams(params)).toMatchObject({
      search: "Santa Ana", management: "Estatal", department: "RIO CHICO",
      siteType: "Extensión Áulica", trainingType: ["TÉCNICA"],
    });
  });

  it("interpreta parámetros repetidos y deduplica variantes normalizadas", () => {
    const params = new URLSearchParams("trainingType=DOCENTE&trainingType=MIXTA&trainingType=docente");
    expect(institutionQueryFromParams(params).trainingType).toEqual(["DOCENTE", "MIXTA"]);
  });

  it("filtra múltiples identificadores institucionales con lógica OR", () => {
    const institutions = createInstitutionDirectoryRows([
      master({ cue_anexo: "1", nombre_establecimiento: "Institución A" }),
      master({ cue_anexo: "2", nombre_establecimiento: "Institución B" }),
      master({ cue_anexo: "3", nombre_establecimiento: "Institución C" }),
    ]);
    const params = new URLSearchParams();
    params.append("institutionId", institutions[0].id);
    params.append("institutionId", institutions[2].id);
    params.append("institutionId", institutions[0].id);
    const query = institutionQueryFromParams(params);
    expect(query.institutionId).toEqual([institutions[0].id, institutions[2].id]);
    expect(queryInstitutions(institutions, query).items.map((item) => item.cue)).toEqual(["1", "3"]);
  });
});
