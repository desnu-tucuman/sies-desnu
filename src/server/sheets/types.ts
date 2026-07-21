export type SheetRow = Record<string, string>;

export interface SheetTable {
  sheet: string;
  headers: string[];
  rows: SheetRow[];
}

