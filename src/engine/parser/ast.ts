// ast.ts
// El Arbol de Sintaxis Abstracta (AST): la representacion estructurada de un
// programa Trazo despues de parsear. El resto del motor (analyzer, codegen)
// trabaja SOBRE este arbol, nunca sobre el texto crudo. Igual que un compilador real.

export type AggFn = "sum" | "avg" | "count" | "min" | "max";
export type ChartType = "line" | "bar" | "area" | "scatter" | "pie";
export type CompareOp = ">" | "<" | ">=" | "<=" | "==" | "!=";
export type SortDir = "asc" | "desc";

// Una medida: la columna numerica + como se agrega.
// Ej: sum(revenue), avg(price), o solo "revenue" (agregacion por defecto = sum)
export interface Measure {
  agg: AggFn;
  column: string;
  // texto original para mostrar en el eje/leyenda
  label: string;
}

// Un filtro: where region == "norte"
export interface Filter {
  column: string;
  op: CompareOp;
  // valor puede ser numero o string
  value: string | number;
}

// Un statement de grafica.
export interface ChartStmt {
  kind: "chart";
  chartType: ChartType;
  measure: Measure;
  // dimension = eje X / categoria de agrupacion
  dimension: string;
  // modificadores opcionales
  top?: number;
  sort?: SortDir;
  filters: Filter[];
  title?: string;
  // posicion en el fuente (para errores)
  line: number;
}

// Un statement de KPI (una sola cifra grande).
export interface KpiStmt {
  kind: "kpi";
  measure: Measure;
  filters: Filter[];
  title?: string;
  line: number;
}

export type Statement = ChartStmt | KpiStmt;

// El programa completo = lista de statements.
export interface Program {
  statements: Statement[];
}
