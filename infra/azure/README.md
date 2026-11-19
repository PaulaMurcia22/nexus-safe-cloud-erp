# Despliegue de Nexus Safe-Cloud en Azure

Guía para publicar el entorno de demostración con Azure Container Apps, Azure Container Registry, PostgreSQL Flexible Server y RabbitMQ. El despliegue crea recursos facturables. Revisa el saldo de Azure for Students y estima los costos en la [calculadora de Azure](https://azure.microsoft.com/pricing/calculator/) antes de crear recursos.

## Arquitectura y costos

- Frontend público en Container Apps. Nginx entrega la SPA y reenvía `/api/*` al ingress interno `nexus-backend` (puerto 80; Container Apps enruta al puerto 3000 del contenedor), por lo que el navegador usa la misma URL y no requiere conocer una URL pública del backend.
- Backend y RabbitMQ son internos al entorno de Container Apps. RabbitMQ usa AMQP 5672 y su usuario/contraseña se configura como secreto.
- PostgreSQL Flexible Server queda en una subred delegada, con acceso público deshabilitado y DNS privado enlazado a la VNet.
- ACR usa SKU Basic. Las imágenes se publican con una etiqueta versionada; Container Apps usa identidades administradas para descargarlas.
- El backend conserva una réplica mínima para que la API responda sin esperar un arranque en frío; frontend puede escalar a cero y RabbitMQ queda en una réplica. El backend y RabbitMQ pueden generar costo mientras permanecen activos. RabbitMQ usa almacenamiento efímero: esta configuración sirve para demo, no para mensajes que deban sobrevivir a una recreación. PostgreSQL mantiene el outbox para reintentar la publicación.

PostgreSQL `Standard_B1ms` y 32 GiB de almacenamiento tienen un costo base incluso sin tráfico. Container Apps Consumption ofrece una cuota mensual gratuita por suscripción, pero RabbitMQ siempre encendido y los recursos de red/logs pueden generar cargos. Azure for Students acredita USD 100 por 12 meses; revisa Education Hub y crea alertas de presupuesto (las alertas no detienen automáticamente los recursos).

## Requisitos

- Azure CLI con extensión Bicep, Docker Desktop y sesión iniciada en la suscripción correcta.
- Permisos para crear grupos de recursos, ACR, Container Apps, red virtual y PostgreSQL Flexible Server.
- Región con disponibilidad de todos esos servicios y cuota suficiente.
- Correo del administrador inicial y contraseñas únicas. No guardes secretos en Git ni en el archivo `.bicepparam`.

## 1. Seleccionar suscripción y crear el grupo

Ejecuta desde la raíz del repositorio en PowerShell:

```powershell
az login
az account list --output table
az account set --subscription "<ID-o-nombre-de-la-suscripción>"
az account show --query "{name:name,id:id,state:state}" --output table

$location = "brazilsouth"
$resourceGroup = "nexus-student-dev"
az group create --name $resourceGroup --location $location
```

## 2. Crear ACR e identificar sus imágenes

El template de bootstrap y el principal calculan el mismo nombre determinista para ACR. Despliega primero el registro para poder publicar las imágenes antes de crear las Container Apps:

```powershell
az deployment group create `
  --name nexus-acr-bootstrap `
  --resource-group $resourceGroup `
  --template-file infra/azure/acr-bootstrap.bicep `
  --parameters namePrefix=nexus-dev location=$location

$registry = az deployment group show `
  --name nexus-acr-bootstrap `
  --resource-group $resourceGroup `
  --query properties.outputs.loginServer.value `
  --output tsv
$acr = $registry.Split('.')[0]
az acr login --name $acr
```

Elige una etiqueta nueva e inmutable por cada publicación. Construye ambos contextos desde sus respectivas carpetas:

```powershell
$tag = "dev-20261118"
docker build -f backend/Dockerfile -t "$registry/nexus-backend:$tag" .
docker push "$registry/nexus-backend:$tag"
docker build --build-arg "VITE_API_URL=/api" -t "$registry/nexus-frontend:$tag" ./frontend
docker push "$registry/nexus-frontend:$tag"
```

La configuración de Nginx en `frontend/nginx.conf` remite `/api/` al ingress interno `nexus-backend` por el puerto 80. Container Apps enruta las solicitudes al puerto 3000 del contenedor. No cambies `VITE_API_URL=/api` por una URL localhost ni por un FQDN de backend.

## 3. Completar parámetros no secretos

Abre `infra/azure/main.dev.bicepparam` y actualiza `backendImage` y `frontendImage` con el registro y las etiquetas que acabas de publicar. Sustituye también el correo del administrador si se define como parámetro requerido por la plantilla. Ejemplo:

```bicep
param backendImage = 'nexusdevabc123.azurecr.io/nexus-backend:dev-20261118'
param frontendImage = 'nexusdevabc123.azurecr.io/nexus-frontend:dev-20261118'
param adminEmail = 'admin@ejemplo.com'
```

Confirma que `enableDemoData = true` para cargar registros sintéticos; la imagen backend incluye los Excel de topología y catálogo que alimentan la semilla. El backend mantiene mínimo `1` y máximo `1` para evitar que la migración/semilla de arranque se repita al escalar a cero; el frontend mantiene mínimo `0` y máximo `1`.

## 4. Validar y desplegar

Desde la raíz del repositorio, ejecuta primero la validación. Por defecto, el script pide los cinco secretos de forma oculta. Si quieres conservar las credenciales locales del `.env`, usa `-UseLocalEnv`: toma las contraseñas existentes y genera claves aleatorias para RabbitMQ y para PostgreSQL cuando la contraseña local no cumple los requisitos de Azure. Los secretos solo se pasan al proceso mediante variables de entorno y se limpian al terminar.

```powershell
./infra/azure/deploy.ps1 -Mode Validate -ResourceGroup $resourceGroup -UseLocalEnv
```

Cuando la validación sea exitosa y hayas revisado el plan/costos, crea los recursos:

```powershell
./infra/azure/deploy.ps1 -Mode Deploy -ResourceGroup $resourceGroup -UseLocalEnv
```

El template configura PostgreSQL privado y las Container Apps en la misma VNet. Al iniciar la revisión del backend, se conecta a PostgreSQL con TLS, aplica el esquema, importa los Excel incluidos en la imagen y carga la semilla sintética. Revisa los logs de `nexus-backend` para confirmar que terminaron la migración, la importación y la semilla. Las revisiones nuevas vuelven a ejecutar el arranque; verifica los logs después de cada actualización. Consulta las salidas del despliegue con:

```powershell
az deployment group show --name nexus-dev --resource-group $resourceGroup --query properties.outputs --output json
```

Abre `frontendUrl` para ingresar. El backend no tiene endpoint público; usa el proxy `/api` del frontend. La primera petición puede tardar mientras arranca el frontend, que puede escalar a cero.

## Base de datos y usuarios

En Azure, `AUTO_MIGRATE_DB=true` crea el esquema con TLS al iniciar y `enableDemoData=true` importa los Excel incluidos en la imagen y carga la semilla sintética. Docker Compose local mantiene desactivada la migración automática. Verifica la salud de la API y el login después de desplegar.

El PostgreSQL usa red privada: `psql` desde tu PC no tendrá ruta directa al servidor. Ejecuta el SQL desde una máquina conectada a la VNet o desde un job/contendor temporal dentro del entorno. Aplica `database/docker-init/01_init_schema.sql` y luego carga los datos de demo con un proceso de migración seguro. Si vas a mover la base Docker actual, crea primero un `pg_dump`, restaura en el servidor destino y verifica datos antes de borrar el origen. No abras la base a `0.0.0.0/0` para facilitar la migración.

## Actualizaciones

Para publicar una versión, cambia `$tag`, reconstruye y sube las imágenes como en el paso 2, y actualiza `backendImage` y `frontendImage` en `infra/azure/main.dev.bicepparam`. Usa siempre tags inmutables por versión para evitar que una revisión siga sirviendo una imagen cacheada. Después valida y aplica la plantilla:

```powershell
./infra/azure/deploy.ps1 -Mode Validate -ResourceGroup $resourceGroup -UseLocalEnv
./infra/azure/deploy.ps1 -Mode Deploy -ResourceGroup $resourceGroup -UseLocalEnv
```

El despliegue crea nuevas revisiones. Confirma que frontend y backend estén `Healthy`; comprueba la web y los endpoints `/api/health` y `/api/health/db`. Revisa los logs del backend para validar el arranque, importación y semilla.

### Configurar Ollama Cloud

El backend usa `OLLAMA_BASE_URL=https://ollama.com` y envía la clave como `Authorization: Bearer ...`. En Azure Portal, abre **Container Apps → nexus-backend → Secrets** y crea o actualiza `ollama-api-key` con la clave cruda (sin el texto `Bearer`). En **Containers → Environment variables**, configura `OLLAMA_API_KEY` como referencia a ese secreto, `OLLAMA_BASE_URL` como `https://ollama.com` y `OLLAMA_MODEL` con un modelo disponible en la cuenta. Guarda una revisión nueva para que el proceso lea el secreto actualizado. El script `deploy.ps1` no pide la clave de Ollama; después de desplegar con ese script, confirma que el secreto y la referencia sigan configurados.

- HTTP 401: Ollama rechazó la API key.
- HTTP 402: revisa créditos, uso y facturación en [Ollama Settings](https://ollama.com/settings) y los [precios de Ollama Cloud](https://ollama.com/pricing).
- Revisa el estado de la revisión y los logs del backend después de cambiar el secreto. No guardes la clave en Git ni en `main.dev.bicepparam`.

## Control de gasto y limpieza

- Configura una alerta de presupuesto y revisa periódicamente Cost Management.
- Detén PostgreSQL cuando no uses la demo; el almacenamiento sigue cobrando.
- RabbitMQ requiere una réplica activa y tiene almacenamiento no persistente en esta configuración.
- No añadas alta disponibilidad, NAT Gateway, logs excesivos ni servicios adicionales al presupuesto de USD 100 sin estimar su costo.
- Al terminar, exporta los datos necesarios y elimina el grupo de recursos. La eliminación es irreversible:

```powershell
az group delete --name $resourceGroup --yes --no-wait
```

## Límites de esta configuración

Es un despliegue de demostración: RabbitMQ no conserva mensajes al reemplazar la réplica; no hay dominio propio ni HTTPS personalizado; y la red privada impide administrar PostgreSQL directamente desde una PC fuera de la VNet. Antes de usar datos reales, agrega persistencia y recuperación de RabbitMQ, configura backups y valida seguridad/costos en la suscripción.
