import "server-only";

import { readSheetTable } from "@/server/sheets/sheets-client";

export const CONFIG_SHEET = "CONFIG";
export const CONFIG_HEADERS = ["parametro", "valor"] as const;

export async function getConfig(): Promise<Map<string, string>> {
  const table = await readSheetTable(CONFIG_SHEET, CONFIG_HEADERS);
  return new Map(table.rows.map((row) => [row.parametro, row.valor]));
}

