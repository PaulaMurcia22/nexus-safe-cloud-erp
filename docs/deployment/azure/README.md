# Despliegue de Nexus Safe-Cloud en Azure

Esta guía prepara un despliegue reproducible, pero no ejecuta operaciones Azure por sí misma. El diseño conserva la arquitectura actual: frontend React/Vite, backend Express/TypeScript y PostgreSQL. El backend sigue siendo un monolito modular.

## Arquitectura seleccionada

Para el estado actual se propone:

- Azure Container Apps para frontend Nginx y backend Node.js.
- Azure Container Registry para imágenes privadas.
- Azure Database for PostgreSQL Flexible Server para producción.
- Log Analytics para logs de Container Apps.
- Ingress HTTPS administrado por Container Apps.

Azure Static Web Apps es una alternativa para el frontend estático, pero no se selecciona en esta primera automatización porque el proyecto ya tiene una imagen Nginx reproducible y la URL de API se incorpora en build mediante `VITE_API_URL`. Usar Static Web Apps requeriría un flujo CI/CD y una configuración adicional de build; no es necesario para demostrar el backend Dockerizado.

RabbitMQ, balanceadores externos y Ollama permanente quedan fuera de este despliegue hasta que exista una integración validada. `http://localhost:11434` no sirve desde Azure para alcanzar un Ollama separado.

## Requisitos previos

La persona que despliega debe tener:

- Suscripción Azure autorizada.
- Azure CLI con extensión Bicep disponible.
- Docker Desktop con Docker Compose.
- `psql` para inicializar PostgreSQL.
- Permisos para crear recursos, asignar `AcrPull` y consultar logs.
- Una región y un grupo de recursos aprobados.

No se requieren credenciales dentro del repositorio.

## Fase local: revisar y construir

Ejecutar desde la raíz del repositorio:

```powershell
docker compose config --quiet
npm.cmd run build --prefix backend
npm.cmd run build --prefix frontend
npm.cmd test --prefix backend
.\scripts\azure\validate-azure.ps1
```

La validación Bicep requiere conectividad para que Azure CLI tenga el compilador Bicep disponible. No crea recursos.

Para probar localmente el ERP:

```powershell
docker compose up --build
```

Endpoints esperados:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:3000/api/health
Database: http://localhost:3000/api/health/db
```

## Fase Azure: iniciar sesión y preparar el grupo

Estos comandos requieren la suscripción de la integrante responsable:

```powershell
az login
az account list --output table
az account set --subscription '<SUBSCRIPTION_ID_O_NOMBRE>'
az group create --name '<RESOURCE_GROUP>' --location eastus
```

La creación del grupo genera recursos administrativos, aunque normalmente no es el componente de costo principal. Confirmar la región y el crédito disponible antes de continuar.

## Fase ACR: crear el registro antes de publicar imágenes

El template principal referencia imágenes que deben existir antes de que Container Apps pueda iniciar. Primero validar y desplegar únicamente ACR:

```powershell
az deployment group validate `
  --resource-group '<RESOURCE_GROUP>' `
  --template-file infra/azure/acr-bootstrap.bicep

az deployment group create `
  --resource-group '<RESOURCE_GROUP>' `
  --template-file infra/azure/acr-bootstrap.bicep `
  --name acr-bootstrap

$acr = az deployment group show --resource-group '<RESOURCE_GROUP>' --name acr-bootstrap --query properties.outputs.containerRegistryName.value -o tsv
az acr login --name $acr
```

Construir y publicar imágenes con tags inmutables:

```powershell
docker build -t "$acr.azurecr.io/nexus-backend:2026-11-14" .\backend
docker build -t "$acr.azurecr.io/nexus-frontend:2026-11-14" .\frontend
docker push "$acr.azurecr.io/nexus-backend:2026-11-14"
docker push "$acr.azurecr.io/nexus-frontend:2026-11-14"
```

Después actualizar `main.dev.bicepparam` con las referencias completas de esas imágenes. No usar `latest` en la demostración.

## Fase PostgreSQL

El template crea el servidor y la base, pero la inicialización del esquema es una operación separada. El archivo `database/docker-init/01_init_schema.sql` orquesta los scripts estructurales 01 a 18. No incluye `00_create_database.sql`, porque Azure crea la base mediante el recurso administrado. El seed `90_Insert_DatosPrueba.sql` y los importadores de Excel son opcionales y no deben ejecutarse automáticamente sobre una base existente.

Después de crear PostgreSQL y autorizar conectividad, usar `psql` con el FQDN entregado por Azure:

```powershell
.\scripts\azure\initialize-postgres.ps1 -HostName '<POSTGRES_FQDN>' -Execute
```

La conectividad de red, firewall o VNet debe estar resuelta antes. La plantilla actual conserva una configuración de desarrollo y no afirma red privada ni alta disponibilidad.

## Fase de despliegue de aplicaciones

Antes de crear Container Apps, completar en `infra/azure/main.dev.bicepparam`:

- `backendImage`.
- `frontendImage`.
- Región autorizada.
- Parámetros no sensibles del entorno.

Los valores seguros se solicitan por consola. `FRONTEND_ORIGIN`, `ADMIN_EMAIL` y el `VITE_API_URL` definitivo dependen de los dominios generados y deben completarse antes de la creación final.

Validación sin creación:

```powershell
az deployment group validate `
  --resource-group '<RESOURCE_GROUP>' `
  --template-file infra/azure/main.bicep `
  --parameters infra/azure/main.dev.bicepparam `
  --parameters postgresAdminPassword='<NO_USAR_EN_HISTORIAL>' sessionSecret='<NO_USAR_EN_HISTORIAL>' adminPassword='<NO_USAR_EN_HISTORIAL>' demoUsersPassword='<NO_USAR_EN_HISTORIAL>'
```

Despliegue explícito, únicamente después de revisar costos y parámetros:

```powershell
.\scripts\azure\deploy-azure.ps1 -ResourceGroup '<RESOURCE_GROUP>' -Execute
```

El script solicita confirmaciones y no imprime los secretos. Para una ejecución automatizada real se recomienda Key Vault o federación OIDC en CI/CD, no secretos en archivos de parámetros.

## CORS, dominios y frontend

El frontend debe compilarse con:

```text
VITE_API_URL=https://<BACKEND_HOST>/api
```

El backend debe usar:

```text
FRONTEND_ORIGIN=https://<FRONTEND_HOST>
```

La aplicación usa cookies HttpOnly y en producción agrega `Secure`; por eso deben probarse login, sesión, logout y solicitudes con credenciales mediante HTTPS real.

## Pruebas posteriores al despliegue

No se consideran realizadas hasta ejecutarlas:

```powershell
Invoke-WebRequest https://<BACKEND_HOST>/api/health
Invoke-WebRequest https://<BACKEND_HOST>/api/health/db
Invoke-WebRequest https://<FRONTEND_HOST>
az containerapp logs show --name nexus-backend --resource-group '<RESOURCE_GROUP>' --follow
az containerapp revision list --name nexus-backend --resource-group '<RESOURCE_GROUP>' --output table
```

También se debe comprobar login, persistencia, carga de un flujo ERP, reinicio de revisión y conexión backend-PostgreSQL.

## Actualización de versión

Construir nuevas imágenes con un tag inmutable, hacer push al ACR y volver a ejecutar la plantilla con las nuevas referencias. Container Apps creará una nueva revisión. Validar healthchecks antes de distribuir tráfico.

## Detención y eliminación

Para reducir consumo durante pruebas, detener aplicaciones desde Azure Portal o CLI según la política de la suscripción. No eliminar PostgreSQL sin backup o confirmación.

La eliminación del grupo es destructiva y requiere autorización explícita:

```powershell
az group delete --name '<RESOURCE_GROUP>' --yes --no-wait
```

No ejecutar este comando como parte normal de la demostración.

## Costos y riesgos

Container Apps, ACR, Log Analytics y PostgreSQL pueden consumir crédito. El tier Burstable y HA deshabilitado en la plantilla reducen el costo inicial, pero no garantizan alta disponibilidad. PostgreSQL ofrece backups administrados y recuperación point-in-time según la configuración contratada; HA, backup georredundante, red privada, almacenamiento, logs y transferencia deben verificarse en la calculadora y en la suscripción Azure for Students.

No asumir que Azure for Students hace todos los servicios gratuitos. Revisar cuota, región, límites de crédito, retención de logs y fecha de expiración antes de desplegar.

| Elemento | Cuota o consumo gratuito | Posible cobro | Tarifa |
|---|---|---|---|
| Container Apps | Depende de la oferta vigente y del tipo de consumo | CPU, memoria, réplicas y solicitudes | Consultar Pricing Calculator |
| ACR | Depende del tier y límites vigentes | Registro, almacenamiento y operaciones | Consultar Pricing Calculator |
| PostgreSQL Flexible Server | No asumir gratuidad | Compute, almacenamiento, backups y red | Consultar Pricing Calculator |
| Log Analytics | Puede existir asignación según oferta | Ingesta y retención | Consultar Pricing Calculator |
| Transferencia | Puede existir franquicia según servicio | Egreso y tráfico entre regiones | Consultar Pricing Calculator |

Los valores monetarios no se fijan en este repositorio porque cambian por región, fecha, SKU y suscripción. Confirmar la calculadora antes de crear recursos.

Para el despliegue autorizado, no escribas secretos en el historial de PowerShell ni en `main.dev.bicepparam`. Usa `deploy-azure.ps1 -Execute`, que solicita los valores de forma interactiva, usa un archivo temporal fuera del repositorio y lo elimina al terminar.

## Estado de preparación

| Componente | Estado |
|---|---|
| Docker local | Listo y validado previamente |
| ACR bootstrap | Preparado, pendiente de ejecución autorizada |
| Imágenes Docker en ACR | Pendiente de publicación |
| Container Apps | Preparado en Bicep, pendiente de validación/despliegue |
| PostgreSQL Azure | Preparado en Bicep, red e inicialización pendientes |
| Frontend URL/CORS | Pendiente de dominios reales |
| Static Web Apps | Alternativa evaluada, no seleccionada |
| Ollama Azure | Pendiente de decisión y costos |
| RabbitMQ/balanceador | Pendiente de integración del equipo |
| Alta disponibilidad/failover | Declarado como pendiente; no probado |
