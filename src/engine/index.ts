// index.ts
// La API publica del motor. TODO lo que el mundo exterior necesita del compilador
// entra por aqui. El motor no depende de React ni del DOM: es TypeScript puro.
//
// Esto es lo que, el dia que quieras monetizar, empaquetas y vendes/licencias por
// separado del UI (batch en servidor, CLI, plugin, etc.) sin reescribir nada.

export { compile } from "./compile";
export type { CompileResult, Diagnostic } from "./compile";

export { DataFrame } from "./data/dataframe";
export type { CellValue, ColumnInfo, ColumnType } from "./data/dataframe";

export { parseCSV } from "./data/csv";
export { parseJSON } from "./data/json";

export { tokenize } from "./lexer/lexer";
export { parse } from "./parser/parser";
export { generate, formatNumber } from "./codegen/codegen";

export type { Spec, ChartSpec, KpiSpec, DataPoint, ChartType } from "./codegen/chartspec";
export type { Program, Statement, ChartStmt, KpiStmt } from "./parser/ast";
export type { Token, TokenType } from "./lexer/tokens";

export { TrazoError } from "./errors";

// Helper de conveniencia: detecta el formato por extension/contenido y carga.
import { parseCSV } from "./data/csv";
import { parseJSON } from "./data/json";
import { DataFrame } from "./data/dataframe";

export function loadData(filename: string, text: string): DataFrame {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".json")) return parseJSON(text);
  if (lower.endsWith(".csv") || lower.endsWith(".tsv")) return parseCSV(text);
  // Sin extension clara: adivina por el primer caracter no-espacio.
  const trimmed = text.trimStart();
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) return parseJSON(text);
  return parseCSV(text);
}
