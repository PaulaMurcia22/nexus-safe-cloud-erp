# Nexus Safe-Cloud ERP

ERP web modular para Nexus Safe-Cloud, desarrollado por AST Solutions. El MVP centraliza autenticacion, usuarios, clientes empresariales, proyectos y un dashboard inicial.

## Alcance actual

- Inicio y cierre de sesion con cookie HTTP.
- Roles: `ADMIN`, `MANAGEMENT`, `COMMERCIAL`, `FINANCE` e `IT_OPERATIONS`.
- Gestion de usuarios para administradores.
- Clientes B2B (empresas u organizaciones) identificados por NIT normalizado.
- Proyectos asociados obligatoriamente a un cliente activo.
- Dashboard con indicadores y filtro de proyectos.
- API REST con validacion, autorizacion, consultas parametrizadas y manejo centralizado de errores.

Facturacion, pagos, recursos, importacion automatica de Excel, MFA, SSO e integracion DIAN quedan fuera del MVP actual.

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
- npm, disponible como `npm.cmd` en PowerShell.
- PostgreSQL local en ejecucion.
- `psql` o pgAdmin para crear la base y ejecutar los scripts.

Comprobar Node, npm y PostgreSQL:

```powershell
node --version
npm.cmd --version
psql --version
```

Si `psql` no se reconoce, PostgreSQL puede estar instalado pero su carpeta `bin` no esta en el `PATH`. Se puede usar una ruta completa, ajustando la version instalada:

```powershell
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" --version
```

## Instalacion

Desde la raiz del repositorio:

```powershell
npm.cmd run install:all
```

Crear la configuracion local:

```powershell
Copy-Item .env.example backend\.env
```

Editar `backend\.env` con los datos locales de PostgreSQL:

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
psql -U postgres -d postgres -f .\database\scripts\00_create_database.sql
```

Crear las tablas en este orden:

```powershell
psql -U postgres -d nexuserpm -f .\database\scripts\01_Create_tb_users.sql
psql -U postgres -d nexuserpm -f .\database\scripts\02_Create_tb_clients.sql
psql -U postgres -d nexuserpm -f .\database\scripts\03_Create_tb_projects.sql
```

Inicializar el administrador:

```powershell
npm.cmd run seed:admin --prefix backend
```

El seed genera un hash con `crypto.scrypt`, no guarda la contraseña en texto plano, no duplica la cuenta existente y no restablece silenciosamente su contraseña.

### Con pgAdmin

1. Abrir `00_create_database.sql` conectado a `postgres` y ejecutarlo.
2. Seleccionar la base `nexuserpm`.
3. Ejecutar `01_Create_tb_users.sql`, `02_Create_tb_clients.sql` y `03_Create_tb_projects.sql`, en ese orden.
4. Ejecutar desde una terminal el comando `npm.cmd run seed:admin --prefix backend`.

Los scripts usan `IF NOT EXISTS` en los objetos principales, pero deben ejecutarse en el orden indicado. No eliminan bases ni tablas automaticamente.

### Reinicio manual durante desarrollo

Solo si se desea comenzar desde cero y no se necesitan los datos actuales:

```powershell
psql -U postgres -d postgres
```

Dentro de `psql`:

```sql
DROP DATABASE IF EXISTS nexuserpm WITH (FORCE);
CREATE DATABASE nexuserpm;
\q
```

Despues repetir los scripts de tablas y el seed. Esta operacion es destructiva y no forma parte del flujo normal.

## Cuenta inicial de desarrollo

- Correo: `paus2207@gmail.com`
- Contraseña inicial: `Admin123*`
- Rol: `ADMIN`
- Estado: activo

Es una cuenta compartida temporal para el entorno academico. Compartirla impide atribuir cada accion a una persona. En produccion deben utilizarse cuentas individuales, contraseñas seguras y MFA.

## Ejecutar la aplicacion

Abrir dos terminales en la raiz.

Backend:

```powershell
npm.cmd run dev:backend
```

Disponible en `http://localhost:3001`.

Frontend:

```powershell
npm.cmd run dev:frontend
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
- Usuarios: `GET /api/users`, `POST /api/users`, `PUT /api/users/:id`, `PATCH /api/users/:id/status`.
- Clientes: `GET /api/clients?search=texto`, `GET /api/clients/:id`, `POST /api/clients`, `PUT /api/clients/:id`.
- Proyectos: `GET /api/projects`, `POST /api/projects`, `PUT /api/projects/:id`.

Las rutas de usuarios requieren autorizacion de administrador. Cada proyecto debe referenciar un cliente activo. El backend valida fechas, presupuesto, horas, progreso y valores permitidos.

## Pruebas y compilacion

```powershell
npm.cmd test --prefix backend
npm.cmd run build --prefix backend
npm.cmd run build --prefix frontend
```

Las pruebas que requieren PostgreSQL deben ejecutarse con `nexuserpm` disponible y `backend/.env` configurado.

## Flujo para un integrante nuevo

```powershell
git clone <URL_DEL_REPOSITORIO>
Set-Location .\nexus
npm.cmd run install:all
Copy-Item .env.example backend\.env
```

Despues debe editar `backend\.env`, crear la base, ejecutar los scripts SQL en orden, inicializar el administrador y levantar backend y frontend.

No se deben subir `node_modules`, archivos `.env`, contraseñas, compilaciones ni datos locales.

## Convencion de scripts SQL

Todos los cambios estructurales deben quedar en `database/scripts/`:

1. `00_create_database.sql`: creacion no destructiva de `nexuserpm`.
2. `01_Create_tb_users.sql`: tabla de usuarios.
3. `02_Create_tb_clients.sql`: tabla de clientes.
4. `03_Create_tb_projects.sql`: tabla de proyectos.

Los nuevos cambios deben usar el siguiente numero disponible, por ejemplo `04_Create_ix_projects_status.sql` o `05_Alter_tb_clients.sql`. No se deben reutilizar numeros ni crear carpetas `migrations`, `seeds` u otras dentro de `database`.

El seed del administrador se ejecuta desde `backend/src/scripts/seed-admin.ts`; `database/scripts/02_seed_admin.md` documenta el procedimiento.

## Documentacion relacionada

- [Scripts y orden de base de datos](database/scripts/README.md)
- [Inicializacion del administrador](database/scripts/02_seed_admin.md)
- [Analisis de archivos Excel y propuesta de modelo](docs/architecture/analisis-archivos-data.md)

## Limitaciones conocidas

- Las sesiones actuales se mantienen en memoria del backend; reiniciar el proceso cierra las sesiones activas.
- No hay MFA, SSO corporativo ni recuperacion de contraseña.
- Aun no se han implementado facturacion, pagos, cartera, recursos humanos, tareas, etapas, importacion automatica de Excel ni reportes avanzados.
- La cuenta inicial compartida es unicamente para desarrollo academico.
