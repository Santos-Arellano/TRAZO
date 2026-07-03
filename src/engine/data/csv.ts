// csv.ts
// Parser de CSV hecho a mano (sin librerias). Es una maquina de estados: exactamente
// el tipo de cosa que sabes hacer de compiladores. Maneja los casos molestos:
// comillas, comas dentro de comillas, comillas escapadas ("") y saltos de linea.

import { DataFrame } from "./dataframe";
import { TrazoError } from "../errors";

export function parseCSV(text: string): DataFrame {
  const rows = parseRows(text);
  if (rows.length === 0) throw new TrazoError("El CSV esta vacio", 0, 0, "data");

  const header = rows[0];
  const records: Record<string, unknown>[] = [];

  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    // Ignora lineas totalmente vacias
    if (cells.length === 1 && cells[0].trim() === "") continue;
    const rec: Record<string, unknown> = {};
    for (let c = 0; c < header.length; c++) {
      rec[header[c].trim()] = cells[c] ?? "";
    }
    records.push(rec);
  }

  return DataFrame.fromRecords(records);
}

// Detecta el delimitador mas probable mirando la primera linea.
function detectDelimiter(firstLine: string): string {
  const candidates = [",", ";", "\t", "|"];
  let best = ",";
  let bestCount = -1;
  for (const d of candidates) {
    const count = firstLine.split(d).length;
    if (count > bestCount) {
      bestCount = count;
      best = d;
    }
  }
  return best;
}

function parseRows(text: string): string[][] {
  // Normaliza saltos de linea de Windows/Mac
  const src = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const firstLineEnd = src.indexOf("\n");
  const firstLine = firstLineEnd === -1 ? src : src.slice(0, firstLineEnd);
  const delim = detectDelimiter(firstLine);

  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  let i = 0;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  while (i < src.length) {
    const ch = src[i];

    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"'; // comilla escapada
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === delim) {
      pushField();
      i++;
      continue;
    }
    if (ch === "\n") {
      pushRow();
      i++;
      continue;
    }
    field += ch;
    i++;
  }

  // Ultimo campo/fila si el archivo no termina en newline
  if (field.length > 0 || row.length > 0) pushRow();

  return rows;
}
