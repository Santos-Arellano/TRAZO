// PipelineBar.tsx
// El elemento distintivo de Trazo: una barra de estado que muestra las etapas del
// compilador encenderse en tiempo real mientras escribes. No es decoracion; refleja
// exactamente hasta donde llego la compilacion (lex -> parse -> semantica -> codegen),
// y donde se detuvo si hubo error. Es "ver el compilador pensar".

import { CompileResult } from "../../engine/compile";

const STAGES = [
  { id: 1, label: "lexico", detail: "tokens" },
  { id: 2, label: "sintaxis", detail: "AST" },
  { id: 3, label: "semantica", detail: "validado" },
  { id: 4, label: "render", detail: "specs" },
];

export function PipelineBar({ result }: { result: CompileResult }) {
  const done = result.stagesCompleted;
  const failedStage = result.ok ? -1 : done + 1;
  const tokenCount = result.tokens?.filter((t) => t.type !== "NEWLINE" && t.type !== "EOF").length ?? 0;
  const stmtCount = result.ast?.statements.length ?? 0;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-ink-500 bg-ink-800 px-3 py-2">
      {STAGES.map((s, i) => {
        const isDone = done >= s.id;
        const isFailed = failedStage === s.id;
        const color = isFailed ? "#E5687A" : isDone ? "#5CC8B8" : "#3A4A52";
        return (
          <div key={s.id} className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span
                className="inline-block h-1.5 w-1.5 rounded-full transition-colors"
                style={{ background: color, boxShadow: isDone && !isFailed ? `0 0 6px ${color}` : "none" }}
              />
              <span className="font-mono text-[11px]" style={{ color: isDone || isFailed ? "#C8D3D5" : "#5A6B72" }}>
                {s.label}
              </span>
            </div>
            {i < STAGES.length - 1 && (
              <span className="font-mono text-[10px]" style={{ color: done > s.id ? "#5CC8B8" : "#3A4A52" }}>
                →
              </span>
            )}
          </div>
        );
      })}

      <div className="ml-auto flex items-center gap-3 font-mono text-[10px] text-muted">
        <span>{tokenCount} tokens</span>
        <span>{stmtCount} statements</span>
        <span className="text-good">local · sin servidor</span>
      </div>
    </div>
  );
}
