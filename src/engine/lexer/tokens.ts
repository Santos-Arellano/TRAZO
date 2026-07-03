// tokens.ts
// Definicion de los tipos de token del lenguaje Trazo.
// Esta es la "tabla de simbolos" lexica: aqui vive todo el vocabulario
// del lenguaje. Agregar una palabra clave nueva = agregar una entrada aqui.

export enum TokenType {
  // Palabras clave estructurales
  CHART = "CHART", // chart / grafica
  KPI = "KPI", // kpi
  OF = "OF", // of / de
  BY = "BY", // by / por

  // Modificadores
  TOP = "TOP", // top
  SORT = "SORT", // sort / orden
  WHERE = "WHERE", // where / donde
  AS = "AS", // as / como  (para titulo)
  ASC = "ASC",
  DESC = "DESC",

  // Tipos de grafica (se validan como identificadores + palabra clave)
  CHART_TYPE = "CHART_TYPE", // line, bar, area, scatter, pie

  // Agregaciones
  AGG = "AGG", // sum, avg, count, min, max

  // Literales / simbolos
  IDENT = "IDENT", // nombre de columna
  STRING = "STRING", // "texto entre comillas"
  NUMBER = "NUMBER", // 10, 3.5
  OP = "OP", // > < >= <= == != (para where)
  LPAREN = "LPAREN",
  RPAREN = "RPAREN",
  COMMA = "COMMA",

  NEWLINE = "NEWLINE", // separa statements
  EOF = "EOF",
}

export interface Token {
  type: TokenType;
  // Valor "canonico" del token (ej. la palabra clave normalizada, el nombre de columna, el numero)
  value: string;
  // Posicion en el texto fuente, para reportar errores con precision
  line: number;
  col: number;
  start: number;
  end: number;
}

// Palabras clave -> tipo de token.
// El lexer normaliza a minusculas y sin acentos antes de buscar aqui,
// asi que soportar espanol e ingles a la vez es trivial: solo agrega alias.
export const KEYWORDS: Record<string, TokenType> = {
  // estructura
  chart: TokenType.CHART,
  grafica: TokenType.CHART,
  graph: TokenType.CHART,
  kpi: TokenType.KPI,
  metrica: TokenType.KPI,
  of: TokenType.OF,
  de: TokenType.OF,
  by: TokenType.BY,
  por: TokenType.BY,
  // modificadores
  top: TokenType.TOP,
  sort: TokenType.SORT,
  orden: TokenType.SORT,
  where: TokenType.WHERE,
  donde: TokenType.WHERE,
  as: TokenType.AS,
  como: TokenType.AS,
  asc: TokenType.ASC,
  desc: TokenType.DESC,
};

// Tipos de grafica soportados.
export const CHART_TYPES = new Set(["line", "bar", "area", "scatter", "pie"]);
export const CHART_TYPE_ALIASES: Record<string, string> = {
  linea: "line",
  barra: "bar",
  barras: "bar",
  area: "area",
  dispersion: "scatter",
  pastel: "pie",
  pay: "pie",
};

// Agregaciones soportadas.
export const AGGS = new Set(["sum", "avg", "count", "min", "max"]);
export const AGG_ALIASES: Record<string, string> = {
  suma: "sum",
  promedio: "avg",
  cuenta: "count",
  conteo: "count",
  minimo: "min",
  maximo: "max",
};

// Quita acentos para que "grafica" y "gráfica" sean lo mismo.
export function normalize(word: string): string {
  return word
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
