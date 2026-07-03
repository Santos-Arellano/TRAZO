// Editor.tsx
// Editor de la consulta Trazo. Tecnica estandar: un <pre> con resaltado detras
// de un <textarea> transparente. Ambos comparten la metrica exacta (.code-layer)
// para que el texto quede pixel-perfect encima del resaltado.
//
// El resaltado se alimenta del LEXER REAL del motor: los mismos tokens que
// compilan la consulta deciden los colores, asi no hay dos gramaticas que
// mantener en sincronia. Como el lexer truena con texto a medio escribir
// (p.ej. un string sin cerrar), cada linea cae a un resaltado aproximado
// tolerante si su tokenizado falla. Cada linea es lexicamente independiente
// (los strings no cruzan lineas, los comentarios llegan al fin de linea),
// asi que tokenizarla suelta da los mismos tipos que en la consulta completa.

import { useRef, useEffect, useState } from "react";
import { tokenize } from "../../engine/lexer/lexer";
import { TokenType, normalize } from "../../engine/lexer/tokens";
import type { ColumnInfo } from "../../engine/data/dataframe";

// Paleta por familia de token.
const C = {
  keyword: "color:#E8A33D;font-weight:600",
  chartType: "color:#4CC2FF",
  agg: "color:#5CC8B8",
  number: "color:#E5687A",
  string: "color:#C6D24E",
  punct: "color:#7C8B90",
  ident: "color:#C8D3D5",
  comment: "color:#5A6B72",
} as const;

// Estilo CSS para cada tipo de token del lexer.
function styleFor(type: TokenType): string {
  switch (type) {
    case TokenType.CHART:
    case TokenType.KPI:
    case TokenType.OF:
    case TokenType.BY:
    case TokenType.TOP:
    case TokenType.SORT:
    case TokenType.WHERE:
    case TokenType.AS:
    case TokenType.ASC:
    case TokenType.DESC:
      return C.keyword;
    case TokenType.CHART_TYPE:
      return C.chartType;
    case TokenType.AGG:
      return C.agg;
    case TokenType.NUMBER:
      return C.number;
    case TokenType.STRING:
      return C.string;
    case TokenType.OP:
    case TokenType.LPAREN:
    case TokenType.RPAREN:
    case TokenType.COMMA:
      return C.punct;
    default:
      return C.ident;
  }
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Colorea el texto "entre tokens": espacios (sin color) y comentarios (grises).
// En esta gramatica '#' y '//' solo pueden ser comentarios, que llegan al EOL.
function renderTrivia(text: string): string {
  const hash = text.indexOf("#");
  const slash = text.indexOf("//");
  const at = hash === -1 ? slash : slash === -1 ? hash : Math.min(hash, slash);
  if (at === -1) return esc(text);
  return esc(text.slice(0, at)) + `<span style="${C.comment}">${esc(text.slice(at))}</span>`;
}

// Resaltado con el lexer real. Usa los offsets start/end de cada token sobre
// el texto ORIGINAL, rellenando los huecos (trivia) con renderTrivia.
function highlightWithLexer(line: string): string {
  const tokens = tokenize(line); // puede lanzar TrazoError
  let out = "";
  let pos = 0;
  for (const t of tokens) {
    if (t.type === TokenType.NEWLINE || t.type === TokenType.EOF) continue;
    if (t.start > pos) out += renderTrivia(line.slice(pos, t.start));
    out += `<span style="${styleFor(t.type)}">${esc(line.slice(t.start, t.end))}</span>`;
    pos = t.end;
  }
  if (pos < line.length) out += renderTrivia(line.slice(pos));
  return out;
}

// Resaltado aproximado (regex) de respaldo, para lineas que el lexer no puede
// tokenizar todavia (string sin cerrar, caracter inesperado a medio escribir).
function highlightApprox(line: string): string {
  if (line.trimStart().startsWith("#") || line.trimStart().startsWith("//")) {
    return `<span style="${C.comment}">${esc(line)}</span>`;
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
      out += `<span style="${C.string}">${esc(p)}</span>`;
      continue;
    }
    if (p === "(" || p === ")" || p === ",") {
      out += `<span style="${C.punct}">${esc(p)}</span>`;
      continue;
    }
    const norm = p.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (APPROX_KEYWORDS.has(norm)) out += `<span style="${C.keyword}">${esc(p)}</span>`;
    else if (APPROX_CHART_TYPES.has(norm)) out += `<span style="${C.chartType}">${esc(p)}</span>`;
    else if (APPROX_AGGS.has(norm)) out += `<span style="${C.agg}">${esc(p)}</span>`;
    else if (/^[0-9.]+$/.test(p)) out += `<span style="${C.number}">${esc(p)}</span>`;
    else if (/^[<>=!]+$/.test(p)) out += `<span style="${C.punct}">${esc(p)}</span>`;
    else out += `<span style="${C.ident}">${esc(p)}</span>`;
  }
  return out;
}

const APPROX_KEYWORDS = new Set([
  "chart", "grafica", "graph", "kpi", "metrica",
  "of", "de", "by", "por", "top", "sort", "orden",
  "where", "donde", "as", "como", "asc", "desc",
]);
const APPROX_CHART_TYPES = new Set([
  "line", "bar", "area", "scatter", "pie",
  "linea", "barra", "barras", "dispersion", "pastel", "pay",
]);
const APPROX_AGGS = new Set([
  "sum", "avg", "count", "min", "max",
  "suma", "promedio", "cuenta", "conteo", "minimo", "maximo",
]);

// Colorea una linea. TODA linea se envuelve en el mismo bloque de 22px para que
// el resaltado conserve la misma metrica vertical que el textarea (si no, el
// cursor cae en la linea equivocada al hacer clic).
function highlightLine(line: string, hasError: boolean): string {
  const bg = hasError ? "background:rgba(229,104,122,0.10);" : "";
  const wrap = (inner: string) =>
    `<span style="display:block;${bg}min-height:22px">${inner || "&nbsp;"}</span>`;

  let inner: string;
  try {
    inner = highlightWithLexer(line);
  } catch {
    inner = highlightApprox(line);
  }
  return wrap(inner);
}

interface EditorProps {
  value: string;
  onChange: (v: string) => void;
  errorLine: number | null; // 1-indexed, o null
  columns: ColumnInfo[]; // para autocompletar nombres de columna
}

// Mismos caracteres que forman un identificador en el lexer.
const IDENT_PART = /[a-zA-Z0-9_.À-ſ]/;
// La palabra de identificador que termina justo en el cursor.
const WORD_BEFORE = /[a-zA-Z0-9_.À-ſ]*$/;

// Estado del popup de autocompletado.
interface Autocomplete {
  items: ColumnInfo[]; // columnas sugeridas (ya filtradas y ordenadas)
  index: number; // opcion resaltada
  word: string; // fragmento que se esta reemplazando
  x: number; // posicion (px) relativa al area de texto
  y: number;
}

export function Editor({ value, onChange, errorLine, columns }: EditorProps) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const charWRef = useRef(7.8); // ancho de un caracter monospace (medido al montar)
  const [ac, setAc] = useState<Autocomplete | null>(null);

  const lines = value.split("\n");
  const highlighted = lines.map((l, i) => highlightLine(l, errorLine === i + 1)).join("");

  // Mide el ancho real de un caracter con la metrica del editor (.code-layer).
  useEffect(() => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.font = '13px ui-monospace, "SF Mono", SFMono-Regular, Menlo, monospace';
    charWRef.current = ctx.measureText("M".repeat(40)).width / 40;
  }, []);

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

  // El scroll manual descoloca el popup: sincroniza y cierralo.
  const onScroll = () => {
    syncScroll();
    if (ac) setAc(null);
  };

  // Recalcula las sugerencias segun el fragmento que termina en el cursor.
  const refreshAutocomplete = (text: string, caret: number) => {
    if (columns.length === 0) return setAc(null);
    const before = text.slice(0, caret);
    const word = before.match(WORD_BEFORE)?.[0] ?? "";
    const after = text[caret] ?? "";
    // No sugerir si no hay fragmento, o si el cursor esta a media palabra.
    if (word.length === 0 || IDENT_PART.test(after)) return setAc(null);

    const w = normalize(word);
    const starts = columns.filter((c) => normalize(c.name).startsWith(w));
    const contains = columns.filter(
      (c) => !normalize(c.name).startsWith(w) && normalize(c.name).includes(w)
    );
    const items = [...starts, ...contains].slice(0, 8);
    // Nada util que ofrecer (o ya esta escrita completa y es la unica opcion).
    if (items.length === 0 || (items.length === 1 && normalize(items[0].name) === w)) {
      return setAc(null);
    }

    const lineIdx = before.length - before.replace(/\n/g, "").length; // # de "\n"
    const col = before.length - (before.lastIndexOf("\n") + 1);
    const ta = taRef.current;
    const x = 8 + (col - word.length) * charWRef.current - (ta?.scrollLeft ?? 0);
    const y = 12 + (lineIdx + 1) * 22 - (ta?.scrollTop ?? 0);
    setAc({ items, index: 0, word, x, y });
  };

  // Inserta la columna elegida reemplazando el fragmento actual.
  const accept = (col: ColumnInfo) => {
    const ta = taRef.current;
    if (!ta || !ac) return;
    const caret = ta.selectionStart;
    const start = caret - ac.word.length;
    const next = value.slice(0, start) + col.name + value.slice(caret);
    onChange(next);
    const newCaret = start + col.name.length;
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = newCaret;
    });
    setAc(null);
  };

  const onChangeText = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    refreshAutocomplete(e.target.value, e.target.selectionStart);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Navegacion dentro del popup de autocompletado.
    if (ac) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setAc({ ...ac, index: (ac.index + 1) % ac.items.length });
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setAc({ ...ac, index: (ac.index - 1 + ac.items.length) % ac.items.length });
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        accept(ac.items[ac.index]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setAc(null);
        return;
      }
    }

    // Tab inserta 2 espacios en vez de saltar de foco.
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

  // Al mover el cursor (flechas horizontales, inicio/fin) recalcula el popup.
  const onKeyUp = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
      refreshAutocomplete(value, e.currentTarget.selectionStart);
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
          onChange={onChangeText}
          onScroll={onScroll}
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
          onClick={(e) => refreshAutocomplete(value, e.currentTarget.selectionStart)}
          onBlur={() => setAc(null)}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          className="code-layer absolute inset-0 resize-none overflow-auto border-0 bg-transparent py-3 pl-2 pr-3 outline-none"
          style={{ color: "transparent", caretColor: "#E8A33D", whiteSpace: "pre" }}
        />

        {/* Popup de autocompletado de columnas */}
        {ac && (
          <ul
            className="absolute z-20 max-h-52 overflow-auto rounded-md border border-ink-400 bg-ink-900/95 py-1 shadow-lg backdrop-blur-sm"
            style={{ left: ac.x, top: ac.y, minWidth: 160 }}
          >
            {ac.items.map((c, i) => (
              <li
                key={c.name}
                // preventDefault en mousedown para no perder el foco del textarea
                onMouseDown={(e) => {
                  e.preventDefault();
                  accept(c);
                }}
                onMouseEnter={() => setAc((prev) => (prev ? { ...prev, index: i } : prev))}
                className={`flex cursor-pointer items-center justify-between gap-4 px-3 py-1 font-mono text-xs ${
                  i === ac.index ? "bg-ink-500 text-mist" : "text-muted"
                }`}
              >
                <span>{c.name}</span>
                <span className="text-[10px] uppercase tracking-wider text-muted">{c.type}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
