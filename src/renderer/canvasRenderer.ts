// canvasRenderer.ts
// Dibuja un ChartSpec sobre un <canvas>. Escrito a mano con Canvas 2D:
//   - maneja devicePixelRatio (retina de tu M1) para lineas nitidas
//   - dibuja ejes, gridlines y etiquetas
//   - soporta line, bar, area, scatter, pie
//   - hit-testing: dado (x,y) del mouse, devuelve el punto de dato mas cercano
//
// Es intencionalmente agnostico del framework: recibe un canvas y un spec, nada mas.
// El dia que migres a WebGPU, reescribes ESTE archivo y el resto del proyecto no se entera.

import { ChartSpec, DataPoint } from "../engine/codegen/chartspec";
import { formatNumber } from "../engine/codegen/codegen";
import { RenderTheme, DARK_THEME } from "./theme";

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

// Un punto dibujado, con su geometria, para hit-testing y tooltips.
export interface HitTarget {
  point: DataPoint;
  cx: number; // centro en px (coords CSS, no device)
  cy: number;
  seriesColor: string;
}

const PADDING = { top: 18, right: 18, bottom: 44, left: 56 };

export class ChartRenderer {
  private ctx: CanvasRenderingContext2D;
  private theme: RenderTheme;
  private cssWidth = 0;
  private cssHeight = 0;
  private targets: HitTarget[] = [];

  constructor(private canvas: HTMLCanvasElement, theme: RenderTheme = DARK_THEME) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo obtener el contexto 2D del canvas");
    this.ctx = ctx;
    this.theme = theme;
  }

  // Ajusta el tamano del buffer al contenedor y al dpr. Llamar antes de draw y en resize.
  resize(cssWidth: number, cssHeight: number) {
    const dpr = window.devicePixelRatio || 1;
    this.cssWidth = cssWidth;
    this.cssHeight = cssHeight;
    this.canvas.width = Math.round(cssWidth * dpr);
    this.canvas.height = Math.round(cssHeight * dpr);
    this.canvas.style.width = cssWidth + "px";
    this.canvas.style.height = cssHeight + "px";
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  draw(spec: ChartSpec) {
    const ctx = this.ctx;
    this.targets = [];
    ctx.clearRect(0, 0, this.cssWidth, this.cssHeight);

    const plot: Rect = {
      x: PADDING.left,
      y: PADDING.top,
      w: this.cssWidth - PADDING.left - PADDING.right,
      h: this.cssHeight - PADDING.top - PADDING.bottom,
    };

    if (spec.data.length === 0) {
      this.drawEmpty(plot);
      return;
    }

    switch (spec.chartType) {
      case "pie":
        this.drawPie(spec, plot);
        break;
      case "bar":
        this.drawAxes(spec, plot, true);
        this.drawBars(spec, plot);
        break;
      case "line":
        this.drawAxes(spec, plot, false);
        this.drawLine(spec, plot, false);
        break;
      case "area":
        this.drawAxes(spec, plot, false);
        this.drawLine(spec, plot, true);
        break;
      case "scatter":
        this.drawAxes(spec, plot, false);
        this.drawScatter(spec, plot);
        break;
    }
  }

  // Devuelve el target mas cercano al cursor dentro de un radio, o null.
  hitTest(mx: number, my: number, radius = 26): HitTarget | null {
    let best: HitTarget | null = null;
    let bestD = radius * radius;
    for (const t of this.targets) {
      const dx = t.cx - mx;
      const dy = t.cy - my;
      const d = dx * dx + dy * dy;
      if (d < bestD) {
        bestD = d;
        best = t;
      }
    }
    return best;
  }

  // --- helpers de escala ---

  private valueBounds(data: DataPoint[]): { min: number; max: number } {
    let min = Infinity;
    let max = -Infinity;
    for (const d of data) {
      if (d.value < min) min = d.value;
      if (d.value > max) max = d.value;
    }
    if (!Number.isFinite(min)) {
      min = 0;
      max = 1;
    }
    // Siempre incluye el 0 para barras/area; da nice-round arriba.
    min = Math.min(0, min);
    max = niceCeil(max === min ? max + 1 : max);
    return { min, max };
  }

  private drawAxes(spec: ChartSpec, plot: Rect, categorical: boolean) {
    const ctx = this.ctx;
    const { min, max } = this.valueBounds(spec.data);

    // Gridlines horizontales + etiquetas del eje Y
    const ticks = 4;
    ctx.font = this.theme.fontMono;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let i = 0; i <= ticks; i++) {
      const v = min + ((max - min) * i) / ticks;
      const y = plot.y + plot.h - ((v - min) / (max - min)) * plot.h;
      ctx.strokeStyle = this.theme.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(plot.x, y);
      ctx.lineTo(plot.x + plot.w, y);
      ctx.stroke();
      ctx.fillStyle = this.theme.textMuted;
      ctx.fillText(formatNumber(v), plot.x - 8, y);
    }

    // Etiquetas del eje X
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = this.theme.textMuted;
    const n = spec.data.length;
    const step = categorical ? plot.w / n : n > 1 ? plot.w / (n - 1) : plot.w;
    // Muestra como maximo ~10 etiquetas para no saturar.
    const stride = Math.max(1, Math.ceil(n / 10));
    for (let i = 0; i < n; i++) {
      if (i % stride !== 0 && i !== n - 1) continue;
      const cx = categorical ? plot.x + step * (i + 0.5) : plot.x + step * i;
      const label = truncate(spec.data[i].label, 10);
      ctx.fillText(label, cx, plot.y + plot.h + 8);
    }
  }

  private drawBars(spec: ChartSpec, plot: Rect) {
    const ctx = this.ctx;
    const { min, max } = this.valueBounds(spec.data);
    const n = spec.data.length;
    const slot = plot.w / n;
    const barW = Math.min(slot * 0.7, 60);

    spec.data.forEach((d, i) => {
      const color = this.theme.palette[i % this.theme.palette.length];
      const h = ((d.value - min) / (max - min)) * plot.h;
      const x = plot.x + slot * i + (slot - barW) / 2;
      const y = plot.y + plot.h - h;
      ctx.fillStyle = color;
      roundRect(ctx, x, y, barW, h, 3);
      ctx.fill();
      this.targets.push({ point: d, cx: x + barW / 2, cy: y, seriesColor: color });
    });
  }

  private drawLine(spec: ChartSpec, plot: Rect, fill: boolean) {
    const ctx = this.ctx;
    const { min, max } = this.valueBounds(spec.data);
    const n = spec.data.length;
    const step = n > 1 ? plot.w / (n - 1) : plot.w;
    const pts = spec.data.map((d, i) => ({
      x: plot.x + step * i,
      y: plot.y + plot.h - ((d.value - min) / (max - min)) * plot.h,
      d,
    }));

    if (fill) {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, plot.y + plot.h);
      pts.forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.lineTo(pts[pts.length - 1].x, plot.y + plot.h);
      ctx.closePath();
      ctx.fillStyle = this.theme.signalFill;
      ctx.fill();
    }

    ctx.beginPath();
    pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.strokeStyle = this.theme.signal;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.stroke();

    // puntos
    pts.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = this.theme.signal;
      ctx.fill();
      this.targets.push({ point: p.d, cx: p.x, cy: p.y, seriesColor: this.theme.signal });
    });
  }

  private drawScatter(spec: ChartSpec, plot: Rect) {
    const ctx = this.ctx;
    const { min, max } = this.valueBounds(spec.data);
    const n = spec.data.length;
    const step = n > 1 ? plot.w / (n - 1) : plot.w;
    spec.data.forEach((d, i) => {
      const color = this.theme.palette[i % this.theme.palette.length];
      const x = plot.x + step * i;
      const y = plot.y + plot.h - ((d.value - min) / (max - min)) * plot.h;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.85;
      ctx.fill();
      ctx.globalAlpha = 1;
      this.targets.push({ point: d, cx: x, cy: y, seriesColor: color });
    });
  }

  private drawPie(spec: ChartSpec, plot: Rect) {
    const ctx = this.ctx;
    const total = spec.data.reduce((a, b) => a + Math.max(0, b.value), 0) || 1;
    const cx = plot.x + plot.w / 2;
    const cy = plot.y + plot.h / 2;
    const r = Math.min(plot.w, plot.h) / 2 - 8;
    let angle = -Math.PI / 2;

    spec.data.forEach((d, i) => {
      const color = this.theme.palette[i % this.theme.palette.length];
      const slice = (Math.max(0, d.value) / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, angle, angle + slice);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      // separador
      ctx.strokeStyle = "#0E1417";
      ctx.lineWidth = 2;
      ctx.stroke();

      const mid = angle + slice / 2;
      this.targets.push({
        point: d,
        cx: cx + Math.cos(mid) * r * 0.6,
        cy: cy + Math.sin(mid) * r * 0.6,
        seriesColor: color,
      });
      angle += slice;
    });
  }

  private drawEmpty(plot: Rect) {
    const ctx = this.ctx;
    ctx.fillStyle = this.theme.textMuted;
    ctx.font = this.theme.fontSans;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Sin datos para esta consulta", plot.x + plot.w / 2, plot.y + plot.h / 2);
  }
}

// --- utilidades de dibujo ---

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function niceCeil(v: number): number {
  if (v <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const norm = v / mag;
  let nice: number;
  if (norm <= 1) nice = 1;
  else if (norm <= 2) nice = 2;
  else if (norm <= 5) nice = 5;
  else nice = 10;
  return nice * mag;
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}
