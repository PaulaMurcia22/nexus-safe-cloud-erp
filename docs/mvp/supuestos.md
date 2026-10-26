# Supuestos del MVP

| ID | Supuesto / decisión conservadora | Tratamiento y validación pendiente |
|---|---|---|
| S-01 | Para el ejercicio académico, el centro de salud del inventario es un cliente gestionado de Nexus Safe-Cloud (ADR-0001). | No procede del Excel. Crear el cliente sintético y asignar activos de forma explícita y auditable. Validar con el docente antes de presentar como contexto de negocio. |
| S-02 | La ciudad del sitio del cliente no se conoce. | Usar `Sin confirmar`; no inferir Medellín o Bogotá. Confirmar con el docente o dejar ese valor. |
| S-03 | Las oficinas `MEDELLIN`, `BOGOTA`, `REMOTE_SHARED` son ubicaciones internas de Nexus, no sedes del centro de salud. | Conservarlas como `INTERNAL_OFFICE`; una ubicación del cliente será `CLIENT_SITE`. |
| S-04 | Los registros demo que no aparecen en los dos Excel válidos son sintéticos. | Guardar `data_origin='SYNTHETIC'`, no usar identificadores ni datos personales reales, y mostrar insignia. |
| S-05 | La segunda organización solo permite probar aislamiento/filtrado. | Usar nombres y NIT claramente ficticios, sin reclamar que sea cliente real. |
| S-06 | Las VLAN de biométrico y signos vitales son sensibles por su nombre y propósito. | Guardar metadatos de disponibilidad/configuración; no recopilar datos biométricos, clínicos, payloads ni capturas. Validar clasificación con responsable de seguridad. |
| S-07 | Un booleano de origen vacío significa desconocido. | Importar `NULL`; no contabilizar como fallo ni generar hallazgo. |
| S-08 | HSRP aplica solo a routers y núcleo L3; NetFlow solo a routers y núcleo L3; Syslog/SNMP/NTP/SSH/AAA a equipos administrables. | Aplicar reglas de un módulo puro, contar `NOT_APPLICABLE` separado y validar clasificación de roles contra la hoja 02. |
| S-09 | Los 147 registros bajo encabezado de Interfaces Config son las filas de datos válidas. | Actualizar reconciliación esperada a 147; no inventar una fila para alcanzar 148. |
| S-10 | Servicios electrónicos se simulan en el MVP. | Estado `SIMULATED_ACCEPTED` significa simulación técnica, no aceptación DIAN ni factura electrónica legal. |
| S-11 | La distribución de los tres hitos y ejemplos de órdenes, horas y facturas se crea determinísticamente para demo. | Todas las filas creadas por seed deben ser `SYNTHETIC`; el periodo de horas queda fijado al rango solicitado alrededor de 2026-10-25. |
| S-12 | La tabla de catálogo complementa, pero no sustituye, los ocho registros de tecnologías de la hoja 07. | Mantener ambas fuentes diferenciadas: catálogo de señales importado desde el segundo archivo y tecnologías fuente del primer archivo. |
| S-13 | Se crean dos usuarios `TECHNICIAN` porque la demo requiere probar asignación de trabajo entre dos técnicos, aunque la lista de roles pide un usuario por rol. | Ambos son sintéticos, usan correos `demo.invalid` y comparten la contraseña local `DEMO_USERS_PASSWORD`, sin que el script revele su valor. |

