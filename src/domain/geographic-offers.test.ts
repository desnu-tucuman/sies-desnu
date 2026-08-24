import { describe, expect, it } from "vitest";
import { careersForGeographicOffer, createGeographicOfferRows, filterGeographicOffers, mapQueryFromParams, offerTypeCategory, offerTypeForCareers, sortGeographicOffersTerritorially } from "./geographic-offers";

const row = (overrides: Record<string, string> = {}) => ({
  cue_anexo: "900034000", cui: "900034000", nombre_establecimiento: "IES AGUILARES", nombre_sede_oferta: "EXT. ÁULICA SANTA ANA - IES AGUILARES",
  tipo_espacio_oferta: "Extensión Áulica", gestion: "Estatal", localidad_oferta: "SANTA ANA", departamento_oferta: "RÍO CHICO",
  latitud_oferta: "-27.4", longitud_oferta: "-65.6", carreras: "TECNICATURA SUPERIOR EN DESARROLLO DE SOFTWARE | PROFESORADO DE INGLÉS",
  profesorados: "PROFESORADO DE INGLÉS", tecnicaturas: "TECNICATURA SUPERIOR EN DESARROLLO DE SOFTWARE", otras_formaciones: "",
  tipo_oferta_resumen: "Mixta", matricula_total: "100", ingresantes: "25", egresados: "5", anio_referencia: "2026", ...overrides,
});

describe("mapa de oferta 2026", () => {
  it("crea una unidad territorial sin duplicarla por carreras concatenadas", () => {
    const rows = createGeographicOfferRows([row(), row(), row({ cue_anexo: "", nombre_sede_oferta: "", nombre_establecimiento: "" })], "");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ rawLatitude: "-27.4", rawLongitude: "-65.6" });
    expect(rows[0].careers).toHaveLength(2);
  });

  it("busca carreras sin distinguir tildes ni mayúsculas y marca coincidencias", () => {
    const rows = createGeographicOfferRows([row()], "desarrollo de software");
    const filtered = filterGeographicOffers(rows, { search: "DESARROLLO de software" });
    expect(filtered).toHaveLength(1); expect(filtered[0].matchedCareers).toEqual(["TECNICATURA SUPERIOR EN DESARROLLO DE SOFTWARE"]);
  });

  it("expone sólo carreras coincidentes cuando existe búsqueda y todas cuando no existe", () => {
    const offer = createGeographicOfferRows([row()], "ingles")[0];
    expect(careersForGeographicOffer(offer, "INGLÉS")).toEqual(["PROFESORADO DE INGLÉS"]);
    expect(careersForGeographicOffer(offer)).toHaveLength(2);
  });

  it("clasifica el tipo desde las carreras coincidentes", () => {
    expect(offerTypeForCareers(["PROFESOR DE EDUCACIÓN SECUNDARIA EN MATEMÁTICA"])).toBe("Docente");
    expect(offerTypeForCareers(["TECNICATURA SUPERIOR EN SOFTWARE"])).toBe("Técnica");
    expect(offerTypeForCareers(["PROFESORADO DE INGLÉS", "TÉCNICO SUPERIOR EN TURISMO"])).toBe("Mixta");
  });

  it("ordena territorialmente por departamento, localidad y unidad", () => {
    const offers = createGeographicOfferRows([
      row({ cue_anexo: "2", nombre_sede_oferta: "Unidad Z", departamento_oferta: "RÍO CHICO", localidad_oferta: "SANTA ANA" }),
      row({ cue_anexo: "1", nombre_sede_oferta: "Unidad B", departamento_oferta: "CAPITAL", localidad_oferta: "SAN MIGUEL" }),
      row({ cue_anexo: "3", nombre_sede_oferta: "Unidad A", departamento_oferta: "CAPITAL", localidad_oferta: "SAN MIGUEL" }),
    ], "");
    expect(sortGeographicOffersTerritorially(offers).map((offer) => offer.name)).toEqual(["Unidad A", "Unidad B", "Unidad Z"]);
  });

  it("busca también por institución, CUE, CUI y territorio", () => {
    const rows = createGeographicOfferRows([row()], "");
    for (const search of ["IES Aguilares", "900034000", "Santa Ana", "Rio Chico"]) expect(filterGeographicOffers(rows, { search })).toHaveLength(1);
  });

  it("combina gestión, departamento, sede y tipo de oferta", () => {
    const rows = createGeographicOfferRows([row()], "");
    expect(filterGeographicOffers(rows, { management: "ESTATAL", department: "RIO CHICO", siteType: "EXTENSION AULICA", offerType: "MIXTA" })).toHaveLength(1);
    expect(filterGeographicOffers(rows, { offerType: "Técnica" })).toHaveLength(0);
  });

  it("acepta los identificadores institucionales enviados por SIES Responde", () => {
    const rows = createGeographicOfferRows([row()], "");
    expect(filterGeographicOffers(rows, { institutionId: ["OTRO"] })).toHaveLength(0);
    expect(filterGeographicOffers(rows, { institutionId: [Buffer.from(JSON.stringify(["900034000", "IES AGUILARES"]), "utf8").toString("base64url")] })).toHaveLength(1);
  });

  it("normaliza categorías de oferta", () => {
    expect(offerTypeCategory("Docente y Técnica")).toBe("Mixta"); expect(offerTypeCategory("TÉCNICA")).toBe("Técnica"); expect(offerTypeCategory("Otra")).toBe("Otras");
  });

  it("conserva el modo en los parámetros", () => {
    expect(mapQueryFromParams(new URLSearchParams("vista=oferta&offerType=Mixta"))).toMatchObject({ view: "offer", offerType: "Mixta" });
    expect(mapQueryFromParams(new URLSearchParams())).toMatchObject({ view: "institutions" });
  });
});
