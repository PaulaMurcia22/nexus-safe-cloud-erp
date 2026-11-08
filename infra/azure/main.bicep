targetScope = 'resourceGroup'

@description('Nombre único del despliegue y prefijo de recursos.')
param namePrefix string = 'nexus-dev'
@description('Región de Azure para el entorno propuesto.')
param location string = resourceGroup().location
@description('Etiqueta de entorno.')
param environmentName string = 'dev'
@description('Imagen completa del backend ya publicada en ACR.')
param backendImage string
@description('Imagen completa del frontend ya publicada en ACR.')
param frontendImage string
@secure()
@description('Contraseña del administrador de PostgreSQL Flexible Server.')
param postgresAdminPassword string
@secure()
@description('Secreto de sesión del backend; mínimo 32 caracteres.')
param sessionSecret string
@secure()
@description('Contraseña inicial del administrador funcional del ERP.')
param adminPassword string
@secure()
@description('Contraseña de usuarios sintéticos de demostración.')
param demoUsersPassword string
param postgresAdminLogin string = 'nexusadmin'
param postgresDatabaseName string = 'nexuserpm'
param postgresSkuName string = 'Standard_B1ms'
param postgresVersion string = '16'
param backendMinReplicas int = 1
param backendMaxReplicas int = 2
param frontendMinReplicas int = 1
param frontendMaxReplicas int = 2
param enableDemoData bool = false
param ollamaBaseUrl string = 'http://localhost:11434'
param ollamaModel string = 'qwen2.5:3b'

var uniqueSuffix = uniqueString(resourceGroup().id, namePrefix)
var acrName = toLower(replace('${namePrefix}${uniqueSuffix}', '-', ''))
var logName = '${namePrefix}-logs-${uniqueSuffix}'
var envName = '${namePrefix}-aca-${uniqueSuffix}'
var postgresName = toLower('${namePrefix}-pg-${uniqueSuffix}')

module logs './modules/log-analytics.bicep' = {
  name: 'logs'
  params: { name: logName, location: location }
}

module registry './modules/acr.bicep' = {
  name: 'registry'
  params: { name: acrName, location: location }
}

module postgres './modules/postgres.bicep' = {
  name: 'postgres'
  params: {
    name: postgresName
    location: location
    administratorLogin: postgresAdminLogin
    administratorPassword: postgresAdminPassword
    databaseName: postgresDatabaseName
    skuName: postgresSkuName
    version: postgresVersion
  }
}

module containerEnvironment './modules/container-environment.bicep' = {
  name: 'container-environment'
  params: { name: envName, location: location, logWorkspaceId: logs.outputs.workspaceId }
}

module apps './modules/container-apps.bicep' = {
  name: 'container-apps'
  params: {
    environmentId: containerEnvironment.outputs.environmentId
    registryLoginServer: registry.outputs.loginServer
    backendImage: backendImage
    frontendImage: frontendImage
    backendMinReplicas: backendMinReplicas
    backendMaxReplicas: backendMaxReplicas
    frontendMinReplicas: frontendMinReplicas
    frontendMaxReplicas: frontendMaxReplicas
    postgresHost: postgres.outputs.fullyQualifiedDomainName
    postgresDatabaseName: postgresDatabaseName
    postgresAdminLogin: postgresAdminLogin
    postgresAdminPassword: postgresAdminPassword
    sessionSecret: sessionSecret
    adminPassword: adminPassword
    demoUsersPassword: demoUsersPassword
    enableDemoData: enableDemoData
    ollamaBaseUrl: ollamaBaseUrl
    ollamaModel: ollamaModel
  }
}

module backendAcrPull './modules/acr-pull-role.bicep' = {
  name: 'backend-acr-pull'
  params: {
    registryName: acrName
    principalId: apps.outputs.backendPrincipalId
  }
}

module frontendAcrPull './modules/acr-pull-role.bicep' = {
  name: 'frontend-acr-pull'
  params: {
    registryName: acrName
    principalId: apps.outputs.frontendPrincipalId
  }
}

output containerEnvironmentName string = envName
output containerRegistryName string = acrName
output postgresServerName string = postgresName
output frontendUrl string = apps.outputs.frontendUrl
output backendUrl string = apps.outputs.backendUrl
