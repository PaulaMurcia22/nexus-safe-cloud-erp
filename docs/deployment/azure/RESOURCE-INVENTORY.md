# Inventario de recursos Azure

| Recurso | Template | Propósito | Estado | Costo/riesgo |
|---|---|---|---|---|
| Container Registry | `acr-bootstrap.bicep` / `acr.bicep` | Imágenes Docker | Preparado, no creado | Almacenamiento y operaciones |
| Container Apps Environment | `container-environment.bicep` | Entorno y logs | Preparado, no creado | Consumo y logs |
| Container App frontend | `container-apps.bicep` | Nginx/React | Preparado, no creado | Réplicas y CPU |
| Container App backend | `container-apps.bicep` | Express/TypeScript | Preparado, no creado | Réplicas, CPU y memoria |
| AcrPull | `acr-pull-role.bicep` | Pull con identidad administrada | Preparado, no creado | Requiere permisos IAM |
| PostgreSQL Flexible Server | `postgres.bicep` | Persistencia | Preparado, no creado | Compute, storage, backup y red |
| Base `nexuserpm` | `postgres.bicep` | Base ERP | Preparada, no creada | Inicialización separada |
| Log Analytics | `log-analytics.bicep` | Observabilidad | Preparado, no creado | Ingesta y retención |

La plantilla de desarrollo mantiene HA y backup georredundante deshabilitados. Esto reduce el costo inicial, pero no equivale a resiliencia productiva.
