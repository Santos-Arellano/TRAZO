// KpiCard.tsx
// Muestra un KPI: una cifra grande con su etiqueta. Simple a proposito.

import { KpiSpec } from "../../engine/codegen/chartspec";

export function KpiCard({ spec }: { spec: KpiSpec }) {
  return (
    <div className="flex flex-col justify-between rounded-lg border border-ink-500 bg-ink-800 p-4">
      <span className="text-xs uppercase tracking-wider text-muted">{spec.title}</span>
      <span className="mt-2 font-mono text-3xl font-semibold text-signal">{spec.formatted}</span>
    </div>
  );
}
