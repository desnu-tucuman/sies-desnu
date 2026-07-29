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
}

export interface SiesRespondsMessage {
  id: string;
  role: SiesRespondsMessageRole;
  text: string;
  response?: SiesRespondsResponse;
}
