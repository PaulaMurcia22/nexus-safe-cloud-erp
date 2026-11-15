targetScope = 'resourceGroup'

@description('Prefijo de recursos del entorno.')
param namePrefix string = 'nexus-dev'
param location string = resourceGroup().location

var uniqueSuffix = uniqueString(resourceGroup().id, namePrefix)
var acrName = toLower(replace('${namePrefix}${uniqueSuffix}', '-', ''))

module registry './modules/acr.bicep' = {
  name: 'registry-bootstrap'
  params: { name: acrName, location: location }
}

output containerRegistryName string = acrName
output loginServer string = registry.outputs.loginServer
