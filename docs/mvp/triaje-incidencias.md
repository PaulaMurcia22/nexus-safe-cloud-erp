# Triaje de advertencias de importación de red

Origen: dry-run del 2026-10-25 de `Data_para_Proveedor_ERP.xlsx`, SHA-256 `00d4d450bf43de7184fccc2f1a4ad37f0adc37d09af5f670a787b9468abc5c83`. Las advertencias se agrupan por hoja y mensaje, como las reporta el importador.

| Hoja | Mensaje agrupado | Cantidad | Decisión | Tratamiento |
|---|---|---:|---|---|
| `01 Inventario` | Se normalizaron guiones finales o espacios del serial | 10 | Corregida | Se conserva el valor fuente y se usa el serial canónico para reconciliar. |
| `05 VLAN DHCP` | Valor con aspecto de modelo de equipo; no se importa como pool DHCP | 361 | Aceptada | Valores como `2960-24TT` no son nombres `VLANnn_...`; se excluyen de pools/VLAN. |
| `01 Inventario` | Activo CCTV/IoT sin tipo de catálogo inequívoco | 7 | Pendiente | No se fuerza un tipo; revisión manual con evidencia de ficha/modelo. |
| `01 Inventario` | Activos sin membresía VLAN por IP ni coincidencia nominal conservadora | 1 grupo (21 activos) | Pendiente | No inventar el vínculo; validar contra fuente del cliente. |
| `04 Interfaces Config` | Encabezado de equipo truncado; la columna 1 se interpreta por posición | 1 | Aceptada | La fila fuente confirma equipos en la columna 1; se registra y continúa por posición. |

El dry-run actualizado reporta 380 WARNING: 372 advertencias de base más 8 agrupadas por la nueva revisión de VLAN y catálogo (7 activos sin mapeo y un grupo de 21 activos sin membresía VLAN). No hubo errores. Las filas de la hoja 05 que son modelos se mantienen como evidencia de origen, pero no se promueven a entidades de red.
