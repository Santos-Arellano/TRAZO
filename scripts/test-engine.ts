// test-engine.ts
// Prueba de humo del motor completo, sin UI. Corre con: npm run test:engine
// Valida el pipeline entero: cargar datos -> compilar -> specs correctos + errores.

import { loadData, compile } from "../src/engine/index";

const SAMPLE_CSV = `mes,region,producto,ingreso,unidades
ene,norte,pollo,12000,300
ene,sur,pollo,8000,210
feb,norte,pollo,15000,360
feb,sur,huevo,9500,500
mar,norte,huevo,7000,400
mar,sur,pollo,18000,420
abr,norte,pollo,16000,380
abr,sur,huevo,11000,600`;

let passed = 0;
let failed = 0;

function assert(cond: boolean, name: string, detail = "") {
  if (cond) {
    passed++;
    console.log(`  ok  ${name}`);
  } else {
    failed++;
    console.log(`FAIL  ${name}  ${detail}`);
  }
}

const df = loadData("data.csv", SAMPLE_CSV);

// --- Carga de datos ---
console.log("\n[datos]");
assert(df.rows.length === 8, "8 filas cargadas", `got ${df.rows.length}`);
assert(df.hasColumn("ingreso"), "columna ingreso existe");
assert(df.getColumn("ingreso")?.type === "number", "ingreso es numerica");
assert(df.getColumn("region")?.type === "string", "region es texto");

// --- Compilacion basica ---
console.log("\n[compilacion basica]");
let r = compile(`chart bar of sum(ingreso) by region`, df);
assert(r.ok, "compila chart bar", JSON.stringify(r.diagnostics));
assert(r.specs.length === 1, "genera 1 spec");
assert(r.specs[0].kind === "chart", "spec es chart");
if (r.specs[0].kind === "chart") {
  const norte = r.specs[0].data.find((d) => d.label === "norte");
  assert(norte?.value === 12000 + 15000 + 7000 + 16000, "suma ingreso norte correcta", `got ${norte?.value}`);
}

// --- Etapas intermedias visibles ---
console.log("\n[pipeline]");
assert((r.tokens?.length ?? 0) > 0, "expone tokens");
assert(r.ast?.statements.length === 1, "expone AST");
assert(r.stagesCompleted === 4, "completa las 4 etapas");

// --- Espanol + acentos + alias ---
console.log("\n[espanol / alias]");
r = compile(`grafica barras de suma(ingreso) por region`, df);
assert(r.ok, "keywords en espanol funcionan", JSON.stringify(r.diagnostics));

// --- top N ---
console.log("\n[modificadores]");
r = compile(`chart bar of sum(ingreso) by producto top 1`, df);
assert(r.ok && r.specs[0].kind === "chart" && r.specs[0].data.length === 1, "top 1 recorta a 1 barra");

// --- where ---
r = compile(`chart bar of sum(ingreso) by region where producto == pollo`, df);
if (r.specs[0]?.kind === "chart") {
  const total = r.specs[0].data.reduce((a, b) => a + b.value, 0);
  assert(total === 12000 + 8000 + 15000 + 18000 + 16000, "where filtra pollo", `got ${total}`);
}

// --- sort ---
r = compile(`chart bar of sum(ingreso) by producto sort desc`, df);
if (r.specs[0]?.kind === "chart") {
  const vals = r.specs[0].data.map((d) => d.value);
  const sorted = [...vals].sort((a, b) => b - a);
  assert(JSON.stringify(vals) === JSON.stringify(sorted), "sort desc ordena");
}

// --- count ---
r = compile(`chart bar of count(producto) by region`, df);
assert(r.ok, "count sobre columna de texto es valido");

// --- kpi ---
console.log("\n[kpi]");
r = compile(`kpi sum(ingreso)`, df);
assert(r.ok && r.specs[0].kind === "kpi", "kpi compila");
if (r.specs[0]?.kind === "kpi") {
  const expected = 12000 + 8000 + 15000 + 9500 + 7000 + 18000 + 16000 + 11000;
  assert(r.specs[0].value === expected, "kpi suma total correcta", `got ${r.specs[0].value}`);
}

// --- multiples statements + orden natural de meses ---
console.log("\n[multiple + orden meses]");
r = compile(`kpi sum(ingreso)\nchart line of sum(ingreso) by mes`, df);
assert(r.specs.length === 2, "dos statements -> dos specs");
if (r.specs[1]?.kind === "chart") {
  const labels = r.specs[1].data.map((d) => d.label);
  assert(JSON.stringify(labels) === JSON.stringify(["ene", "feb", "mar", "abr"]), "meses en orden calendario", labels.join(","));
}

// --- comentarios ---
r = compile(`# esto es un comentario\nkpi count(mes) # otro comentario`, df);
assert(r.ok, "comentarios se ignoran");

// --- ERRORES: deben fallar con mensaje util ---
console.log("\n[errores esperados]");
r = compile(`chart bar of sum(ventas) by region`, df);
assert(!r.ok && r.diagnostics[0].stage === "semantic", "columna inexistente -> error semantico");
assert(/Columnas disponibles|Quisiste decir/.test(r.diagnostics[0]?.message ?? ""), "error sugiere columnas");

r = compile(`chart bar of sum(region) by mes`, df);
assert(!r.ok && r.diagnostics[0].stage === "semantic", "sum sobre texto -> error");

r = compile(`chart of sum(ingreso) by region`, df);
assert(!r.ok && r.diagnostics[0].stage === "parse", "falta tipo de grafica -> error de parseo");

r = compile(`dibuja algo bonito`, df);
assert(!r.ok && r.diagnostics[0].stage === "parse", "basura -> error de parseo");

// --- resumen ---
console.log(`\n=== ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);
