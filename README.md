# Trazo

**Escribe una consulta, dibuja un dashboard.** Un compilador de un mini-lenguaje a gráficas interactivas, que corre 100% en el navegador. Sin servidor, sin cuenta, sin subir tus datos a ningún lado.

```
chart line of sum(ingreso) by mes
chart bar  of sum(ingreso) by region sort desc
kpi sum(ingreso) as "Ingreso total"
```

Eso, escrito en el editor, se convierte en vivo en un dashboard real. Cargas un CSV o JSON, escribes qué quieres ver, y el motor lo *compila* a gráficas renderizadas en canvas.

---

## Por qué este proyecto

Junta dos cosas que casi nadie mezcla:

1. **Un compilador de verdad** (lexer → parser → análisis semántico → codegen) para un lenguaje que tú diseñaste.
2. **Un motor de render** propio, que hoy es Canvas 2D y mañana puede ser WebGPU.

El motor no depende de React ni del navegador: es TypeScript puro. Eso no es un capricho — es la decisión de arquitectura que te deja, el día que quieras, empaquetar el motor por separado (una CLI, un servicio de batch, un plugin) sin reescribir nada. Ese desacople es la puerta a monetizar.

---

## Paso a paso para arrancar

Necesitas **Node.js 18+**. En tu MacBook M1, si no lo tienes:

```bash
# opcion recomendada: instalar node con Homebrew
brew install node
```

Luego, dentro de la carpeta del proyecto:

```bash
# 1. instala las dependencias
npm install

# 2. corre el servidor de desarrollo
npm run dev
```

Abre la URL que te imprime (normalmente `http://localhost:5173`). Vas a ver la app ya funcionando con datos de ejemplo. Edita el texto del editor y observa cómo el dashboard se actualiza solo.

Otros comandos:

```bash
npm run test:engine   # corre las pruebas del compilador (26 casos)
npm run build         # build de produccion en dist/
npm run preview       # sirve el build de produccion localmente
```

### Primeros experimentos sugeridos (para entender el código)

1. Abre `src/ui/sampleData.ts` y cambia el CSV de ejemplo por datos tuyos.
2. En el editor, escribe `chart pie of count(producto) by region` y ve qué pasa.
3. Rompe algo a propósito (`chart bar of sum(columna_que_no_existe) by mes`) y observa el mensaje de error y la barra de pipeline detenerse en "semántica".
4. Abre `src/engine/lexer/tokens.ts` y agrega un alias de palabra clave (ej. `mostrar: TokenType.CHART`). Guarda y prueba `mostrar bar of ...`. Acabas de extender el lenguaje.

---

## Cómo funciona el lenguaje

Cada línea es un *statement*. Hay dos tipos: `chart` y `kpi`.

```
chart <tipo> of <medida> by <dimensión> [modificadores...]
kpi <medida> [modificadores...]
```

- **tipos de gráfica**: `line`, `bar`, `area`, `scatter`, `pie`
- **medida**: una columna numérica con agregación — `sum(x)`, `avg(x)`, `count(x)`, `min(x)`, `max(x)`. Si escribes solo `x`, asume `sum(x)`.
- **dimensión**: la columna del eje X / agrupación.
- **modificadores**: `top N`, `sort asc|desc`, `where col == valor`, `as "Título"`.

Soporta **español e inglés** y **acentos**: `grafica barras de suma(ingreso) por region` funciona igual que la versión en inglés. Ver `LENGUAJE.md` para la referencia completa.

Comentarios: líneas que empiezan con `#` o `//`.

---

## Arquitectura

```
src/
├── engine/                 EL MOTOR — TypeScript puro, sin React ni DOM
│   ├── lexer/              texto  -> tokens
│   │   ├── tokens.ts       vocabulario del lenguaje (palabras clave, alias)
│   │   └── lexer.ts        el tokenizador
│   ├── parser/             tokens -> AST
│   │   ├── ast.ts          definición del árbol de sintaxis
│   │   └── parser.ts       parser recursive-descent
│   ├── analyzer/           AST -> AST validado (contra los datos)
│   │   └── analyzer.ts     "type checking": columnas existen, tipos correctos
│   ├── data/               carga y transformación de datos
│   │   ├── dataframe.ts    tabla en memoria: group-by, agregaciones, filtros
│   │   ├── csv.ts          parser de CSV (máquina de estados)
│   │   └── json.ts         loader de JSON
│   ├── codegen/            AST + datos -> ChartSpec
│   │   ├── chartspec.ts    la representación intermedia agnóstica del render
│   │   └── codegen.ts      ejecuta las operaciones y produce specs
│   ├── compile.ts          orquesta todas las etapas
│   └── index.ts            la API pública del motor
│
├── renderer/               ChartSpec -> pixeles (hoy Canvas 2D)
│   ├── theme.ts            colores y paleta
│   └── canvasRenderer.ts   dibujo de las 5 gráficas + hit-testing
│
└── ui/                     la app React (consume el motor)
    ├── App.tsx             estado + compilación reactiva + layout
    ├── sampleData.ts       datos de ejemplo integrados
    └── components/         Editor, DataPanel, PipelineBar, ChartCard, KpiCard
```

La frontera importante:

```
texto  →  [engine]  →  ChartSpec  →  [renderer]  →  pixeles
```

El `engine` produce `ChartSpec`s (qué dibujar) sin saber cómo. El `renderer` dibuja `ChartSpec`s sin saber de dónde vienen. Puedes cambiar cualquiera de los dos lados sin tocar el otro.

---

## Roadmap sugerido (crece por meses)

Cada punto es una feature enviable por sí sola. No las hagas todas: elige lo que te divierta.

**Mes 1 — Solidez del núcleo**
- Resaltado de sintaxis alimentado por el lexer real (hoy es aproximado).
- Autocompletado de nombres de columna en el editor.
- Más tipos: `chart donut`, gráficas horizontales, series múltiples (`by a, b`).
- Persistir la última consulta y datos en el navegador (IndexedDB).

**Mes 2 — Poder de datos**
- Soporte de Excel (`.xlsx`) leyéndolo en el navegador.
- Fechas de verdad: agrupar por día/semana/mes automáticamente (`by date group month`).
- Columnas calculadas en el lenguaje (`chart bar of sum(precio * cantidad) by mes`).
- Filtros combinados con `and` / `or`.

**Mes 3 — GPU**
- Reescribir `canvasRenderer.ts` con WebGPU para datasets grandes (100k+ puntos).
- Mantener el Canvas 2D como *fallback* si el navegador no soporta WebGPU.
- Como el resto del código solo produce `ChartSpec`, este cambio queda contenido en un solo archivo.

**Mes 4+ — Producto**
- Exportar el dashboard como HTML autónomo (un archivo que embebe datos + render).
- Temas visuales seleccionables.
- Capa "Pro" (la parte que monetiza): pipelines guardados, batch sobre muchos archivos, versión de escritorio con Tauri que accede a carpetas completas.

---

## Camino a WebGPU (el detalle técnico)

Hoy `ChartRenderer` (en `src/renderer/canvasRenderer.ts`) implementa un método `draw(spec)` con Canvas 2D. Para migrar a GPU:

1. Crea `src/renderer/webgpuRenderer.ts` con la misma interfaz pública (`resize`, `draw`, `hitTest`).
2. En `ChartCard.tsx`, elige el renderer según `navigator.gpu` disponible.
3. El resto del proyecto no cambia, porque solo habla el lenguaje de `ChartSpec`.

Ese es el pago de haber separado el motor del render desde el día uno.

---

