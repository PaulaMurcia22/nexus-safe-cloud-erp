# Línea base del MVP

Fecha de ejecución: 2026-10-25 (America/Bogota)

Se reprodujeron los comandos indicados en el prompt de cierre. El árbol estaba limpio antes de esta captura; el último commit era `5092e30 feat: implement pagination for projects and users, enhance API with network functionalities`.

## Comandos y resultados

| Comando | Resultado |
|---|---|
| `npm run build --prefix backend` | Pasa (`tsc`, código 0). |
| `npm test --prefix backend` | 14 pasan, 0 fallan. Para `tsx` fue necesario permitir ejecución fuera del sandbox porque no puede abrir su socket IPC dentro del sandbox (`EPERM`). |
| `npm run build --prefix frontend` | Pasa (`tsc -b` y Vite 6.4.4; bundle JS 228.52 kB, CSS 13.55 kB). |
| `npm run import:network --prefix backend -- --file ../data/Data_para_Proveedor_ERP.xlsx --dry-run` | Pasa; SHA-256 `00d4d450bf43de7184fccc2f1a4ad37f0adc37d09af5f670a787b9468abc5c83`. Requirió permiso fuera del sandbox por el socket IPC de `tsx`. |

## Reconciliación del dry-run

| Métrica | Observado |
|---|---:|
| Filas leídas en el libro | 1.038 |
| Activos | 76 |
| Enlaces | 74 |
| Enlaces con criticidad CRITICAL | 11 |
| Enlaces no funcionales según la implementación actual | 5 |
| Interfaces (filas de datos) | 147 |
| Pools reconocidos | 17 |
| Tecnologías de monitoreo (hoja 07) | 8 |
| Equipos de infraestructura/controles (hoja 02) | 10 |
| Seriales únicos | 76 |
| Incidencias | 498: 126 INFO, 372 WARNING, 0 ERROR |

Criticidad de activos: CRITICAL 5, HIGH 5, MEDIUM 66. Controles configurados según hoja 02: SSH 1, NETFLOW 4, HSRP 2, SYSLOG/SNMP/NTP/AAA 0. El resultado anterior es de análisis en seco: no se conectó a PostgreSQL, no insertó filas y no verificó una segunda importación.

## Higiene observada

`git ls-files` no encontró `.env`, `node_modules`, `dist` ni `.DS_Store` versionados. En el directorio de trabajo sí existen `frontend/tsconfig.tsbuildinfo` y archivos temporales Excel `~$...`; la captura inicial no los alteró. La dependencia local `nexus-erp: file:..` existe en los dos `package.json`; se analizará en la Fase 0 antes de decidir si se conserva.

## Restricciones presentes en PostgreSQL

Se ejecutó una consulta de solo lectura a `information_schema.table_constraints`/`pg_constraint` en `nexuserpm`. La base local tiene `users_role_check`, `projects_service_type_check`, `uq_projects_code`, `uq_clients_nit_normalized` y las restricciones restantes autogeneradas por PostgreSQL. Aún no tiene las tablas `sites` ni `network_assets`, por lo que no fue posible consultar las restricciones de `sites` allí. El script 05 descubre dinámicamente por definición cualquier check de códigos fijos y unique simple de `code`; no presupone el nombre autogenerado. La segunda consulta falló al intentar convertir `sites` a regclass porque la relación no existe. No se aplicaron cambios a esa base.

