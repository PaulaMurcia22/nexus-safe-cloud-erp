targetScope = 'resourceGroup'

@description('Nombre único del despliegue y prefijo de recursos.')
param namePrefix string = 'nexus-dev'
@description('Región de Azure para el entorno propuesto.')
param location string = resourceGroup().location
@description('Etiqueta de entorno.')
param environmentName string = 'dev'
@description('Correo del administrador inicial del ERP.')
param adminEmail string
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
@secure()
param rabbitmqPassword string
param backendMinReplicas int = 1
param backendMaxReplicas int = 2
param frontendMinReplicas int = 1
param frontendMaxReplicas int = 2
param enableDemoData bool = false
param ollamaBaseUrl string = 'https://ollama.com'
param ollamaModel string = 'gemma4:31b'
@secure()
param ollamaApiKey string = ''

var uniqueSuffix = uniqueString(resourceGroup().id, namePrefix)
var acrName = toLower(replace('${namePrefix}${uniqueSuffix}', '-', ''))
var logName = '${namePrefix}-logs-${uniqueSuffix}'
var envName = '${namePrefix}-${environmentName}-aca-${uniqueSuffix}'
var postgresName = toLower('${namePrefix}-pg-${uniqueSuffix}')
var vnetName = '${namePrefix}-vnet-${uniqueSuffix}'
var privateDnsName = 'private.postgres.database.azure.com'

resource network 'Microsoft.Network/virtualNetworks@2023-09-01' = {
  name: vnetName
  location: location
  properties: {
    addressSpace: { addressPrefixes: ['10.42.0.0/16'] }
    subnets: [
      { name: 'aca-infra', properties: { addressPrefix: '10.42.0.0/23', delegations: [{ name: 'container-apps', properties: { serviceName: 'Microsoft.App/environments' } }] } }
      { name: 'postgres', properties: { addressPrefix: '10.42.2.0/28', delegations: [{ name: 'postgres', properties: { serviceName: 'Microsoft.DBforPostgreSQL/flexibleServers' } }] } }
    ]
  }
}

resource privateDns 'Microsoft.Network/privateDnsZones@2020-06-01' = {
  name: privateDnsName
  location: 'global'
}

resource dnsLink 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2020-06-01' = {
  parent: privateDns
  name: '${vnetName}-link'
  location: 'global'
  properties: { registrationEnabled: false, virtualNetwork: { id: network.id } }
}

module logs './modules/log-analytics.bicep' = {
  name: 'logs'
  params: { name: logName, location: location }
}

module registry './modules/acr.bicep' = {
  name: 'registry'
  params: { name: acrName, location: location }
}

resource acrPullIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: '${namePrefix}-acr-pull-${uniqueSuffix}'
  location: location
}

module acrPullRole './modules/acr-pull-role.bicep' = {
  name: 'acr-pull-role'
  dependsOn: [registry]
  params: {
    registryName: acrName
    principalId: acrPullIdentity.properties.principalId
  }
}

module postgres './modules/postgres.bicep' = {
  name: 'postgres'
  dependsOn: [network, dnsLink]
  params: {
    name: postgresName
    location: location
    administratorLogin: postgresAdminLogin
    administratorPassword: postgresAdminPassword
    databaseName: postgresDatabaseName
    skuName: postgresSkuName
    version: postgresVersion
    postgresSubnetId: resourceId('Microsoft.Network/virtualNetworks/subnets', vnetName, 'postgres')
    privateDnsZoneId: privateDns.id
  }
}

module containerEnvironment './modules/container-environment.bicep' = {
  name: 'container-environment'
  dependsOn: [network]
  params: { name: envName, location: location, logWorkspaceId: logs.outputs.workspaceId, infrastructureSubnetId: resourceId('Microsoft.Network/virtualNetworks/subnets', vnetName, 'aca-infra') }
}

module apps './modules/container-apps.bicep' = {
  name: 'container-apps'
  dependsOn: [acrPullRole]
  params: {
    environmentId: containerEnvironment.outputs.environmentId
    location: location
    registryLoginServer: registry.outputs.loginServer
    acrPullIdentityId: acrPullIdentity.id
    backendImage: backendImage
    frontendImage: frontendImage
    backendMinReplicas: backendMinReplicas
    backendMaxReplicas: backendMaxReplicas
    frontendMinReplicas: frontendMinReplicas
    frontendMaxReplicas: frontendMaxReplicas
    postgresHost: postgres.outputs.fullyQualifiedDomainName
    adminEmail: adminEmail
    rabbitmqPassword: rabbitmqPassword
    postgresDatabaseName: postgresDatabaseName
    postgresAdminLogin: postgresAdminLogin
    postgresAdminPassword: postgresAdminPassword
    sessionSecret: sessionSecret
    adminPassword: adminPassword
    demoUsersPassword: demoUsersPassword
    enableDemoData: enableDemoData
    ollamaBaseUrl: ollamaBaseUrl
    ollamaModel: ollamaModel
    ollamaApiKey: ollamaApiKey
  }
}

output containerEnvironmentName string = envName
output containerRegistryName string = acrName
output postgresServerName string = postgresName
output frontendUrl string = apps.outputs.frontendUrl
output backendInternalFqdn string = apps.outputs.backendInternalFqdn
