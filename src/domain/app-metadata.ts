export function formatSiesUpdateDate(date: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Argentina/Tucuman",
  }).format(date);
}

export function appLastUpdated(fallbackDate = new Date()): string {
  return process.env.SIES_LAST_UPDATED?.trim() || formatSiesUpdateDate(fallbackDate);
}
