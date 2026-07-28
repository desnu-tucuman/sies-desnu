export type SearchParamsRecord = Record<string, string | string[] | undefined>;

export function toUrlSearchParams(params: SearchParamsRecord): URLSearchParams {
  const result = new URLSearchParams();
  for (const [key, raw] of Object.entries(params)) {
    const values = Array.isArray(raw) ? raw : [raw];
    for (const value of values) {
      const clean = value?.trim();
      if (clean) result.append(key, clean);
    }
  }
  return result;
}
