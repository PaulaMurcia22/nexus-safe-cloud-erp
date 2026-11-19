using './main.bicep'

param namePrefix = 'nexus-dev'
param environmentName = 'dev'
param location = 'brazilsouth'
param adminEmail = 'paus2207@gmail.com'

// Sustituir por etiquetas de imágenes publicadas en ACR/CI antes de validar un despliegue.
param backendImage = 'nexusdev4hrawjh6awtbc.azurecr.io/nexus-backend:dev-20261118-r4'
param frontendImage = 'nexusdev4hrawjh6awtbc.azurecr.io/nexus-frontend:dev-20261118-r3'

param postgresAdminLogin = 'nexusadmin'
param postgresDatabaseName = 'nexuserpm'
param postgresSkuName = 'Standard_B1ms'
param postgresVersion = '16'
param backendMinReplicas = 1
param backendMaxReplicas = 1
param frontendMinReplicas = 0
param frontendMaxReplicas = 1
param enableDemoData = true
param ollamaBaseUrl = 'https://ollama.com'
param ollamaModel = 'gemma4:31b'

// Los parámetros secure los solicita infra/azure/deploy.ps1 durante el despliegue.
// No se incluyen contraseñas ni SESSION_SECRET en este archivo.
param postgresAdminPassword = readEnvironmentVariable('NEXUS_POSTGRES_ADMIN_PASSWORD')
param sessionSecret = readEnvironmentVariable('NEXUS_SESSION_SECRET')
param adminPassword = readEnvironmentVariable('NEXUS_ADMIN_PASSWORD')
param demoUsersPassword = readEnvironmentVariable('NEXUS_DEMO_USERS_PASSWORD')
param rabbitmqPassword = readEnvironmentVariable('NEXUS_RABBITMQ_PASSWORD')
