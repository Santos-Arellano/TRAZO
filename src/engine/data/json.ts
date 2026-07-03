// json.ts
// Carga datos desde JSON. Acepta un array de objetos directamente, o un objeto
// que contenga un array adentro (busca la primera propiedad que sea un array).
// Aplana objetos anidados un nivel usando notacion punto: { a: { b: 1 } } -> "a.b".

import { DataFrame } from "./dataframe";
import { TrazoError } from "../errors";

export function parseJSON(text: string): DataFrame {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new TrazoError(`JSON invalido: ${(e as Error).message}`, 0, 0, "data");
  }

  const array = extractArray(data);
  if (!array) {
    throw new TrazoError("No encontre un array de objetos en el JSON", 0, 0, "data");
  }

  const records = array.map((item) => flatten(item));
  return DataFrame.fromRecords(records);
}

function extractArray(data: unknown): unknown[] | null {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    for (const value of Object.values(data as Record<string, unknown>)) {
      if (Array.isArray(value)) return value;
    }
  }
  return null;
}

// Aplana un nivel de anidamiento. Suficiente para la mayoria de datos reales.
function flatten(item: unknown): Record<string, unknown> {
  if (item === null || typeof item !== "object" || Array.isArray(item)) {
    return { value: item };
  }
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(item as Record<string, unknown>)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      for (const [k2, v2] of Object.entries(value as Record<string, unknown>)) {
        out[`${key}.${k2}`] = v2;
      }
    } else if (Array.isArray(value)) {
      out[key] = value.join(", ");
    } else {
      out[key] = value;
    }
  }
  return out;
}
