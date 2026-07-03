// DataPanel.tsx
// Muestra el dataset activo: nombre, numero de filas y las columnas con su tipo.
// Tambien es la zona para arrastrar/soltar un CSV o JSON. Todo local: el archivo
// se lee con FileReader y nunca sale del navegador.

import { useRef, useState } from "react";
import { DataFrame } from "../../engine/data/dataframe";
import { loadData } from "../../engine/index";

interface DataPanelProps {
  df: DataFrame;
  filename: string;
  onLoad: (df: DataFrame, filename: string) => void;
  onError: (msg: string) => void;
}

const TYPE_COLOR: Record<string, string> = {
  number: "#5CC8B8",
  string: "#8B9FE8",
  date: "#E8A33D",
};

export function DataPanel({ df, filename, onLoad, onError }: DataPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result ?? "");
        const next = loadData(file.name, text);
        if (next.rows.length === 0) {
          onError("El archivo no tiene filas de datos.");
          return;
        }
        onLoad(next, file.name);
      } catch (e) {
        onError((e as Error).message);
      }
    };
    reader.onerror = () => onError("No se pudo leer el archivo.");
    reader.readAsText(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) readFile(file);
  };

  return (
    <div
      className={`flex h-full flex-col rounded-lg border bg-ink-800 transition-colors ${
        dragging ? "border-signal" : "border-ink-500"
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <div className="flex items-center justify-between border-b border-ink-500 px-3 py-2">
        <div className="min-w-0">
          <div className="truncate font-mono text-xs text-mist">{filename}</div>
          <div className="text-[10px] text-muted">{df.rows.length} filas · {df.columns.length} columnas</div>
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          className="shrink-0 rounded-md border border-ink-400 px-2 py-1 text-[11px] text-mist transition-colors hover:border-signal hover:text-signal"
        >
          Cargar archivo
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.tsv,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) readFile(f);
            e.target.value = "";
          }}
        />
      </div>

      <div className="flex-1 overflow-auto p-2">
        <div className="mb-1 px-1 text-[10px] uppercase tracking-wider text-muted">Columnas</div>
        <ul className="space-y-0.5">
          {df.columns.map((c) => (
            <li
              key={c.name}
              className="flex items-center justify-between rounded px-2 py-1 text-xs hover:bg-ink-700"
            >
              <span className="truncate font-mono text-mist">{c.name}</span>
              <span
                className="ml-2 shrink-0 font-mono text-[10px]"
                style={{ color: TYPE_COLOR[c.type] ?? "#7C8B90" }}
              >
                {c.type}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {dragging && (
        <div className="pointer-events-none border-t border-signal px-3 py-2 text-center text-xs text-signal">
          Suelta para cargar
        </div>
      )}
    </div>
  );
}
