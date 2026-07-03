// lexer.ts
// Convierte el texto fuente en una lista de tokens.
// Escaneo caracter por caracter, igual que un lexer clasico (pero a mano,
// sin Flex). Cada token lleva su posicion para reportar errores precisos.

import {
  Token,
  TokenType,
  KEYWORDS,
  CHART_TYPES,
  CHART_TYPE_ALIASES,
  AGGS,
  AGG_ALIASES,
  normalize,
} from "./tokens";
import { TrazoError } from "../errors";

const OPERATORS = new Set([">", "<", ">=", "<=", "==", "!=", "="]);

export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let line = 1;
  let col = 1;

  const peek = (o = 0) => source[i + o];
  const isAtEnd = () => i >= source.length;

  function advance(): string {
    const ch = source[i++];
    if (ch === "\n") {
      line++;
      col = 1;
    } else {
      col++;
    }
    return ch;
  }

  function pushToken(type: TokenType, value: string, start: number, startCol: number, startLine: number) {
    tokens.push({ type, value, line: startLine, col: startCol, start, end: i });
  }

  while (!isAtEnd()) {
    const ch = peek();
    const startCol = col;
    const startLine = line;
    const start = i;

    // Salto de linea = separador de statements
    if (ch === "\n") {
      advance();
      // Colapsa saltos de linea repetidos en un solo NEWLINE logico
      if (tokens.length > 0 && tokens[tokens.length - 1].type !== TokenType.NEWLINE) {
        pushToken(TokenType.NEWLINE, "\\n", start, startCol, startLine);
      }
      continue;
    }

    // Espacios en blanco (no newline)
    if (ch === " " || ch === "\t" || ch === "\r") {
      advance();
      continue;
    }

    // Comentarios de linea: # ... o // ...
    if (ch === "#" || (ch === "/" && peek(1) === "/")) {
      while (!isAtEnd() && peek() !== "\n") advance();
      continue;
    }

    // Strings entre comillas dobles
    if (ch === '"') {
      advance(); // consume la comilla de apertura
      let str = "";
      while (!isAtEnd() && peek() !== '"') {
        if (peek() === "\n") {
          throw new TrazoError("String sin cerrar (falta la comilla de cierre)", startLine, startCol);
        }
        str += advance();
      }
      if (isAtEnd()) {
        throw new TrazoError("String sin cerrar al final del texto", startLine, startCol);
      }
      advance(); // consume la comilla de cierre
      pushToken(TokenType.STRING, str, start, startCol, startLine);
      continue;
    }

    // Numeros (enteros o decimales)
    if (isDigit(ch)) {
      let num = "";
      while (!isAtEnd() && (isDigit(peek()) || peek() === ".")) num += advance();
      pushToken(TokenType.NUMBER, num, start, startCol, startLine);
      continue;
    }

    // Operadores de comparacion (para where)
    if (isOpStart(ch)) {
      let op = advance();
      if (!isAtEnd() && OPERATORS.has(op + peek())) op += advance();
      if (!OPERATORS.has(op)) {
        throw new TrazoError(`Operador desconocido: "${op}"`, startLine, startCol);
      }
      // normaliza "=" a "=="
      pushToken(TokenType.OP, op === "=" ? "==" : op, start, startCol, startLine);
      continue;
    }

    // Parentesis y coma
    if (ch === "(") {
      advance();
      pushToken(TokenType.LPAREN, "(", start, startCol, startLine);
      continue;
    }
    if (ch === ")") {
      advance();
      pushToken(TokenType.RPAREN, ")", start, startCol, startLine);
      continue;
    }
    if (ch === ",") {
      advance();
      pushToken(TokenType.COMMA, ",", start, startCol, startLine);
      continue;
    }

    // Identificadores y palabras clave.
    // Un identificador puede llevar letras, digitos, _ y . (para columnas anidadas de JSON)
    if (isIdentStart(ch)) {
      let raw = "";
      while (!isAtEnd() && isIdentPart(peek())) raw += advance();

      const norm = normalize(raw);

      // Es palabra clave estructural?
      if (KEYWORDS[norm]) {
        pushToken(KEYWORDS[norm], norm, start, startCol, startLine);
        continue;
      }
      // Es tipo de grafica?
      const chartType = CHART_TYPES.has(norm) ? norm : CHART_TYPE_ALIASES[norm];
      if (chartType) {
        pushToken(TokenType.CHART_TYPE, chartType, start, startCol, startLine);
        continue;
      }
      // Es agregacion?
      const agg = AGGS.has(norm) ? norm : AGG_ALIASES[norm];
      if (agg) {
        pushToken(TokenType.AGG, agg, start, startCol, startLine);
        continue;
      }
      // Si no, es un identificador (nombre de columna). Conservamos el texto ORIGINAL,
      // porque los nombres de columna si distinguen mayusculas/acentos.
      pushToken(TokenType.IDENT, raw, start, startCol, startLine);
      continue;
    }

    throw new TrazoError(`Caracter inesperado: "${ch}"`, startLine, startCol);
  }

  // NEWLINE final + EOF
  if (tokens.length > 0 && tokens[tokens.length - 1].type !== TokenType.NEWLINE) {
    tokens.push({ type: TokenType.NEWLINE, value: "\\n", line, col, start: i, end: i });
  }
  tokens.push({ type: TokenType.EOF, value: "", line, col, start: i, end: i });
  return tokens;
}

function isDigit(ch: string): boolean {
  return ch >= "0" && ch <= "9";
}
function isIdentStart(ch: string): boolean {
  return /[a-zA-Z_\u00C0-\u017F]/.test(ch);
}
function isIdentPart(ch: string): boolean {
  return /[a-zA-Z0-9_.\u00C0-\u017F]/.test(ch);
}
function isOpStart(ch: string): boolean {
  return ch === ">" || ch === "<" || ch === "=" || ch === "!";
}
