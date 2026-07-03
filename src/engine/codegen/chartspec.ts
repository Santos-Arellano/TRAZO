// chartspec.ts
// El "codigo objeto" del compilador. Un ChartSpec describe QUE dibujar, sin decir
// COMO ni con que tecnologia. Esta es la frontera clave de la arquitectura:
//
//   texto  ->  [motor]  ->  ChartSpec  ->  [renderer]  ->  pixeles
//
// Hoy el renderer es Canvas 2D. Manana puede ser WebGPU. El motor no cambia,
// porque solo produce ChartSpecs. Este desacople es lo que hace el proyecto escalable.

export type ChartType = "line" | "bar" | "area" | "scatter" | "pie";

export interface DataPoint {
  label: string; // categoria / eje X
  value: number; // magnitud / eje Y
}

export interface ChartSpec {
  kind: "chart";
  id: string;
  chartType: ChartType;
  title: string;
  xLabel: string;
  yLabel: string;
  data: DataPoint[];
}

export interface KpiSpec {
  kind: "kpi";
  id: string;
  title: string;
  value: number;
  // formato sugerido para mostrar
  formatted: string;
}

export type Spec = ChartSpec | KpiSpec;
