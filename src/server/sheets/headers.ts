import { SheetHeadersError } from "./errors";

export function validateHeaders(
  sheet: string,
  foundColumns: string[],
  requiredColumns: readonly string[],
): void {
  const found = new Set(foundColumns);
  const missing = requiredColumns.filter((column) => !found.has(column));
  if (missing.length) {
    throw new SheetHeadersError(sheet, missing, foundColumns);
  }
}

export function columnLetter(columnNumber: number): string {
  if (!Number.isInteger(columnNumber) || columnNumber < 1) {
    throw new Error("El número de columna debe ser un entero positivo.");
  }

  let number = columnNumber;
  let result = "";
  while (number > 0) {
    number -= 1;
    result = String.fromCharCode(65 + (number % 26)) + result;
    number = Math.floor(number / 26);
  }
  return result;
}

