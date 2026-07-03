# Referencia del lenguaje Trazo

Un programa Trazo es una lista de líneas. Cada línea no vacía es un *statement*.
Líneas que empiezan con `#` o `//` son comentarios.

## Gramática (EBNF informal)

```
program    := statement (NEWLINE statement)*
statement  := chartStmt | kpiStmt

chartStmt  := ("chart" | "grafica" | "graph") chartType
              ("of" | "de") measure
              ("by" | "por") IDENT
              modifier*

kpiStmt    := ("kpi" | "metrica") measure modifier*

chartType  := "line" | "bar" | "area" | "scatter" | "pie"
              (alias es: "linea" "barra" "barras" "dispersion" "pastel" "pay")

measure    := agg "(" IDENT ")"      // sum(ingreso)
            | agg IDENT              // sum ingreso
            | IDENT                  // ingreso  (agg por defecto = sum)

agg        := "sum" | "avg" | "count" | "min" | "max"
              (alias es: "suma" "promedio" "cuenta"/"conteo" "minimo" "maximo")

modifier   := "top" NUMBER
            | ("sort" | "orden") ("asc" | "desc")
            | ("where" | "donde") IDENT OP value
            | ("as" | "como") STRING

value      := NUMBER | STRING | IDENT
OP         := ">" | "<" | ">=" | "<=" | "==" | "!="   ("=" se acepta como "==")
```

## Tipos de gráfica

| Tipo      | Úsalo para                                  |
|-----------|---------------------------------------------|
| `line`    | tendencias en el tiempo                     |
| `area`    | tendencias con énfasis en volumen           |
| `bar`     | comparar categorías                         |
| `scatter` | distribución de puntos                      |
| `pie`     | proporción / mezcla                         |

## Agregaciones

| Función  | Qué hace                          | Requiere columna numérica |
|----------|-----------------------------------|:-------------------------:|
| `sum`    | suma                              | sí                        |
| `avg`    | promedio                          | sí                        |
| `count`  | cuenta filas                      | no (sirve para cualquiera)|
| `min`    | mínimo                            | sí                        |
| `max`    | máximo                            | sí                        |

## Modificadores

- `top N` — quédate con las N categorías de mayor valor.
- `sort asc|desc` — ordena por valor.
- `where col OP valor` — filtra filas antes de agregar. Puedes encadenar varios.
- `as "Título"` — título personalizado.

## Ejemplos

```
# KPIs
kpi sum(ingreso) as "Ingreso total"
kpi avg(ingreso) as "Ticket promedio"
kpi count(mes) as "Registros"

# Series de tiempo
chart line of sum(ingreso) by mes
chart area of avg(unidades) by mes as "Unidades promedio"

# Comparaciones
chart bar of sum(ingreso) by region sort desc
chart bar of sum(unidades) by producto top 5

# Con filtros
chart bar of sum(ingreso) by region where producto == "Pollo entero"
chart line of sum(ingreso) by mes where ingreso > 100000

# Proporción
chart pie of sum(ingreso) by producto

# En español, con acentos
grafica barras de suma(ingreso) por región orden desc
metrica promedio(ingreso) como "Ticket promedio"
```

## Errores comunes

| Mensaje                              | Causa                                             |
|--------------------------------------|---------------------------------------------------|
| `La columna "x" no existe`           | typo en nombre de columna (sugiere el más cercano)|
| `La medida "x" no es numérica`       | usaste `sum`/`avg` sobre texto — usa `count`      |
| `Esperaba un tipo de gráfica`        | falta `line`/`bar`/etc. después de `chart`        |
| `Cada línea debe empezar con...`     | la línea no arranca con `chart` ni `kpi`          |
```
