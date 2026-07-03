// sampleData.ts
// Datos de ejemplo SIMPLES y COMPLETOS: Calificaciones de estudiantes
// Este dataset muestra claramente cómo funciona todo el proyecto.

export const SAMPLE_FILENAME = "calificaciones_estudiantes.csv";

// Datos sencillos: estudiante, materia, calificación, período, carrera
// Fácil de entender y probar todas las funcionalidades
export const SAMPLE_CSV = `estudiante,materia,calificacion,periodo,carrera
Ana,Matemáticas,95,1,Ingeniería
Ana,Física,88,1,Ingeniería
Ana,Química,92,1,Ingeniería
Carlos,Matemáticas,78,1,Ingeniería
Carlos,Física,85,1,Ingeniería
Carlos,Química,80,1,Ingeniería
María,Matemáticas,90,1,Medicina
María,Física,82,1,Medicina
María,Química,96,1,Medicina
Ana,Matemáticas,98,2,Ingeniería
Ana,Física,91,2,Ingeniería
Ana,Química,95,2,Ingeniería
Carlos,Matemáticas,82,2,Ingeniería
Carlos,Física,88,2,Ingeniería
Carlos,Química,85,2,Ingeniería
María,Matemáticas,92,2,Medicina
María,Física,86,2,Medicina
María,Química,98,2,Medicina`;

// Consulta de inicio que MUESTRA TODAS LAS FUNCIONALIDADES:
// - KPIs (indicadores clave)
// - Todos los tipos de gráficas (line, bar, area, scatter, pie)
// - Todas las agregaciones (sum, avg, count, min, max)
// - Modificadores (sort, top, where, as)
// - Español e inglés funcionan igual!
export const STARTER_QUERY = `# 📊 Ejemplo COMPLETO de Trazo
# Cada línea es una gráfica o un KPI. Edítalo y ve los cambios en vivo!
#
# 📌 Tipos de gráficas: line, bar, area, scatter, pie
# 📌 Agregaciones: sum(x), avg(x), count(x), min(x), max(x)
# 📌 Modificadores: sort asc|desc, top N, where, as "Título"
# 📌 Funciona en español e inglés!

# 🎯 KPIs (Indicadores clave)
kpi avg(calificacion) as "Promedio general"
kpi max(calificacion) as "Calificación máxima"
kpi min(calificacion) as "Calificación mínima"
kpi count(estudiante) as "Total de registros"

# 📈 Gráficas básicas
chart line of avg(calificacion) by periodo as "Evolución por período"
chart bar of avg(calificacion) by materia sort desc as "Promedio por materia"
chart pie of count(estudiante) by carrera as "Distribución por carrera"

# 📊 Más gráficas
chart bar of avg(calificacion) by estudiante as "Calificaciones por estudiante"
chart area of avg(calificacion) by materia as "Promedio por materia (área)"
`;
