export type SiesRespondsIntent = "institutions" | "offers" | "authorities" | "map" | "lists" | "unknown";
export type SiesRespondsMessageRole = "user" | "assistant";

export interface SiesRespondsQuery {
  text: string;
  context?: SiesRespondsNavigationContext;
}

export interface SiesRespondsNavigationContext {
  path: string;
  module: "home" | "institutions" | "map" | "offers" | "authorities" | "lists" | "responds" | "other";
  institutionId?: string;
}

export interface SiesRespondsAction {
  label: string;
  href: string;
  intent: Exclude<SiesRespondsIntent, "unknown">;
}

export interface SiesRespondsResponse {
  intent: SiesRespondsIntent;
  text: string;
  actions: SiesRespondsAction[];
  result?: SiesConversationalResult;
}

export type SiesConversationalIntent = "ofertas" | "instituciones" | "autoridades" | "territorio" | "listados" | "indicadores_academicos" | "unknown";
export type AcademicIndicator = "graduates" | "entrants" | "enrollment";

export interface SiesConversationalQuery {
  intent: SiesConversationalIntent;
  searchTerms: string[];
  careerType?: "PROFESORADO" | "TECNICATURA";
  careerTitle?: string;
  institutionName?: string;
  institutionCue?: string;
  managementType?: "ESTATAL" | "PRIVADA";
  trainingTypes?: string[];
  department?: string;
  locality?: string;
  siteType?: string;
  requestedGrouping?: "department" | "locality" | "institution";
  requestedMetric?: "count";
  academicIndicator?: AcademicIndicator;
  year?: string;
  region?: string;
  analysisMode?: "total" | "average" | "evolution" | "maximum" | "zero";
}

export interface SiesConversationalMetric {
  label: string;
  value: number;
}

export interface SiesConversationalResultItem {
  label: string;
  detail?: string;
  href?: string;
}

export interface SiesConversationalResultGroup {
  label: string;
  count: number;
  items: SiesConversationalResultItem[];
}

export interface SiesConversationalResult {
  referenceYear?: string;
  metrics: SiesConversationalMetric[];
  groups: SiesConversationalResultGroup[];
  totalMatches: number;
  truncated: boolean;
  interpretedQuery: SiesConversationalQuery;
  institutionIds?: string[];
  source?: string;
  appliedFilters?: string[];
  includedTitles?: string[];
  series?: Array<{ year: string; entrants: number; enrollment: number; graduates: number }>;
}

export interface SiesRespondsMessage {
  id: string;
  role: SiesRespondsMessageRole;
  text: string;
  response?: SiesRespondsResponse;
}
