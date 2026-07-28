import { queryValues, safeText, type QueryParameterSource } from "./institutions";

export const LIST_REPORT_TYPES = ["institutions", "institution-offers", "career-places", "authorities"] as const;
export type ListReportType = typeof LIST_REPORT_TYPES[number];

export interface ListReportQuery {
  type: ListReportType;
  preview: boolean;
  search?: string;
  institution?: string;
  role?: string;
  management?: string;
  department?: string;
  locality?: string;
  siteType?: string;
  trainingType?: string;
  institutionalTrainingTypes?: string[];
  careerType?: string;
}

export const LIST_REPORT_LABELS: Record<ListReportType, string> = {
  institutions: "Instituciones y sedes",
  "institution-offers": "Instituciones con su oferta académica",
  "career-places": "Lugares donde se dicta una carrera",
  authorities: "Directorio de autoridades",
};

export function listReportQueryFromParams(params: QueryParameterSource): ListReportQuery {
  const rawType = safeText(params.get("type"));
  const type = LIST_REPORT_TYPES.find((item) => item === rawType) ?? "institutions";
  return {
    type, preview: params.get("preview") === "1", search: safeText(params.get("search")),
    institution: safeText(params.get("institution")), role: safeText(params.get("role")),
    management: safeText(params.get("management")), department: safeText(params.get("department")),
    locality: safeText(params.get("locality")), siteType: safeText(params.get("siteType")),
    trainingType: type === "career-places" ? safeText(params.get("trainingType")) : "",
    institutionalTrainingTypes: type === "institutions" || type === "institution-offers" ? queryValues(params, "trainingType") : [],
    careerType: safeText(params.get("careerType")),
  };
}
