param name string
param location string
param logWorkspaceId string

resource environment 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: name
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: { customerId: reference(logWorkspaceId, '2023-09-01').customerId, sharedKey: reference(logWorkspaceId, '2023-09-01', 'Full').sharedKeys.primarySharedKey }
    }
  }
}

output environmentId string = environment.id
