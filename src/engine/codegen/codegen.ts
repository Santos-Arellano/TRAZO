// codegen.ts
// La "generacion de codigo" del compilador. Toma cada statement del AST, ejecuta
// las operaciones de datos correspondientes (filtrar, agrupar, agregar, ordenar,
// top-N) y produce un Spec que el renderer puede dibujar sin saber nada del lenguaje.

import { Program, Filter, ChartStmt, KpiStmt } from "../parser/ast";
import { DataFrame, CellValue } from "../data/dataframe";
import { Spec, ChartSpec, KpiSpec, DataPoint } from "./chartspec";

let idCounter = 0;
function nextId(): string {
  idCounter++;
  return `spec_${idCounter}`;
}

export function generate(program: Program, df: DataFrame): Spec[] {
  return program.statements.map((stmt) =>
    stmt.kind === "chart" ? generateChart(stmt, df) : generateKpi(stmt, df)
  );
}

function generateChart(stmt: ChartStmt, df: DataFrame): ChartSpec {
  const filtered = applyFilters(df, stmt.filters);
  let data: DataPoint[] = filtered
    .groupAggregate(stmt.dimension, stmt.measure.column, stmt.measure.agg)
    .map((d) => ({ label: d.key, value: d.value }));

  // Orden: si el usuario no pide sort, ordenamos las categorias de forma natural.
  if (stmt.sort === "desc") {
    data.sort((a, b) => b.value - a.value);
  } else if (stmt.sort === "asc") {
    data.sort((a, b) => a.value - b.value);
  } else {
    data = naturalSort(data);
  }

  // top N (se aplica despues de ordenar por valor si hubo sort; si no, ordena por valor desc para el top)
  if (stmt.top && stmt.top > 0) {
    if (!stmt.sort) {
      data = [...data].sort((a, b) => b.value - a.value);
    }
    data = data.slice(0, stmt.top);
  }

  const title = stmt.title ?? `${stmt.measure.label} por ${stmt.dimension}`;

  return {
    kind: "chart",
    id: nextId(),
    chartType: stmt.chartType,
    title,
    xLabel: stmt.dimension,
    yLabel: stmt.measure.label,
    data,
  };
}

function generateKpi(stmt: KpiStmt, df: DataFrame): KpiSpec {
  const filtered = applyFilters(df, stmt.filters);
  const value = filtered.scalarAggregate(stmt.measure.column, stmt.measure.agg);
  const title = stmt.title ?? stmt.measure.label;
  return {
    kind: "kpi",
    id: nextId(),
    title,
    value,
    formatted: formatNumber(value),
  };
}

function applyFilters(df: DataFrame, filters: Filter[]): DataFrame {
  if (filters.length === 0) return df;
  const predicates = filters.map((f) => makePredicate(f));
  return df.filter(predicates);
}

function makePredicate(f: Filter): (row: Record<string, CellValue>) => boolean {
  return (row) => {
    const cell = row[f.column];
    // Comparacion numerica si ambos lados son numeros; si no, comparacion de texto.
    const cellNum = typeof cell === "number" ? cell : Number(cell);
    const valNum = typeof f.value === "number" ? f.value : Number(f.value);
    const bothNumeric = Number.isFinite(cellNum) && Number.isFinite(valNum);

    if (bothNumeric) return compareNum(cellNum, f.op, valNum);

    const a = cell === null ? "" : String(cell).toLowerCase();
    const b = String(f.value).toLowerCase();
    switch (f.op) {
      case "==":
        return a === b;
      case "!=":
        return a !== b;
      case ">":
        return a > b;
      case "<":
        return a < b;
      case ">=":
        return a >= b;
      case "<=":
        return a <= b;
    }
  };
}

function compareNum(a: number, op: string, b: number): boolean {
  switch (op) {
    case "==":
      return a === b;
    case "!=":
      return a !== b;
    case ">":
      return a > b;
    case "<":
      return a < b;
    case ">=":
      return a >= b;
    case "<=":
      return a <= b;
    default:
      return false;
  }
}

// Orden "natural": si las etiquetas parecen numeros o meses, ordenar con logica;
// si no, dejar el orden de aparicion.
const MONTHS = [
  "ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic",
  "jan", "apr", "aug", "dec",
];

function naturalSort(data: DataPoint[]): DataPoint[] {
  const monthIndex = (s: string) => MONTHS.findIndex((m) => s.toLowerCase().startsWith(m));
  const allMonths = data.every((d) => monthIndex(d.label) !== -1);
  if (allMonths) {
    return [...data].sort((a, b) => monthIndex(a.label) - monthIndex(b.label));
  }
  const allNum = data.every((d) => Number.isFinite(Number(d.label)));
  if (allNum) {
    return [...data].sort((a, b) => Number(a.label) - Number(b.label));
  }
  // fechas ISO se ordenan bien como texto
  const allDates = data.every((d) => /^\d{4}-\d{2}/.test(d.label));
  if (allDates) {
    return [...data].sort((a, b) => a.label.localeCompare(b.label));
  }
  return data;
}

export function formatNumber(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (abs >= 1_000) return (n / 1_000).toFixed(1) + "k";
  if (Number.isInteger(n)) return n.toLocaleString("es-MX");
  return n.toLocaleString("es-MX", { maximumFractionDigits: 2 });
}
