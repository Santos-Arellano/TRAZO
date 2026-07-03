// theme.ts
// Los colores del renderer viven aqui, separados del codigo de dibujo, para que
// puedas re-tematizar todo (o dejar que el usuario elija tema) sin tocar la logica.

export interface RenderTheme {
  bg: string;
  grid: string;
  axis: string;
  text: string;
  textMuted: string;
  // paleta categorica para barras/pie/multiples series
  palette: string[];
  // color de linea/area principal
  signal: string;
  signalFill: string;
  fontMono: string;
  fontSans: string;
}

export const DARK_THEME: RenderTheme = {
  bg: "transparent",
  grid: "#26333B",
  axis: "#33454E",
  text: "#C8D3D5",
  textMuted: "#7C8B90",
  palette: ["#5CC8B8", "#E8A33D", "#E5687A", "#8B9FE8", "#C6D24E", "#D98CC4", "#4CC2FF", "#F2B705"],
  signal: "#5CC8B8",
  signalFill: "rgba(92, 200, 184, 0.14)",
  fontMono: "11px ui-monospace, 'SF Mono', Menlo, monospace",
  fontSans: "12px -apple-system, 'Segoe UI', sans-serif",
};
