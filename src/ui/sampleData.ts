// sampleData.ts
// Un dataset de ejemplo integrado para que la app arranque mostrando algo vivo,
// sin que tengas que cargar un archivo primero. Tema: ventas de una distribuidora
// (guino a tus clientes tipo Grupollo). Cambialo por lo que quieras.

export const SAMPLE_FILENAME = "ventas_demo.csv";

export const SAMPLE_CSV = `mes,region,producto,canal,ingreso,unidades
ene,Norte,Pollo entero,Mayoreo,124000,3100
ene,Sur,Pollo entero,Mayoreo,98000,2450
ene,Centro,Huevo,Menudeo,54000,9000
feb,Norte,Pollo entero,Mayoreo,151000,3600
feb,Sur,Huevo,Menudeo,95000,15800
feb,Centro,Pechuga,Mayoreo,132000,2200
mar,Norte,Huevo,Menudeo,70000,11600
mar,Sur,Pollo entero,Mayoreo,181000,4200
mar,Centro,Pechuga,Mayoreo,143000,2380
abr,Norte,Pollo entero,Mayoreo,166000,3950
abr,Sur,Huevo,Menudeo,112000,18600
abr,Centro,Pechuga,Menudeo,88000,1460
may,Norte,Pechuga,Mayoreo,159000,2650
may,Sur,Pollo entero,Mayoreo,174000,4150
may,Centro,Huevo,Menudeo,61000,10100
jun,Norte,Pollo entero,Mayoreo,192000,4560
jun,Sur,Pechuga,Mayoreo,148000,2470
jun,Centro,Huevo,Menudeo,73000,12100`;

export const STARTER_QUERY = `# Escribe consultas, cada linea es una grafica.
# Prueba a cambiar cosas: la vista se actualiza sola.

kpi sum(ingreso) as "Ingreso total"
kpi avg(ingreso) as "Ticket promedio"

chart line of sum(ingreso) by mes as "Ingreso por mes"
chart bar of sum(ingreso) by region sort desc as "Ingreso por region"
chart pie of sum(ingreso) by producto as "Mezcla de producto"
chart bar of sum(unidades) by producto top 3 as "Top productos por volumen"`;
