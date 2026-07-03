// ChartCard.tsx
// Envuelve el ChartRenderer (canvas) en un componente React. Se encarga de:
//   - medir el contenedor y redibujar en resize
//   - pasar el spec al renderer
//   - manejar el tooltip via hit-testing del mouse
// El renderer no sabe nada de React; este componente es el puente.

import { useEffect, useRef, useState } from "react";
import { ChartSpec } from "../../engine/codegen/chartspec";
import { formatNumber } from "../../engine/codegen/codegen";
import { ChartRenderer } from "../../renderer/canvasRenderer";

interface Tooltip {
  x: number;
  y: number;
  label: string;
  value: string;
  color: string;
}

export function ChartCard({ spec }: { spec: ChartSpec }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<ChartRenderer | null>(null);
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);

  // Crea el renderer una vez.
  useEffect(() => {
    if (!canvasRef.current) return;
    rendererRef.current = new ChartRenderer(canvasRef.current);
  }, []);

  // Redibuja cuando cambia el spec o el tamano.
  useEffect(() => {
    const wrap = wrapRef.current;
    const renderer = rendererRef.current;
    if (!wrap || !renderer) return;

    const redraw = () => {
      const rect = wrap.getBoundingClientRect();
      renderer.resize(rect.width, rect.height);
      renderer.draw(spec);
    };
    redraw();

    const ro = new ResizeObserver(redraw);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [spec]);

  const exportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `${spec.title.replace(/\s+/g, "_").toLowerCase()}.png`;
    a.click();
  };

  const onMove = (e: React.MouseEvent) => {
    const renderer = rendererRef.current;
    const canvas = canvasRef.current;
    if (!renderer || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const hit = renderer.hitTest(mx, my);
    if (hit) {
      setTooltip({
        x: hit.cx,
        y: hit.cy,
        label: hit.point.label,
        value: formatNumber(hit.point.value),
        color: hit.seriesColor,
      });
    } else {
      setTooltip(null);
    }
  };

  return (
    <div className="flex flex-col rounded-lg border border-ink-500 bg-ink-800 p-4">
      <div className="group mb-1 flex items-baseline justify-between">
        <h3 className="text-sm font-medium text-mist">{spec.title}</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={exportPNG}
            className="font-mono text-[10px] uppercase tracking-wider text-muted opacity-0 transition-opacity hover:text-signal group-hover:opacity-100"
            title="Descargar como PNG"
          >
            png
          </button>
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted">{spec.chartType}</span>
        </div>
      </div>
      <div
        ref={wrapRef}
        className="relative h-56 w-full"
        onMouseMove={onMove}
        onMouseLeave={() => setTooltip(null)}
      >
        <canvas ref={canvasRef} className="absolute inset-0" />
        {tooltip && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border border-ink-400 bg-ink-900/95 px-2 py-1 shadow-lg"
            style={{ left: tooltip.x, top: tooltip.y - 8 }}
          >
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-sm" style={{ background: tooltip.color }} />
              <span className="text-xs text-mist">{tooltip.label}</span>
            </div>
            <div className="font-mono text-sm font-semibold text-mist">{tooltip.value}</div>
          </div>
        )}
      </div>
    </div>
  );
}
