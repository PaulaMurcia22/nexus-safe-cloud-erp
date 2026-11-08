param name string
param location string

resource workspace 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: name
  location: location
  properties: { retentionInDays: 30, sku: { name: 'PerGB2018' } }
}

output workspaceId string = workspace.id
