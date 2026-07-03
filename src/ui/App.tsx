// App.tsx
// El componente raiz. Mantiene el estado (datos + consulta), compila de forma
// reactiva en cada cambio (el motor es sincrono y rapido), y pinta el dashboard.
//
// Flujo de datos de la app:
//   [datos + consulta]  --useMemo(compile)-->  [CompileResult]  -->  dashboard

import { useMemo, useState } from "react";
import { compile } from "../engine/compile";
import { DataFrame } from "../engine/data/dataframe";
import { loadData } from "../engine/index";
import { SAMPLE_CSV, SAMPLE_FILENAME, STARTER_QUERY } from "./sampleData";
import { Editor } from "./components/Editor";
import { DataPanel } from "./components/DataPanel";
import { PipelineBar } from "./components/PipelineBar";
import { ChartCard } from "./components/ChartCard";
import { KpiCard } from "./components/KpiCard";

export default function App() {
  const [df, setDf] = useState<DataFrame>(() => loadData(SAMPLE_FILENAME, SAMPLE_CSV));
  const [filename, setFilename] = useState(SAMPLE_FILENAME);
  const [query, setQuery] = useState(STARTER_QUERY);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Compilacion reactiva: cada tecla recompila. El motor es puro y veloz.
  const result = useMemo(() => compile(query, df), [query, df]);

  const diag = result.diagnostics[0] ?? null;
  const kpis = result.specs.filter((s) => s.kind === "kpi");
  const charts = result.specs.filter((s) => s.kind === "chart");

  const exportSpecs = () => {
    const blob = new Blob([JSON.stringify({ query, specs: result.specs }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "trazo-dashboard.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full flex-col bg-ink-900">
      {/* Barra superior */}
      <header className="flex items-center justify-between border-b border-ink-500 px-4 py-2.5">
        <div className="flex items-baseline gap-2.5">
          <span className="font-mono text-base font-semibold tracking-tight text-mist">
            trazo<span className="text-signal">.</span>
          </span>
          <span className="hidden text-xs text-muted sm:inline">escribe, dibuja · 100% local</span>
        </div>
        <button
          onClick={exportSpecs}
          className="rounded-md border border-ink-400 px-3 py-1 text-xs text-mist transition-colors hover:border-signal hover:text-signal"
        >
          Exportar dashboard
        </button>
      </header>

      <div className="border-b border-ink-500 px-4 py-2">
        <PipelineBar result={result} />
      </div>

      {/* Cuerpo: 3 columnas en desktop, apiladas en movil */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-3 lg:grid lg:grid-cols-[220px_minmax(340px,1fr)_minmax(0,1.4fr)] lg:overflow-hidden">
        {/* Panel de datos */}
        <div className="min-h-[220px] lg:h-full lg:min-h-0">
          <DataPanel
            df={df}
            filename={filename}
            onLoad={(next, name) => {
              setDf(next);
              setFilename(name);
              setLoadError(null);
            }}
            onError={setLoadError}
          />
        </div>

        {/* Editor + errores */}
        <div className="flex min-h-[300px] flex-col gap-2 lg:h-full lg:min-h-0">
          <div className="min-h-0 flex-1">
            <Editor value={query} onChange={setQuery} errorLine={diag?.line ?? null} />
          </div>
          {loadError && (
            <div className="rounded-md border border-bad/40 bg-bad/10 px-3 py-2 text-xs text-bad">
              Datos: {loadError}
            </div>
          )}
          {diag ? (
            <div className="rounded-md border border-bad/40 bg-bad/10 px-3 py-2 text-xs text-bad">
              <span className="font-mono text-[10px] uppercase tracking-wider opacity-70">
                {diag.stage}
                {diag.line > 0 ? ` · linea ${diag.line}` : ""}
              </span>
              <div className="mt-0.5">{diag.message}</div>
            </div>
          ) : (
            <div className="rounded-md border border-ink-500 bg-ink-800 px-3 py-2 font-mono text-[11px] text-muted">
              <span className="text-good">✓</span> {result.specs.length} vistas generadas
            </div>
          )}
        </div>

        {/* Dashboard */}
        <div className="min-h-0 overflow-auto lg:h-full">
          {result.specs.length === 0 ? (
            <EmptyState hasError={!result.ok} />
          ) : (
            <div className="space-y-3">
              {kpis.length > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {kpis.map((s) => s.kind === "kpi" && <KpiCard key={s.id} spec={s} />)}
                </div>
              )}
              <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                {charts.map((s) => s.kind === "chart" && <ChartCard key={s.id} spec={s} />)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ hasError }: { hasError: boolean }) {
  return (
    <div className="flex h-full min-h-[200px] items-center justify-center rounded-lg border border-dashed border-ink-500 p-6 text-center">
      <div className="max-w-xs">
        <div className="font-mono text-sm text-mist">
          {hasError ? "Arregla la consulta para ver el dashboard" : "Escribe una consulta"}
        </div>
        <div className="mt-1 text-xs text-muted">
          Ejemplo: <span className="font-mono text-signal2">chart bar of sum(ingreso) by region</span>
        </div>
      </div>
    </div>
  );
}
