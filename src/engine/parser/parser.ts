// parser.ts
// Parser recursive-descent (descenso recursivo) hecho a mano.
// Toma la lista de tokens del lexer y construye el AST.
//
// Gramatica (informal, estilo EBNF):
//
//   program    := statement (NEWLINE statement)*
//   statement  := chartStmt | kpiStmt
//   chartStmt  := "chart" CHART_TYPE "of" measure "by" IDENT modifier*
//   kpiStmt    := "kpi" measure modifier*
//   measure    := AGG "(" IDENT ")" | AGG IDENT | IDENT
//   modifier   := "top" NUMBER
//               | "sort" ("asc" | "desc")
//               | "where" IDENT OP value
//               | "as" STRING
//   value      := NUMBER | STRING | IDENT

import { Token, TokenType } from "../lexer/tokens";
import { TrazoError } from "../errors";
import {
  Program,
  Statement,
  ChartStmt,
  KpiStmt,
  Measure,
  Filter,
  AggFn,
  ChartType,
  CompareOp,
  SortDir,
} from "./ast";

export function parse(tokens: Token[]): Program {
  let pos = 0;

  const peek = (o = 0) => tokens[pos + o];
  const isAtEnd = () => peek().type === TokenType.EOF;

  function advance(): Token {
    if (!isAtEnd()) pos++;
    return tokens[pos - 1];
  }
  function check(type: TokenType): boolean {
    return peek().type === type;
  }
  function match(...types: TokenType[]): boolean {
    for (const t of types) {
      if (check(t)) {
        advance();
        return true;
      }
    }
    return false;
  }
  function expect(type: TokenType, msg: string): Token {
    if (check(type)) return advance();
    const t = peek();
    throw new TrazoError(`${msg} (encontre "${t.value || t.type}")`, t.line, t.col, "parse");
  }
  function skipNewlines() {
    while (check(TokenType.NEWLINE)) advance();
  }

  function parseMeasure(): Measure {
    // AGG "(" IDENT ")"  |  AGG IDENT  |  IDENT
    if (check(TokenType.AGG)) {
      const agg = advance().value as AggFn;
      let col: string;
      if (match(TokenType.LPAREN)) {
        col = expect(TokenType.IDENT, "Esperaba un nombre de columna dentro de los parentesis").value;
        expect(TokenType.RPAREN, "Falta cerrar el parentesis )");
      } else {
        col = expect(TokenType.IDENT, "Esperaba un nombre de columna despues de la agregacion").value;
      }
      return { agg, column: col, label: `${agg}(${col})` };
    }
    // Solo una columna: agregacion por defecto = sum
    const col = expect(TokenType.IDENT, "Esperaba una columna o una agregacion (sum, avg, count, min, max)").value;
    return { agg: "sum", column: col, label: col };
  }

  function parseValue(): string | number {
    const t = peek();
    if (t.type === TokenType.NUMBER) {
      advance();
      return Number(t.value);
    }
    if (t.type === TokenType.STRING || t.type === TokenType.IDENT) {
      advance();
      return t.value;
    }
    throw new TrazoError(`Esperaba un valor (numero o texto) en el filtro`, t.line, t.col, "parse");
  }

  // Modificadores compartidos por chart y kpi.
  function parseModifiers(target: { filters: Filter[]; top?: number; sort?: SortDir; title?: string }) {
    while (true) {
      if (match(TokenType.TOP)) {
        const n = expect(TokenType.NUMBER, "Esperaba un numero despues de 'top'");
        target.top = Math.floor(Number(n.value));
        continue;
      }
      if (match(TokenType.SORT)) {
        if (match(TokenType.ASC)) target.sort = "asc";
        else if (match(TokenType.DESC)) target.sort = "desc";
        else {
          const t = peek();
          throw new TrazoError("Despues de 'sort' esperaba 'asc' o 'desc'", t.line, t.col, "parse");
        }
        continue;
      }
      if (match(TokenType.WHERE)) {
        const col = expect(TokenType.IDENT, "Esperaba una columna despues de 'where'").value;
        const opTok = expect(TokenType.OP, "Esperaba un operador (>, <, ==, !=, >=, <=)");
        const value = parseValue();
        target.filters.push({ column: col, op: opTok.value as CompareOp, value });
        continue;
      }
      if (match(TokenType.AS)) {
        const s = expect(TokenType.STRING, "Despues de 'as' esperaba un titulo entre comillas");
        target.title = s.value;
        continue;
      }
      break;
    }
  }

  function parseChart(line: number): ChartStmt {
    const typeTok = expect(TokenType.CHART_TYPE, "Esperaba un tipo de grafica (line, bar, area, scatter, pie)");
    expect(TokenType.OF, "Esperaba 'of' (o 'de') despues del tipo de grafica");
    const measure = parseMeasure();
    expect(TokenType.BY, "Esperaba 'by' (o 'por') para indicar la dimension del eje X");
    const dimension = expect(TokenType.IDENT, "Esperaba el nombre de una columna para la dimension").value;

    const stmt: ChartStmt = {
      kind: "chart",
      chartType: typeTok.value as ChartType,
      measure,
      dimension,
      filters: [],
      line,
    };
    parseModifiers(stmt);
    return stmt;
  }

  function parseKpi(line: number): KpiStmt {
    const measure = parseMeasure();
    const stmt: KpiStmt = { kind: "kpi", measure, filters: [], line };
    parseModifiers(stmt);
    return stmt;
  }

  function parseStatement(): Statement {
    const t = peek();
    if (match(TokenType.CHART)) return parseChart(t.line);
    if (match(TokenType.KPI)) return parseKpi(t.line);
    throw new TrazoError(
      `Cada linea debe empezar con 'chart' o 'kpi' (encontre "${t.value || t.type}")`,
      t.line,
      t.col,
      "parse"
    );
  }

  const statements: Statement[] = [];
  skipNewlines();
  while (!isAtEnd()) {
    statements.push(parseStatement());
    // Despues de un statement debe venir NEWLINE o EOF
    if (!isAtEnd() && !check(TokenType.NEWLINE)) {
      const t = peek();
      throw new TrazoError(`Sobra algo al final de la linea: "${t.value || t.type}"`, t.line, t.col, "parse");
    }
    skipNewlines();
  }

  return { statements };
}
