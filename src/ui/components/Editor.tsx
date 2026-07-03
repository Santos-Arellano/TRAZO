// Editor.tsx
// Editor de la consulta Trazo. Tecnica estandar: un <pre> con resaltado detras
// de un <textarea> transparente. Ambos comparten la metrica exacta (.code-layer)
// para que el texto quede pixel-perfect encima del resaltado.
// El resaltado es tolerante a errores (no truena con texto a medio escribir).

import { useRef, useEffect } from "react";

const KEYWORDS = new Set([
  "chart", "grafica", "graph", "kpi", "metrica",
  "of", "de", "by", "por", "top", "sort", "orden",
  "where", "donde", "as", "como", "asc", "desc",
]);
const CHART_TYPES = new Set([
  "line", "bar", "area", "scatter", "pie",
  "linea", "barra", "barras", "dispersion", "pastel", "pay",
]);
const AGGS = new Set([
  "sum", "avg", "count", "min", "max",
  "suma", "promedio", "cuenta", "conteo", "minimo", "maximo",
]);

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Colorea una linea token por token (aproximado, solo visual).
function highlightLine(line: string, hasError: boolean): string {
  if (line.trimStart().startsWith("#") || line.trimStart().startsWith("//")) {
    return `<span style="color:#5A6B72">${esc(line)}</span>`;
  }
  // separa conservando espacios, strings, parentesis y comas
  const parts = line.match(/("[^"]*"|[(),]|[^\s(),]+|\s+)/g) ?? [];
  let out = "";
  for (const p of parts) {
    if (/^\s+$/.test(p)) {
      out += esc(p);
      continue;
    }
    if (p.startsWith('"')) {
      out += `<span style="color:#C6D24E">${esc(p)}</span>`;
      continue;
    }
    if (p === "(" || p === ")" || p === ",") {
      out += `<span style="color:#7C8B90">${esc(p)}</span>`;
      continue;
    }
    const norm = p.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (KEYWORDS.has(norm)) out += `<span style="color:#E8A33D;font-weight:600">${esc(p)}</span>`;
    else if (CHART_TYPES.has(norm)) out += `<span style="color:#4CC2FF">${esc(p)}</span>`;
    else if (AGGS.has(norm)) out += `<span style="color:#5CC8B8">${esc(p)}</span>`;
    else if (/^[0-9.]+$/.test(p)) out += `<span style="color:#E5687A">${esc(p)}</span>`;
    else if (/^[<>=!]+$/.test(p)) out += `<span style="color:#7C8B90">${esc(p)}</span>`;
    else out += `<span style="color:#C8D3D5">${esc(p)}</span>`;
  }
  const bg = hasError ? "background:rgba(229,104,122,0.10);" : "";
  return `<span style="display:block;${bg}min-height:22px">${out || "&nbsp;"}</span>`;
}

interface EditorProps {
  value: string;
  onChange: (v: string) => void;
  errorLine: number | null; // 1-indexed, o null
}

export function Editor({ value, onChange, errorLine }: EditorProps) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  const lines = value.split("\n");
  const highlighted = lines.map((l, i) => highlightLine(l, errorLine === i + 1)).join("");

  // Sincroniza el scroll del textarea con el resaltado y el gutter.
  const syncScroll = () => {
    if (!taRef.current) return;
    const { scrollTop, scrollLeft } = taRef.current;
    if (preRef.current) {
      preRef.current.scrollTop = scrollTop;
      preRef.current.scrollLeft = scrollLeft;
    }
    if (gutterRef.current) gutterRef.current.scrollTop = scrollTop;
  };

  useEffect(() => {
    syncScroll();
  }, [value]);

  // Tab inserta 2 espacios en vez de saltar de foco.
  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = e.currentTarget;
      const s = ta.selectionStart;
      const en = ta.selectionEnd;
      const next = value.slice(0, s) + "  " + value.slice(en);
      onChange(next);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = s + 2;
      });
    }
  };

  return (
    <div className="relative flex h-full overflow-hidden rounded-lg border border-ink-500 bg-ink-800">
      {/* Gutter de numeros de linea */}
      <div
        ref={gutterRef}
        className="code-layer select-none overflow-hidden py-3 pl-3 pr-2 text-right"
        style={{ color: "#4A5A61", minWidth: 40 }}
        aria-hidden
      >
        {lines.map((_, i) => (
          <div
            key={i}
            style={{
              height: 22,
              color: errorLine === i + 1 ? "#E5687A" : undefined,
            }}
          >
            {i + 1}
          </div>
        ))}
      </div>

      {/* Capa de resaltado + textarea encima */}
      <div className="relative flex-1">
        <pre
          ref={preRef}
          className="code-layer pointer-events-none absolute inset-0 overflow-auto py-3 pl-2 pr-3"
          style={{ margin: 0, whiteSpace: "pre", color: "transparent" }}
          aria-hidden
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
        <textarea
          ref={taRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={syncScroll}
          onKeyDown={onKeyDown}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          className="code-layer absolute inset-0 resize-none overflow-auto border-0 bg-transparent py-3 pl-2 pr-3 outline-none"
          style={{ color: "transparent", caretColor: "#E8A33D", whiteSpace: "pre" }}
        />
      </div>
    </div>
  );
}
