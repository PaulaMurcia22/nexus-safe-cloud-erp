param environmentId string
param registryLoginServer string
param backendImage string
param frontendImage string
param backendMinReplicas int
param backendMaxReplicas int
param frontendMinReplicas int
param frontendMaxReplicas int
param postgresHost string
param postgresDatabaseName string
param postgresAdminLogin string
@secure()
param postgresAdminPassword string
@secure()
param sessionSecret string
@secure()
param adminPassword string
@secure()
param demoUsersPassword string
param enableDemoData bool
param ollamaBaseUrl string
param ollamaModel string

var backendName = 'nexus-backend'
var frontendName = 'nexus-frontend'

resource backend 'Microsoft.App/containerApps@2023-05-01' = {
  name: backendName
  location: resourceGroup().location
  properties: {
    workloadProfileName: 'Consumption'
    managedEnvironmentId: environmentId
    configuration: {
      registries: [{ server: registryLoginServer, identity: 'system' }]
      ingress: { external: true, targetPort: 3000, transport: 'http', allowInsecure: false }
      secrets: [
        { name: 'session-secret', value: sessionSecret }
        { name: 'postgres-password', value: postgresAdminPassword }
        { name: 'admin-password', value: adminPassword }
        { name: 'demo-users-password', value: demoUsersPassword }
      ]
    }
    template: {
      containers: [{
        name: backendName
        image: backendImage
        env: [
          { name: 'NODE_ENV', value: 'production' }
          { name: 'PORT', value: '3000' }
          { name: 'FRONTEND_ORIGIN', value: 'https://REEMPLAZAR_FRONTEND_HOST' }
          { name: 'SESSION_SECRET', secretRef: 'session-secret' }
          { name: 'DB_HOST', value: postgresHost }
          { name: 'DB_PORT', value: '5432' }
          { name: 'DB_NAME', value: postgresDatabaseName }
          { name: 'DB_USER', value: postgresAdminLogin }
          { name: 'DB_PASSWORD', secretRef: 'postgres-password' }
          { name: 'ADMIN_EMAIL', value: 'REEMPLAZAR_ADMIN_EMAIL' }
          { name: 'ADMIN_PASSWORD', secretRef: 'admin-password' }
          { name: 'ADMIN_NAME', value: 'Administrador' }
          { name: 'DEMO_USERS_PASSWORD', secretRef: 'demo-users-password' }
          { name: 'LOAD_DEMO_DATA', value: enableDemoData ? 'true' : 'false' }
          { name: 'OLLAMA_BASE_URL', value: ollamaBaseUrl }
          { name: 'OLLAMA_MODEL', value: ollamaModel }
        ]
        resources: { cpu: 0.5, memory: '1Gi' }
      }]
      scale: {
        minReplicas: backendMinReplicas
        maxReplicas: backendMaxReplicas
        rules: [{ name: 'http-scale', http: { metadata: { concurrentRequests: '50' } } }]
      }
    }
  }
  identity: { type: 'SystemAssigned' }
}

resource frontend 'Microsoft.App/containerApps@2023-05-01' = {
  name: frontendName
  location: resourceGroup().location
  properties: {
    workloadProfileName: 'Consumption'
    managedEnvironmentId: environmentId
    configuration: {
      ingress: { external: true, targetPort: 80, transport: 'http', allowInsecure: false }
      registries: [{ server: registryLoginServer, identity: 'system' }]
    }
    template: {
      containers: [{ name: frontendName, image: frontendImage, resources: { cpu: 0.25, memory: '0.5Gi' } }]
      scale: { minReplicas: frontendMinReplicas, maxReplicas: frontendMaxReplicas }
    }
  }
  identity: { type: 'SystemAssigned' }
}

output frontendUrl string = 'https://${frontend.properties.configuration.ingress.fqdn}'
output backendUrl string = 'https://${backend.properties.configuration.ingress.fqdn}'
output frontendPrincipalId string = frontend.identity.principalId
output backendPrincipalId string = backend.identity.principalId
