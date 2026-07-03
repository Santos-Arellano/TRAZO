// compile.ts
// El director de orquesta. Encadena todas las etapas del compilador y devuelve
// un resultado rico: los specs finales, los diagnosticos (errores), y las etapas
// intermedias (tokens, AST) para que la UI pueda mostrar el pipeline en vivo.
//
//   source --tokenize--> tokens --parse--> AST --analyze--> (validado) --generate--> specs

import { tokenize } from "./lexer/lexer";
import { parse } from "./parser/parser";
import { analyze } from "./analyzer/analyzer";
import { generate } from "./codegen/codegen";
import { DataFrame } from "./data/dataframe";
import { Token } from "./lexer/tokens";
import { Program } from "./parser/ast";
import { Spec } from "./codegen/chartspec";
import { TrazoError } from "./errors";

export interface Diagnostic {
  message: string;
  line: number;
  col: number;
  stage: string;
}

export interface CompileResult {
  ok: boolean;
  specs: Spec[];
  diagnostics: Diagnostic[];
  // etapas intermedias (para visualizar el compilador)
  tokens: Token[] | null;
  ast: Program | null;
  // cuantas etapas se completaron: util para el indicador de pipeline
  stagesCompleted: number; // 0=nada 1=lex 2=parse 3=analyze 4=codegen
}

export function compile(source: string, df: DataFrame): CompileResult {
  const result: CompileResult = {
    ok: false,
    specs: [],
    diagnostics: [],
    tokens: null,
    ast: null,
    stagesCompleted: 0,
  };

  try {
    // 1. Lexico
    const tokens = tokenize(source);
    result.tokens = tokens;
    result.stagesCompleted = 1;

    // 2. Sintaxis
    const ast = parse(tokens);
    result.ast = ast;
    result.stagesCompleted = 2;

    // Programa vacio: valido pero sin nada que dibujar.
    if (ast.statements.length === 0) {
      result.ok = true;
      result.stagesCompleted = 4;
      return result;
    }

    // 3. Semantica (necesita los datos)
    analyze(ast, df);
    result.stagesCompleted = 3;

    // 4. Generacion
    const specs = generate(ast, df);
    result.specs = specs;
    result.stagesCompleted = 4;

    result.ok = true;
    return result;
  } catch (e) {
    const err = e as TrazoError;
    result.diagnostics.push({
      message: err.message ?? String(e),
      line: err.line ?? 0,
      col: err.col ?? 0,
      stage: err.stage ?? "compile",
    });
    return result;
  }
}
