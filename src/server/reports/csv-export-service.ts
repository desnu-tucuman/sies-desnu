const FORMULA_PREFIX = /^[=+\-@]/;

export function neutralizeSpreadsheetFormula(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return FORMULA_PREFIX.test(text.trimStart()) ? `'${text}` : text;
}

export function csvCell(value: unknown): string {
  const safe = neutralizeSpreadsheetFormula(value).replace(/"/g, '""');
  return `"${safe}"`;
}

export function createExcelCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(csvCell), ...rows.map((row) => row.map(csvCell))]
    .map((row) => row.join(";"));
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

