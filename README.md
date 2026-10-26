# Nexus Safe-Cloud ERP

ERP web modular para Nexus Safe-Cloud, desarrollado por AST Solutions. El MVP académico implementa el inicio del corte vertical de servicio gestionado: cliente y sitio, inventario técnico, contratos/alcance, hallazgos, órdenes y horas, hitos, facturación y cartera se completarán por fases. La decisión de representar el centro de salud como cliente gestionado es un supuesto académico, no un dato del Excel; ver [ADR-0001](docs/architecture/adr-0001-opcion-c-servicio-gestionado.md).

## Alcance actual

- Inicio y cierre de sesion con cookie HTTP.
- Roles implementados: `ADMIN`, `MANAGEMENT`, `COMMERCIAL`, `FINANCE`, `IT_OPERATIONS`, `PMO` y `TECHNICIAN`.
- Gestion de usuarios para administradores.
- Clientes B2B (empresas u organizaciones) identificados por NIT normalizado.
- Proyectos asociados obligatoriamente a un cliente activo.
- Dashboard con indicadores y filtro de proyectos.
- API REST con validacion, autorizacion, consultas parametrizadas y manejo centralizado de errores.

El catálogo de monitoreo procede del segundo Excel válido. El corte vertical incluye contratos y alcance, hallazgos, órdenes y horas, hitos, facturación simulada, cartera, permisos por rol, eventos de login y exportación Excel. MFA/SSO/ZTNA corporativos, DIAN real, disponibilidad de red en vivo, recursos predictivos, PDF y otras capacidades que requieren proveedores o datos adicionales están declaradas como diferidas. La importación se realiza por CLI, no desde la web.

### Origen y alcance de los datos

| Fuente / registro | Qué representa | Origen |
|---|---|---|
| `Data_para_Proveedor_ERP.xlsx` | Inventario, enlaces, interfaces, VLAN/pools y controles de un centro de salud | Real importado; no identifica cliente ni sitio |
| `Equipos_Monitoreo_Red_5196.xlsx` | Catálogo de 21 tipos de equipo, señales y protocolos | Real importado |
| Cliente gestionado, sede, contrato, proyectos, trabajo y finanzas de demo | Datos deterministas creados para demostrar el flujo | Sintético, siempre identificado como tal |
| `Datos_PacketTracer.xlsx` | Contradice el plan de direccionamiento del Excel válido | Descartado; no importar ni modelar |
| `captura_tcp-2_Grupo_Eventos_Temporales.xlsx` | Captura ajena al dominio y con contenido potencialmente sensible | Descartado; no importar ni modelar |

Los dos Excel válidos no contienen clientes, contratos, horas ni facturas. Los datos sintéticos no deben presentarse como registros reales.

## Arquitectura

El proyecto utiliza un monolito modular con frontend y backend separados:

- `frontend/`: React, TypeScript, Vite y React Router.
- `backend/`: Node.js, TypeScript, Express y PostgreSQL.
- `database/scripts/`: scripts SQL versionados para crear la base y sus tablas.
- `docs/`: documentacion funcional y de arquitectura.

El frontend nunca se conecta directamente a PostgreSQL. Todas las operaciones pasan por la API del backend.

## Requisitos previos

- Windows y PowerShell.
- Node.js compatible; durante la configuracion actual se verifico Node `v22.23.1`.
- npm, disponible como `npm` en PowerShell.
- PostgreSQL local en ejecucion.
- `psql` o pgAdmin para crear la base y ejecutar los scripts.

Comprobar Node, npm y PostgreSQL:

```powershell
node --version
npm --version
psql --version
```

## Instalacion

Desde la raiz del repositorio:

```powershell
npm run install:all
```

Crear la configuracion local:

```powershell
Copy-Item .env.example backend/.env
```

Editar `backend/.env` con los datos locales de PostgreSQL:

```env
NODE_ENV=development
PORT=3001
FRONTEND_ORIGIN=http://localhost:5173
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nexuserpm
DB_USER=postgres
DB_PASSWORD=la_contraseña_local_de_postgres
```

No subir `backend/.env` ni colocar contraseñas reales en el repositorio.

## Crear y preparar PostgreSQL

La base utilizada por el backend se llama exactamente `nexuserpm`.

### Con `psql`

Crear la base conectado a una base administrativa:

```powershell
psql -U postgres -d postgres -f ./database/scripts/00_create_database.sql
```

Crear las tablas en este orden:

```powershell
psql -U postgres -d nexuserpm -f ./database/scripts/01_Create_tb_users.sql
psql -U postgres -d nexuserpm -f ./database/scripts/02_Create_tb_clients.sql
psql -U postgres -d nexuserpm -f ./database/scripts/03_Create_tb_projects.sql
psql -U postgres -d nexuserpm -f ./database/scripts/04_Create_network_domain.sql
# Luego aplicar los scripts 05_ a 11_ en orden y, para demo, 90_Insert_DatosPrueba.sql.
```

Inicializar el administrador:

```powershell
npm run seed:admin --prefix backend
```

Define `ADMIN_EMAIL`, `ADMIN_PASSWORD` y opcionalmente `ADMIN_NAME` en el entorno local antes de ejecutar el seed. El seed genera un hash con `crypto.scrypt` y no restablece la contraseña de una cuenta existente.

Para cargar la información sintética de la demostración, importa previamente los dos Excel válidos, define `DEMO_USERS_PASSWORD` con al menos 12 caracteres y ejecuta `npm run seed:demo --prefix backend -- --dry-run`; después ejecuta el mismo comando sin `--dry-run`. El seed asigna los 76 activos mediante la operación auditada de red. Para eliminar solo los registros sintéticos y limpiar esa asignación auditadamente, ejecuta `npm run seed:demo --prefix backend -- --reset-synthetic --confirm`. Nunca imprime la contraseña.

### Con pgAdmin

1. Abrir `00_create_database.sql` conectado a `postgres` y ejecutarlo.
2. Seleccionar la base `nexuserpm`.
3. Ejecutar `01_Create_tb_users.sql` a `11_Create_auth_events_and_sessions.sql` en orden.
4. Ejecutar desde una terminal el comando `npm run seed:admin --prefix backend`.

Los scripts usan `IF NOT EXISTS` en los objetos principales, pero deben ejecutarse en el orden indicado. No eliminan bases ni tablas automaticamente.

## Administrador inicial

No hay credenciales predeterminadas en el repositorio. Configura las variables de bootstrap localmente, usa una cuenta individual y no incluyas secretos en archivos versionados.

## Demostración y verificación

- Guion del corte vertical: [docs/mvp/guion-demo.md](docs/mvp/guion-demo.md).
- Supuestos y trazabilidad: [docs/mvp/supuestos.md](docs/mvp/supuestos.md) y [docs/mvp/matriz-trazabilidad.md](docs/mvp/matriz-trazabilidad.md).
- Compilar y probar: `npm run build --prefix backend`, `npm test --prefix backend` y `npm run build --prefix frontend`.
- Las pruebas del grafo usan grafos pequeños y los 76 activos/74 enlaces del Excel válido; las reglas puras cubren cartera, horas, aplicabilidad e importación.
- Aplicar migraciones dos veces y ejecutar pruebas de integración de escritura requiere una base PostgreSQL vacía y separada de la base local existente. No apuntes esos comandos a una base con datos que quieras conservar.

## Ejecutar la aplicacion

Abrir dos terminales en la raiz.

Backend:

```powershell
npm run dev:backend
```

Disponible en `http://localhost:3001`.

Frontend:

```powershell
npm run dev:frontend
```

Disponible normalmente en `http://localhost:5173`.

Si aparece `EADDRINUSE`, ya existe otro proceso usando el puerto:

```powershell
Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
Stop-Process -Id <PID> -Force
```

## API disponible

Todas las rutas empiezan por `/api`.

- Salud: `GET /api/health`, `GET /api/health/db`.
- Auth: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`.
- Usuarios: `GET /api/users`, `POST /api/users`, `PUT /api/users/:id` (incluye estado y rol).
- Clientes: `GET /api/clients?search=texto`, `GET /api/clients/:id`, `POST /api/clients`, `PUT /api/clients/:id`.
- Proyectos: `GET /api/projects`, `POST /api/projects`, `PUT /api/projects/:id`.

Las rutas de usuarios requieren autorizacion de administrador. Cada proyecto debe referenciar un cliente activo. El backend valida fechas, presupuesto, horas, progreso y valores permitidos. El dominio de red está documentado en [network-domain.md](docs/architecture/network-domain.md). Importación de validación: `npm run import:network --prefix backend -- --file ../data/Data_para_Proveedor_ERP.xlsx --dry-run`.

## Pruebas y compilacion

```powershell
npm test --prefix backend
npm run build --prefix backend
npm run build --prefix frontend
```

Las pruebas que requieren PostgreSQL deben ejecutarse con `nexuserpm` disponible y `backend/.env` configurado.

## Flujo para un integrante nuevo

```powershell
git clone <URL_DEL_REPOSITORIO>
Set-Location ./nexus
npm run install:all
Copy-Item .env.example backend/.env
```

Despues debe editar `backend/.env`, crear la base, ejecutar los scripts SQL en orden, inicializar el administrador y levantar backend y frontend.

No se deben subir `node_modules`, archivos `.env`, contraseñas, compilaciones ni datos locales.

## Convencion de scripts SQL

Todos los cambios estructurales deben quedar en `database/scripts/`:

1. `00_create_database.sql`: creacion no destructiva de `nexuserpm`.
2. `01_Create_tb_users.sql`: tabla de usuarios.
3. `02_Create_tb_clients.sql`: tabla de clientes.
4. `03_Create_tb_projects.sql`: tabla de proyectos.
5. `04_Create_network_domain.sql`: activos, enlaces, interfaces, VLAN/DHCP, monitoreo, lotes e incidencias.

Los nuevos cambios deben usar el siguiente numero disponible, por ejemplo `05_Alter_sites_customer_scope.sql` o `06_Create_vlans.sql`. No se deben reutilizar numeros ni crear carpetas `migrations`, `seeds` u otras dentro de `database`.

El seed del administrador se ejecuta desde `backend/src/scripts/seed-admin.ts`; `database/scripts/README_seed_admin.md` documenta el procedimiento. La excepción de numeración corresponde a documentación Markdown, no a un script SQL.

## Documentacion relacionada

- [Scripts y orden de base de datos](database/scripts/README.md)
- [Inicializacion del administrador](database/scripts/README_seed_admin.md)
- [Analisis de archivos Excel y propuesta de modelo](docs/architecture/analisis-archivos-data.md)
- [MVP y trazabilidad](docs/mvp/matriz-trazabilidad.md)
- [Supuestos de demo](docs/mvp/supuestos.md)
- [Guion de demo](docs/mvp/guion-demo.md)

## Limitaciones conocidas

- Las sesiones actuales se mantienen en memoria del backend; reiniciar el proceso cierra las sesiones activas.
- No hay MFA, SSO corporativo ni recuperacion de contraseña.
- Aun no se han implementado facturacion, pagos, cartera, recursos humanos, tareas, etapas, importacion automatica de Excel ni reportes avanzados.
- La cuenta inicial compartida es unicamente para desarrollo academico.
