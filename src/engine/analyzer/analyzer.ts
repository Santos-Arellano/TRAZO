// analyzer.ts
// Analisis semantico. El parser ya garantizo que la SINTAXIS es valida; aqui
// verificamos que el programa TENGA SENTIDO contra los datos cargados:
//   - que las columnas existan
//   - que la medida sea numerica (salvo count, que aplica a cualquiera)
//   - que los filtros usen columnas reales
// Esto es lo que en un compilador de verdad seria el "type checking".

import { Program } from "../parser/ast";
import { DataFrame } from "../data/dataframe";
import { TrazoError } from "../errors";

// Distancia de edicion barata para sugerir "quisiste decir ...?"
function closest(name: string, options: string[]): string | null {
  let best: string | null = null;
  let bestScore = Infinity;
  const a = name.toLowerCase();
  for (const opt of options) {
    const d = levenshtein(a, opt.toLowerCase());
    if (d < bestScore) {
      bestScore = d;
      best = opt;
    }
  }
  // solo sugerir si esta razonablemente cerca
  return best && bestScore <= Math.max(2, Math.floor(name.length / 2)) ? best : null;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

export function analyze(program: Program, df: DataFrame): void {
  const cols = df.columnNames();

  const requireColumn = (name: string, line: number, role: string) => {
    if (df.hasColumn(name)) return;
    const hint = closest(name, cols);
    const suffix = hint ? ` Quisiste decir "${hint}"?` : ` Columnas disponibles: ${cols.join(", ")}.`;
    throw new TrazoError(`La columna "${name}" (${role}) no existe.${suffix}`, line, 0, "semantic");
  };

  const requireNumeric = (name: string, agg: string, line: number) => {
    if (agg === "count") return; // count sirve para cualquier columna
    const info = df.getColumn(name);
    if (info && info.type !== "number") {
      throw new TrazoError(
        `La medida "${name}" no es numerica (es ${info.type}); no se puede aplicar ${agg}. Usa 'count' o elige otra columna.`,
        line,
        0,
        "semantic"
      );
    }
  };

  for (const stmt of program.statements) {
    // medida
    requireColumn(stmt.measure.column, stmt.line, "medida");
    requireNumeric(stmt.measure.column, stmt.measure.agg, stmt.line);

    // dimension (solo charts)
    if (stmt.kind === "chart") {
      requireColumn(stmt.dimension, stmt.line, "dimension");
    }

    // filtros
    for (const f of stmt.filters) {
      requireColumn(f.column, stmt.line, "filtro where");
    }
  }
}
