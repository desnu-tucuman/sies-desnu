export class SheetsConnectionError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "SheetsConnectionError";
  }
}

export class SheetHeadersError extends Error {
  constructor(
    readonly sheet: string,
    readonly missingColumns: string[],
    readonly foundColumns: string[],
  ) {
    super(
      `Encabezados inválidos en la hoja "${sheet}". Columnas faltantes: ${missingColumns.join(", ")}. Columnas encontradas: ${foundColumns.length ? foundColumns.join(", ") : "ninguna"}.`,
    );
    this.name = "SheetHeadersError";
  }
}

