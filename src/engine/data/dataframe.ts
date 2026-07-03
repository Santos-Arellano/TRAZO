// dataframe.ts
// Una tabla en memoria, columnar por dentro para que las agregaciones sean rapidas.
// Aqui vive la logica de group-by / agregacion / filtrado que el codegen usa.
// Esta clase NO sabe nada de graficas ni de UI: es puro motor de datos.

export type CellValue = number | string | null;
export type ColumnType = "number" | "string" | "date";

export interface ColumnInfo {
  name: string;
  type: ColumnType;
}

export class DataFrame {
  // Filas como objetos { columna: valor }.
  readonly rows: Record<string, CellValue>[];
  readonly columns: ColumnInfo[];

  constructor(rows: Record<string, CellValue>[], columns: ColumnInfo[]) {
    this.rows = rows;
    this.columns = columns;
  }

  columnNames(): string[] {
    return this.columns.map((c) => c.name);
  }

  hasColumn(name: string): boolean {
    return this.columns.some((c) => c.name === name);
  }

  getColumn(name: string): ColumnInfo | undefined {
    return this.columns.find((c) => c.name === name);
  }

  // Construye un DataFrame a partir de filas crudas, infiriendo el tipo de cada columna.
  static fromRecords(records: Record<string, unknown>[]): DataFrame {
    if (records.length === 0) return new DataFrame([], []);

    // Union de todas las llaves (por si algunas filas traen columnas faltantes)
    const names: string[] = [];
    const seen = new Set<string>();
    for (const rec of records) {
      for (const k of Object.keys(rec)) {
        if (!seen.has(k)) {
          seen.add(k);
          names.push(k);
        }
      }
    }

    const columns: ColumnInfo[] = names.map((name) => ({
      name,
      type: inferType(records, name),
    }));

    const rows: Record<string, CellValue>[] = records.map((rec) => {
      const row: Record<string, CellValue> = {};
      for (const col of columns) {
        row[col.name] = coerce(rec[col.name], col.type);
      }
      return row;
    });

    return new DataFrame(rows, columns);
  }

  // Aplica una lista de filtros (AND entre todos).
  filter(predicates: ((row: Record<string, CellValue>) => boolean)[]): DataFrame {
    if (predicates.length === 0) return this;
    const rows = this.rows.filter((row) => predicates.every((p) => p(row)));
    return new DataFrame(rows, this.columns);
  }

  // Agrupa por una columna y agrega una medida. Devuelve pares { key, value } listos para graficar.
  groupAggregate(
    groupBy: string,
    measureColumn: string,
    agg: "sum" | "avg" | "count" | "min" | "max"
  ): { key: string; value: number }[] {
    const buckets = new Map<string, number[]>();

    for (const row of this.rows) {
      const rawKey = row[groupBy];
      const key = rawKey === null || rawKey === undefined ? "(vacio)" : String(rawKey);
      const raw = row[measureColumn];
      const num = typeof raw === "number" ? raw : Number(raw);

      if (!buckets.has(key)) buckets.set(key, []);
      // Para count no importa el valor; para el resto necesitamos numeros validos.
      if (agg === "count") {
        buckets.get(key)!.push(1);
      } else if (Number.isFinite(num)) {
        buckets.get(key)!.push(num);
      }
    }

    const result: { key: string; value: number }[] = [];
    for (const [key, values] of buckets) {
      result.push({ key, value: applyAgg(values, agg) });
    }
    return result;
  }

  // Agrega la tabla completa a una sola cifra (para KPIs).
  scalarAggregate(measureColumn: string, agg: "sum" | "avg" | "count" | "min" | "max"): number {
    if (agg === "count") return this.rows.length;
    const values: number[] = [];
    for (const row of this.rows) {
      const raw = row[measureColumn];
      const num = typeof raw === "number" ? raw : Number(raw);
      if (Number.isFinite(num)) values.push(num);
    }
    return applyAgg(values, agg);
  }
}

function applyAgg(values: number[], agg: "sum" | "avg" | "count" | "min" | "max"): number {
  if (agg === "count") return values.length;
  if (values.length === 0) return 0;
  switch (agg) {
    case "sum":
      return values.reduce((a, b) => a + b, 0);
    case "avg":
      return values.reduce((a, b) => a + b, 0) / values.length;
    case "min":
      return Math.min(...values);
    case "max":
      return Math.max(...values);
  }
}

// --- Inferencia y coercion de tipos ---

function inferType(records: Record<string, unknown>[], name: string): ColumnType {
  let numeric = 0;
  let dateLike = 0;
  let total = 0;

  for (const rec of records) {
    const v = rec[name];
    if (v === null || v === undefined || v === "") continue;
    total++;
    if (typeof v === "number" || isNumericString(v)) numeric++;
    else if (isDateString(String(v))) dateLike++;
  }

  if (total === 0) return "string";
  if (numeric / total >= 0.8) return "number";
  if (dateLike / total >= 0.8) return "date";
  return "string";
}

function coerce(value: unknown, type: ColumnType): CellValue {
  if (value === null || value === undefined || value === "") return null;
  if (type === "number") {
    const n = typeof value === "number" ? value : Number(String(value).replace(/[$,%\s]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  // date y string se guardan como string por ahora (el eje X las ordena como texto/fecha)
  return String(value);
}

function isNumericString(v: unknown): boolean {
  if (typeof v !== "string") return false;
  const cleaned = v.replace(/[$,%\s]/g, "");
  return cleaned !== "" && Number.isFinite(Number(cleaned));
}

function isDateString(v: string): boolean {
  // Detecta formatos comunes: 2024-01-15, 01/15/2024, etc.
  if (/^\d{4}-\d{1,2}-\d{1,2}/.test(v)) return true;
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(v)) return true;
  return false;
}
