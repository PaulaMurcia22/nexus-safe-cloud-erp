# Inicializacion del administrador

La cuenta inicial se crea desde TypeScript para que la contraseña nunca se inserte en PostgreSQL en texto plano. El script usa `crypto.scrypt` y es idempotente respecto al correo normalizado.

## Prerrequisitos

1. Crear la base `nexuserpm` con `00_create_database.sql`.
2. Crear las tablas ejecutando `01_Create_tb_users.sql`, `02_Create_tb_clients.sql` y `03_Create_tb_projects.sql`, en ese orden.
3. Configurar `backend/.env` con la conexión local a PostgreSQL.
4. Instalar las dependencias del backend.

## Ejecucion

Desde la raiz del repositorio:

```powershell
npm.cmd run seed:admin --prefix backend
```

La cuenta de desarrollo es:

- Nombre: `admin pricipal`
- Correo: `paus2207@gmail.com`
- Contraseña inicial: `Admin123*`
- Rol: `ADMIN`
- Estado: activo

Si la cuenta ya existe por su correo normalizado, el script no crea un duplicado ni restablece la contraseña silenciosamente.

Estas credenciales son exclusivamente académicas y de desarrollo. La cuenta compartida impide atribuir cada acción a un integrante; en producción deben crearse cuentas individuales y utilizarse controles adicionales de seguridad.
