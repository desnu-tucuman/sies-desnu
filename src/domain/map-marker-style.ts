export type ManagementMarkerKind = "state" | "private" | "unknown";
export type ClusterManagementKind = ManagementMarkerKind | "mixed";

export const MANAGEMENT_MARKER_COLORS: Record<ManagementMarkerKind, string> = {
  state: "#0B4F8A",
  private: "#E67E22",
  unknown: "#5C6F79",
};

function normalize(value: unknown): string {
  return value === null || value === undefined ? "" : String(value).trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
}

export function managementMarkerKind(value: unknown): ManagementMarkerKind {
  const normalized = normalize(value);
  if (normalized === "ESTATAL") return "state";
  if (normalized === "PRIVADO" || normalized === "PRIVADA") return "private";
  return "unknown";
}

export function clusterManagementKind(values: unknown[]): ClusterManagementKind {
  const kinds = new Set(values.map(managementMarkerKind));
  return kinds.size === 1 ? [...kinds][0] : "mixed";
}

export function clusterMarkerColor(values: unknown[]): string {
  const kind = clusterManagementKind(values);
  return kind === "mixed" ? MANAGEMENT_MARKER_COLORS.unknown : MANAGEMENT_MARKER_COLORS[kind];
}
