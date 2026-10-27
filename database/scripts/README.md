# Scripts de base de datos

Estos scripts crean la base local de PostgreSQL para Nexus Safe-Cloud ERP. Se ejecutan desde PowerShell o pgAdmin y deben conservarse versionados en Git.

## Orden de ejecucion

| Orden | Archivo | Proposito |
|---|---|---|
| 1 | `00_create_database.sql` | Crea `nexuserpm` sin eliminar una base existente. |
| 2 | `01_Create_tb_users.sql` | Crea usuarios, roles, estados e indice de correo. |
| 3 | `02_Create_tb_clients.sql` | Crea clientes B2B y unicidad del NIT normalizado. |
| 4 | `03_Create_tb_projects.sql` | Crea proyectos y sus relaciones con clientes y usuarios. |
| 5 | `04_Create_network_domain.sql` | Crea activos (incluye origen del dato), interfaces, enlaces, DHCP/VLAN, controles, monitoreo y trazabilidad de importación. |
| 6 | `05_Alter_sites_customer_scope.sql` | Amplía `sites` para oficinas internas y sitios de clientes; incorpora origen. |
| 7 | `06_Create_vlans.sql` | VLAN explícitas y membresía activo-VLAN. |
| 8 | `07_Create_monitoring_catalog_and_contracts.sql` | Catálogo de señales, mapeo de activos, contratos y alcance. |
| 9 | `08_Create_findings_and_work.sql` | Hallazgos, órdenes, horas y hitos. |
| 10 | `09_Create_billing.sql` | Facturas y vista de antigüedad de cartera. |
| 11 | `10_Alter_roles_and_origin.sql` | Roles PMO/técnico y origen de clientes/proyectos. |
| 12 | `11_Create_auth_events_and_sessions.sql` | Eventos de login y sesiones persistibles (activación de sesiones en Fase 6). |
| 13 | `12_Alter_network_assets_data_origin.sql` | Compatibilidad para bases existentes; es no-op en instalaciones nuevas que ejecutaron 04 actualizado. |
| 13 | `13_Create_iot_capture_analytics.sql` | Crea almacenamiento de métricas y metadatos de capturas IoT, excluyendo payload bruto ASCII/hex. |
| 14 | `14_Create_crm_opportunities.sql` | Registra oportunidades comerciales con MRR esperado y pipeline ponderado. |
| 15 | `15_Create_saas_subscriptions.sql` | Catálogo de planes SaaS y suscripciones con periodo, asientos y MRR. |
| 16 | `16_Create_procurement_expenses.sql` | Proveedores, órdenes de compra y gastos operativos. |
| 17 | `17_Create_accounting.sql` | Plan contable gerencial, asientos balanceados y reportes financieros. |
| 18 | `18_Create_hr_employees.sql` | Directorio laboral interno y estructura organizacional. |
| Demo | `90_Insert_DatosPrueba.sql` | Clientes, sede, proyecto, contrato e hitos sintéticos deterministas; invocado también por `seed:demo`. |

El administrador inicial no se inserta con SQL. Se crea mediante el script TypeScript del backend para generar el hash seguro:

```powershell
npm.cmd run seed:admin --prefix backend
```

Antes de ejecutarlo, define `ADMIN_EMAIL` y `ADMIN_PASSWORD` (mínimo 12 caracteres), y opcionalmente `ADMIN_NAME`, en el entorno local. No hay credenciales predeterminadas.

Consulta [README_seed_admin.md](README_seed_admin.md) para los detalles.

Para crear el conjunto sintético completo, importa antes los dos Excel válidos y define `DEMO_USERS_PASSWORD` localmente (mínimo 12 caracteres). Ejecuta `npm run seed:demo --prefix backend -- --dry-run` para previsualizar y luego `npm run seed:demo --prefix backend`. El reinicio requiere `npm run seed:demo --prefix backend -- --reset-synthetic --confirm`; solo elimina filas `SYNTHETIC` y limpia con auditoría la asignación demo de activos importados.

Para agregar los módulos SaaS, aplica los scripts 14 a 18 después del script 13. Para métricas IoT, aplica antes `13_Create_iot_capture_analytics.sql` después de `12_Alter_network_assets_data_origin.sql`. La captura se carga por CLI:

```powershell
npm.cmd run import:iot-capture --prefix backend -- --file ..\data\captura_tcp-2_Grupo_Eventos_Temporales.xlsx
```

La ingesta es idempotente por SHA-256 del archivo. Guarda tiempos, extremos IP/puerto, tamaños, flags y clasificación del payload; nunca guarda ni devuelve los campos ASCII/hex.

## Prerrequisitos

- PostgreSQL local instalado y ejecutándose.
- Usuario con permisos para crear bases y tablas.
- `psql` disponible en el `PATH` o ejecución equivalente desde pgAdmin.
- `backend/.env` configurado para `nexuserpm` antes de ejecutar el seed.

## Ejecucion con PowerShell

El primer script debe ejecutarse conectado a una base administrativa. Usa `psql` porque el archivo emplea `\\gexec` para crear la base condicionalmente sin fijar un OWNER local; desde pgAdmin, crea la base manualmente solo si no existe:

```powershell
psql -U postgres -d postgres -f .\database\scripts\00_create_database.sql
psql -U postgres -d nexuserpm -f .\database\scripts\01_Create_tb_users.sql
psql -U postgres -d nexuserpm -f .\database\scripts\02_Create_tb_clients.sql
psql -U postgres -d nexuserpm -f .\database\scripts\03_Create_tb_projects.sql
npm.cmd run import:network --prefix backend -- --file ..\data\Data_para_Proveedor_ERP.xlsx --dry-run
npm.cmd run seed:admin --prefix backend
```

Tras revisar el reporte de validación, omite `--dry-run` para importar. Consulta [network-domain.md](../../docs/architecture/network-domain.md) para precedencia, normalización e incidencias esperadas.

Las migraciones SQL crean el esquema; no cargan el inventario ni el catálogo de monitoreo. Para que esas secciones tengan datos, importa `Data_para_Proveedor_ERP.xlsx` con `import:network` y `Equipos_Monitoreo_Red_5196.xlsx` con `import:catalog`.

Si `psql` no se reconoce, usar la ruta completa al ejecutable instalado, por ejemplo:

```powershell
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d postgres -f .\database\scripts\00_create_database.sql
```

La ruta y la version de PostgreSQL pueden variar.

## Convencion para nuevos scripts

- Usar dos digitos iniciales y el siguiente numero disponible (actualmente 19).
- Describir la operacion y el objeto: `12_Create_ix_projects_status.sql`, `13_Alter_tb_clients.sql`.
- No reutilizar numeros ni renombrar scripts ya compartidos.
- Incluir comentarios sobre proposito, prerrequisitos y posibles efectos.
- Usar PostgreSQL y restricciones justificadas: `PRIMARY KEY`, `FOREIGN KEY`, `UNIQUE`, `NOT NULL`, `CHECK` e indices.
- Evitar `DROP TABLE` y eliminaciones masivas.
- No guardar contraseñas, tokens ni credenciales reales.
- Mantener estructura y datos de prueba separados conceptualmente; cualquier dato de prueba debe identificarse claramente, por ejemplo `90_Insert_DatosPrueba.sql`.
- No crear carpetas `migrations`, `seeds` u otras dentro de `database`.

Las operaciones normales de clientes y proyectos se realizan por la API; no se crea un script SQL por cada alta, consulta, edicion o eliminacion.
