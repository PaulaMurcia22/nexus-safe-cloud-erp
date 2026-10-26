# Inicializacion del administrador

La cuenta inicial se crea desde TypeScript para que la contraseña nunca se inserte en PostgreSQL en texto plano. El script usa `crypto.scrypt` y es idempotente respecto al correo normalizado.

## Prerrequisitos

1. Crear la base `nexuserpm` con `00_create_database.sql`.
2. Crear las tablas ejecutando `01_Create_tb_users.sql`, `02_Create_tb_clients.sql`, `03_Create_tb_projects.sql` y `04_Create_network_domain.sql`, en ese orden.
3. Configurar `backend/.env` con la conexión local a PostgreSQL.
4. Instalar las dependencias del backend.

## Ejecucion

Desde la raiz del repositorio:

```powershell
npm.cmd run seed:admin --prefix backend
```

Antes de ejecutarlo, define `ADMIN_EMAIL` y `ADMIN_PASSWORD` (mínimo 12 caracteres), y opcionalmente `ADMIN_NAME`, en el entorno local. El seed no incluye una cuenta o contraseña predeterminada.

Si la cuenta ya existe por su correo normalizado, el script no crea un duplicado ni restablece la contraseña silenciosamente.

Si la cuenta ya existe con ese correo, el script no la duplica ni restablece la contraseña.
