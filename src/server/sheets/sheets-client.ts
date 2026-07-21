import "server-only";

import { JWT } from "google-auth-library";
import { unstable_cache } from "next/cache";
import { getServerEnv } from "@/config/env";
import { SheetsConnectionError } from "./errors";
import { columnLetter, validateHeaders } from "./headers";
import type { SheetRow, SheetTable } from "./types";

const READONLY_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";

interface ValuesResponse {
  values?: unknown[][];
}

function quoteSheetName(name: string): string {
  return `'${name.replaceAll("'", "''")}'`;
}

function normalizeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function toRows(headers: string[], values: unknown[][]): SheetRow[] {
  return values
    .filter((row) => row.some((cell) => normalizeCell(cell) !== ""))
    .map((row) =>
      Object.fromEntries(
        headers.map((header, index) => [header, normalizeCell(row[index])]),
      ),
    );
}

async function fetchRange(range: string): Promise<unknown[][]> {
  const env = getServerEnv();
  const auth = new JWT({
    email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
    scopes: [READONLY_SCOPE],
  });

  try {
    const token = await auth.getAccessToken();
    if (!token.token) throw new Error("Google no devolvió un token de acceso.");

    const url = new URL(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(env.GOOGLE_SHEETS_SPREADSHEET_ID)}/values/${encodeURIComponent(range)}`,
    );
    url.searchParams.set("majorDimension", "ROWS");
    url.searchParams.set("valueRenderOption", "UNFORMATTED_VALUE");

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token.token}` },
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Google Sheets API respondió ${response.status}: ${detail}`);
    }

    const payload = (await response.json()) as ValuesResponse;
    return payload.values ?? [];
  } catch (error) {
    throw new SheetsConnectionError(
      `No se pudo leer el rango ${range} de Google Sheets. Verifique credenciales, permisos y nombres de hojas.`,
      { cause: error },
    );
  }
}

async function readTableUncached(
  sheet: string,
  requiredColumns: readonly string[],
): Promise<SheetTable> {
  const lastColumn = columnLetter(requiredColumns.length);
  const range = `${quoteSheetName(sheet)}!A:${lastColumn}`;
  const values = await fetchRange(range);
  const headers = (values[0] ?? []).map(normalizeCell);
  validateHeaders(sheet, headers, requiredColumns);

  return {
    sheet,
    headers,
    rows: toRows(headers, values.slice(1)),
  };
}

export async function readSheetTable(
  sheet: string,
  requiredColumns: readonly string[],
): Promise<SheetTable> {
  const { SIES_CACHE_TTL_SECONDS } = getServerEnv();
  const cachedRead = unstable_cache(
    () => readTableUncached(sheet, requiredColumns),
    ["sies-sheet", sheet, requiredColumns.join("|")],
    { revalidate: SIES_CACHE_TTL_SECONDS, tags: [`sies-sheet-${sheet}`] },
  );
  return cachedRead();
}

