// errors.ts
// Un tipo de error unico para todo el motor. Lleva linea y columna para que
// el editor pueda subrayar exactamente donde esta el problema.

export class TrazoError extends Error {
  line: number;
  col: number;
  // "lex" | "parse" | "semantic" | "data" -> util para mostrar en que etapa fallo
  stage: string;

  constructor(message: string, line = 0, col = 0, stage = "compile") {
    super(message);
    this.name = "TrazoError";
    this.line = line;
    this.col = col;
    this.stage = stage;
  }
}
