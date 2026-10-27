# Nexus Safe-Cloud ERP

ERP modular para Nexus Safe-Cloud, desarrollado por AST Solutions. Incluye gestión comercial, proyectos, contratos, operación de red, facturación, compras, contabilidad gerencial y equipo.

> **Antes de comenzar:** estos pasos están pensados para una persona que instala o actualiza el ERP en un computador. Necesitas acceso a PostgreSQL y una contraseña para el usuario administrador. No compartas ni publiques las contraseñas.

## 1. Instalación nueva, paso a paso

Sigue esta sección solamente si todavía no tienes una base de datos del ERP con información que quieras conservar. Si ya existe una instalación, ve a [2. Actualizar desde una versión anterior](#2-actualizar-desde-una-versión-anterior).

### Qué necesitas

- Un computador con Windows, macOS o Linux.
- Node.js 22 y npm. npm se instala junto con Node.js.
- PostgreSQL instalado y en ejecución.
- La contraseña del usuario de PostgreSQL (normalmente `postgres`).
- Este repositorio descargado y abierto en una terminal.
- `psql` (herramienta incluida con PostgreSQL) o pgAdmin.

Para comprobar Node.js, npm y `psql`, abre una terminal y ejecuta:

```text
node --version
npm --version
psql --version
```

Si alguno responde que el comando no existe, instala el programa correspondiente o solicita ayuda a quien administra tu computador. En macOS, Terminal está en Aplicaciones > Utilidades. En Windows, abre PowerShell desde el menú Inicio.

### Paso 1: abre la carpeta del proyecto

En la terminal, entra a la carpeta principal del proyecto, la que contiene `README.md`, `backend`, `frontend` y `database`. Por ejemplo:

```text
cd ruta/a/nexus-safe-cloud-erp
```

En Windows puedes abrir la carpeta en el Explorador, hacer clic en la barra de dirección, escribir `powershell` y pulsar Enter. Así PowerShell quedará ubicado en la carpeta correcta.

### Paso 2: instala las dependencias

Ejecuta estos dos comandos desde la carpeta principal. Espera a que termine el primero antes de ejecutar el segundo:

```text
npm install --prefix backend
npm install --prefix frontend
```

La primera instalación puede tardar unos minutos y necesita conexión a internet. Si pregunta si deseas continuar, acepta.

### Paso 3: crea la configuración local

Crea una copia del archivo de ejemplo con el nombre `backend/.env`.

**Windows PowerShell:**

```powershell
Copy-Item .env.example backend/.env
```

**macOS o Linux:**

```bash
cp .env.example backend/.env
```

Abre `backend/.env` con un editor de texto y completa, como mínimo, estos datos:

```env
NODE_ENV=development
PORT=3001
FRONTEND_ORIGIN=http://localhost:5173
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nexuserpm
DB_USER=postgres
DB_PASSWORD=CONTRASEÑA_DE_POSTGRESQL
ADMIN_EMAIL=tu-correo@empresa.com
ADMIN_PASSWORD=UNA_CONTRASEÑA_DE_12_CARACTERES_O_MAS
ADMIN_NAME=Tu nombre
```

Reemplaza los valores de ejemplo. `DB_PASSWORD` es la contraseña de PostgreSQL. `ADMIN_PASSWORD` será la contraseña para entrar al ERP y debe tener al menos 12 caracteres. Usa una contraseña distinta de la de PostgreSQL. No escribas comillas alrededor de los valores. Guarda el archivo como texto plano con el nombre exacto `.env`, dentro de `backend`.

No compartas `backend/.env` ni lo envíes al repositorio. La configuración de desarrollo ya tiene un secreto de sesión temporal; antes de publicar el ERP en un servidor, la persona responsable debe configurar un `SESSION_SECRET` privado de al menos 32 caracteres.

### Paso 4: crea la base de datos vacía

La base debe llamarse exactamente `nexuserpm`. La contraseña que se solicite aquí es la de PostgreSQL.

**Opción A — con `psql` (recomendada):** desde la carpeta principal, ejecuta:

```text
psql -U postgres -d postgres -f database/scripts/00_create_database.sql
```

Si tu usuario de PostgreSQL no se llama `postgres`, cambia `-U postgres` por el nombre correcto. Si la base ya existe y contiene datos, detente y sigue la sección de actualización; no es una instalación nueva.

**Opción B — con pgAdmin:** crea una base de datos llamada `nexuserpm` desde pgAdmin. No ejecutes el archivo `00_create_database.sql` desde Query Tool: ese archivo está diseñado para `psql`.

### Paso 5: crea las tablas del ERP

Con `psql`, ejecuta los siguientes comandos **en orden**, desde la carpeta principal. Si aparece un error, detente y conserva el mensaje; no continúes con los demás archivos.

```text
psql -U postgres -d nexuserpm -v ON_ERROR_STOP=1 -f database/scripts/01_Create_tb_users.sql
psql -U postgres -d nexuserpm -v ON_ERROR_STOP=1 -f database/scripts/02_Create_tb_clients.sql
psql -U postgres -d nexuserpm -v ON_ERROR_STOP=1 -f database/scripts/03_Create_tb_projects.sql
psql -U postgres -d nexuserpm -v ON_ERROR_STOP=1 -f database/scripts/04_Create_network_domain.sql
psql -U postgres -d nexuserpm -v ON_ERROR_STOP=1 -f database/scripts/05_Alter_sites_customer_scope.sql
psql -U postgres -d nexuserpm -v ON_ERROR_STOP=1 -f database/scripts/06_Create_vlans.sql
psql -U postgres -d nexuserpm -v ON_ERROR_STOP=1 -f database/scripts/07_Create_monitoring_catalog_and_contracts.sql
psql -U postgres -d nexuserpm -v ON_ERROR_STOP=1 -f database/scripts/08_Create_findings_and_work.sql
psql -U postgres -d nexuserpm -v ON_ERROR_STOP=1 -f database/scripts/09_Create_billing.sql
psql -U postgres -d nexuserpm -v ON_ERROR_STOP=1 -f database/scripts/10_Alter_roles_and_origin.sql
psql -U postgres -d nexuserpm -v ON_ERROR_STOP=1 -f database/scripts/11_Create_auth_events_and_sessions.sql
psql -U postgres -d nexuserpm -v ON_ERROR_STOP=1 -f database/scripts/12_Alter_network_assets_data_origin.sql
psql -U postgres -d nexuserpm -v ON_ERROR_STOP=1 -f database/scripts/13_Create_iot_capture_analytics.sql
psql -U postgres -d nexuserpm -v ON_ERROR_STOP=1 -f database/scripts/14_Create_crm_opportunities.sql
psql -U postgres -d nexuserpm -v ON_ERROR_STOP=1 -f database/scripts/15_Create_saas_subscriptions.sql
psql -U postgres -d nexuserpm -v ON_ERROR_STOP=1 -f database/scripts/16_Create_procurement_expenses.sql
psql -U postgres -d nexuserpm -v ON_ERROR_STOP=1 -f database/scripts/17_Create_accounting.sql
psql -U postgres -d nexuserpm -v ON_ERROR_STOP=1 -f database/scripts/18_Create_hr_employees.sql
```

Cuando aparezca `Password for user postgres`, escribe la contraseña de PostgreSQL. No verás los caracteres en pantalla mientras la escribes; es normal. Si usas pgAdmin, abre cada archivo `01_...sql` hasta `18_...sql` en ese mismo orden, selecciona la base `nexuserpm` y pulsa **Ejecutar**. Espera a que cada archivo finalice antes de abrir el siguiente.

### Paso 6: crea el usuario administrador

Confirma que `ADMIN_EMAIL`, `ADMIN_PASSWORD` y `ADMIN_NAME` estén guardados en `backend/.env`. Desde la carpeta principal ejecuta:

```text
npm run seed:admin --prefix backend
```

Debe aparecer el mensaje `Administrador inicial creado.`. Este paso crea el usuario para iniciar sesión; no carga registros de clientes ni datos de demostración.

### Paso 7: inicia el ERP

Abre **dos terminales** en la carpeta principal. Deja cada una abierta mientras usas el ERP.

En la primera terminal, inicia el servidor:

```text
npm run dev:backend
```

Espera el mensaje `Backend escuchando en http://localhost:3001`.

En la segunda terminal, inicia la página web:

```text
npm run dev:frontend
```

Abre `http://localhost:5173` en el navegador e inicia sesión con `ADMIN_EMAIL` y `ADMIN_PASSWORD`, los datos que guardaste en `backend/.env`.

Para cerrar el ERP, vuelve a cada terminal y pulsa `Ctrl+C`.

### Datos de demostración (opcional)

La instalación nueva crea las tablas y el usuario administrador, pero no inventa información operativa automáticamente. Si quieres mostrar el inventario y el catálogo de equipos incluidos en la carpeta `data`, importa los Excel válidos desde la carpeta principal:

```text
npm run import:network --prefix backend -- --file ../data/Data_para_Proveedor_ERP.xlsx --dry-run
npm run import:catalog --prefix backend -- --file ../data/Equipos_Monitoreo_Red_5196.xlsx --dry-run
```

Primero revisa los resultados de validación. Si no reportan un error que debas corregir, repite cada comando quitando `--dry-run` para guardar la información. El archivo `Datos_PacketTracer.xlsx` no se debe importar. Para cargar empresas, proyectos, suscripciones, compras y otros registros sintéticos de demostración, consulta [Supuestos de demo](docs/mvp/supuestos.md) y [Scripts de base de datos](database/scripts/README.md); esos registros son demostrativos, no ventas u operaciones reales.

## 2. Actualizar desde una versión anterior

Esta sección es para actualizar el código y la base existente **conservando sus registros**. No borres la base de datos, no crees otra con el mismo nombre y no ejecutes los scripts de instalación `01` a `11` sobre la base en uso.

### Antes de actualizar

1. Avisa a las personas que usan el ERP y pídeles cerrar sesión.
2. Detén el backend y el frontend con `Ctrl+C` en sus terminales.
3. Comprueba que puedes conectarte a PostgreSQL y que conoces la contraseña del usuario que administra la base.
4. Haz una copia de seguridad completa. No continúes hasta que el archivo de respaldo exista y tenga un tamaño mayor que cero.

**Respaldo con `pg_dump` desde la carpeta principal:**

```text
pg_dump -U postgres -d nexuserpm -F c -f nexus-antes-de-actualizar.backup
```

Guarda `nexus-antes-de-actualizar.backup` en un lugar seguro fuera de la carpeta del proyecto. Si tu usuario no es `postgres`, reemplázalo en el comando.

**Respaldo con pgAdmin:** haz clic derecho sobre `nexuserpm` > **Backup…**. Elige formato **Custom**, indica una ubicación fuera del proyecto, por ejemplo `nexus-antes-de-actualizar.backup`, y pulsa **Backup**. Verifica que el archivo se haya creado.

### Actualiza los archivos del proyecto

1. Conserva la copia de seguridad anterior.
2. Actualiza los archivos del proyecto con la versión nueva usando el mismo método con el que recibiste el proyecto (por ejemplo, `git pull` si trabajas con Git, o copiar los archivos de la entrega nueva).
3. **Conserva `backend/.env` y la carpeta `data`.** No reemplaces el archivo `.env` por el ejemplo: contiene la conexión a tu base actual.
4. Abre una terminal en la carpeta principal de la versión nueva.
5. Instala/actualiza las dependencias:

```text
npm install --prefix backend
npm install --prefix frontend
```

### Aplica los cambios de base de datos

En la versión anterior que ya tenía usuarios, clientes, proyectos, red, contratos, hallazgos, órdenes y facturación (scripts hasta el `12`), aplica solamente los scripts nuevos `13` a `18`. Ejecuta cada comando y espera que termine antes del siguiente:

```text
psql -U postgres -d nexuserpm -v ON_ERROR_STOP=1 -f database/scripts/13_Create_iot_capture_analytics.sql
psql -U postgres -d nexuserpm -v ON_ERROR_STOP=1 -f database/scripts/14_Create_crm_opportunities.sql
psql -U postgres -d nexuserpm -v ON_ERROR_STOP=1 -f database/scripts/15_Create_saas_subscriptions.sql
psql -U postgres -d nexuserpm -v ON_ERROR_STOP=1 -f database/scripts/16_Create_procurement_expenses.sql
psql -U postgres -d nexuserpm -v ON_ERROR_STOP=1 -f database/scripts/17_Create_accounting.sql
psql -U postgres -d nexuserpm -v ON_ERROR_STOP=1 -f database/scripts/18_Create_hr_employees.sql
```

Si tu versión todavía no tenía el cambio `12_Alter_network_assets_data_origin.sql`, ejecuta primero ese archivo y luego los seis comandos anteriores. Si no sabes hasta qué script llegó tu base, **no adivines ni ejecutes todos los scripts**: pide a la persona que administra PostgreSQL que confirme el último cambio aplicado. Este proyecto aún no tiene un registro automático de migraciones ejecutadas.

Si usas pgAdmin, abre cada archivo indicado, confirma que la base seleccionada sea `nexuserpm`, pulsa **Ejecutar** y espera el resultado antes de continuar. No ejecutes `00_create_database.sql` durante una actualización: sirve únicamente para crear la base de una instalación nueva.

### Finaliza y comprueba la actualización

1. Inicia el backend con `npm run dev:backend` y espera `Backend escuchando en http://localhost:3001`.
2. Inicia el frontend en otra terminal con `npm run dev:frontend`.
3. Abre `http://localhost:5173` e inicia sesión con tu usuario y contraseña de siempre.
4. Revisa que puedas abrir Inicio y los módulos que usas, por ejemplo Clientes, Facturación, Compras y Contabilidad.
5. Si todo funciona, conserva el respaldo hasta confirmar que no necesitas volver a la versión anterior.

La actualización no necesita volver a crear el usuario administrador ni cargar datos sintéticos. No ejecutes `90_Insert_DatosPrueba.sql` en una base con información de trabajo: inserta datos de demostración.

### Si algo sale mal

- Si un comando muestra un error, detente y guarda una captura o copia el texto completo. No ejecutes los siguientes scripts.
- No borres ni recrees `nexuserpm` para intentar corregir el problema.
- No restaures el respaldo encima de la base original sin ayuda: restaurar reemplaza su contenido. Conserva el archivo y solicita apoyo técnico indicando en qué paso ocurrió el error.
- Si el servicio indica que no puede conectarse a PostgreSQL, comprueba que PostgreSQL esté iniciado y que `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` y `DB_PASSWORD` en `backend/.env` sean los de la instalación correcta.

## Qué contienen los datos

Los Excel de red corresponden a inventario/catálogos técnicos y no acreditan clientes ni operaciones comerciales reales. La captura TCP solo aporta métricas agregadas de laboratorio; el sistema no guarda ni expone el contenido bruto de los mensajes. Los registros del seed de demostración son sintéticos y deben presentarse como demostración, no como ventas reales. Consulta [ADR-0003](docs/architecture/adr-0003-nexus-saas.md), [Supuestos de demo](docs/mvp/supuestos.md) y [Análisis de los datos](docs/architecture/analisis-archivos-data.md).

## Información adicional

- [Orden y propósito de los scripts SQL](database/scripts/README.md)
- [Inicialización del administrador](database/scripts/README_seed_admin.md)
- [Documentación de API](docs/api/README.md)
- [Dominio de red](docs/architecture/network-domain.md)
- [Guion de demostración](docs/mvp/guion-demo.md)

## Ejecutar verificaciones (opcional)

Estos comandos son para una persona técnica o de soporte. No son necesarios para iniciar el ERP:

```text
npm run build --prefix backend
npm run build --prefix frontend
npm test --prefix backend
```

Las pruebas que requieren PostgreSQL deben ejecutarse en una base de prueba separada; nunca sobre una base con información que quieras conservar.
