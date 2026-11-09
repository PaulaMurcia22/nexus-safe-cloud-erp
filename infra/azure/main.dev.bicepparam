using './main.bicep'

param namePrefix = 'nexus-dev'
param environmentName = 'dev'
param location = 'eastus'

// Sustituir por etiquetas de imágenes publicadas en ACR/CI antes de validar un despliegue.
param backendImage = 'REEMPLAZAR.azurecr.io/nexus-backend:dev'
param frontendImage = 'REEMPLAZAR.azurecr.io/nexus-frontend:dev'

param postgresAdminLogin = 'nexusadmin'
param postgresDatabaseName = 'nexuserpm'
param postgresSkuName = 'Standard_B1ms'
param postgresVersion = '16'
param backendMinReplicas = 1
param backendMaxReplicas = 2
param frontendMinReplicas = 1
param frontendMaxReplicas = 2
param enableDemoData = false
param ollamaBaseUrl = 'http://localhost:11434'
param ollamaModel = 'qwen2.5:3b'

// Los parámetros secure se solicitan por CLI o por un sistema de secretos.
// No se incluyen contraseñas ni SESSION_SECRET en este archivo.
