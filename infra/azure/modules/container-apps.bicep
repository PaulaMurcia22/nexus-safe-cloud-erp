param environmentId string
param location string
param registryLoginServer string
param acrPullIdentityId string
param backendImage string
param frontendImage string
param backendMinReplicas int
param backendMaxReplicas int
param frontendMinReplicas int
param frontendMaxReplicas int
param postgresHost string
param adminEmail string
@secure()
param rabbitmqPassword string
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
@secure()
param ollamaApiKey string = ''

var backendName = 'nexus-backend'
var frontendName = 'nexus-frontend'
var rabbitmqName = 'nexus-rabbitmq'

resource rabbitmq 'Microsoft.App/containerApps@2023-05-01' = {
  name: rabbitmqName
  location: location
  properties: {
    managedEnvironmentId: environmentId
    configuration: {
      ingress: { external: false, targetPort: 5672, transport: 'tcp', allowInsecure: false }
      secrets: [{ name: 'rabbitmq-password', value: rabbitmqPassword }]
    }
    template: {
      containers: [{
        name: rabbitmqName
        image: 'rabbitmq:3.13-management'
        env: [
          { name: 'RABBITMQ_DEFAULT_USER', value: 'nexus' }
          { name: 'RABBITMQ_DEFAULT_PASS', secretRef: 'rabbitmq-password' }
        ]
        resources: { cpu: json('0.25'), memory: '0.5Gi' }
      }]
      scale: { minReplicas: 1, maxReplicas: 1 }
    }
  }
}

resource backend 'Microsoft.App/containerApps@2023-05-01' = {
  name: backendName
  location: location
  properties: {
    managedEnvironmentId: environmentId
    configuration: {
      registries: [{ server: registryLoginServer, identity: acrPullIdentityId }]
      ingress: { external: false, targetPort: 3000, transport: 'http', allowInsecure: false }
      secrets: concat([
        { name: 'session-secret', value: sessionSecret }
        { name: 'postgres-password', value: postgresAdminPassword }
        { name: 'admin-password', value: adminPassword }
        { name: 'demo-users-password', value: demoUsersPassword }
        { name: 'rabbitmq-url', value: 'amqp://nexus:${rabbitmqPassword}@nexus-rabbitmq:5672' }
      ], empty(ollamaApiKey) ? [] : [{ name: 'ollama-api-key', value: ollamaApiKey }])
    }
    template: {
      containers: [{
        name: backendName
        image: backendImage
        env: concat([
          { name: 'NODE_ENV', value: 'production' }
          { name: 'PORT', value: '3000' }
          { name: 'FRONTEND_ORIGIN', value: 'https://${frontend.properties.configuration.ingress.fqdn}' }
          { name: 'SESSION_SECRET', secretRef: 'session-secret' }
          { name: 'DB_HOST', value: postgresHost }
          { name: 'DB_PORT', value: '5432' }
          { name: 'DB_NAME', value: postgresDatabaseName }
          { name: 'DB_USER', value: postgresAdminLogin }
          { name: 'DB_PASSWORD', secretRef: 'postgres-password' }
          { name: 'DB_SSL_MODE', value: 'require' }
          { name: 'AUTO_MIGRATE_DB', value: 'true' }
          { name: 'ADMIN_EMAIL', value: adminEmail }
          { name: 'ADMIN_PASSWORD', secretRef: 'admin-password' }
          { name: 'ADMIN_NAME', value: 'Administrador' }
          { name: 'DEMO_USERS_PASSWORD', secretRef: 'demo-users-password' }
          { name: 'LOAD_DEMO_DATA', value: enableDemoData ? 'true' : 'false' }
          { name: 'OLLAMA_BASE_URL', value: ollamaBaseUrl }
          { name: 'OLLAMA_MODEL', value: ollamaModel }
          { name: 'RABBITMQ_ENABLED', value: 'true' }
          { name: 'RABBITMQ_URL', secretRef: 'rabbitmq-url' }
        ], empty(ollamaApiKey) ? [] : [{ name: 'OLLAMA_API_KEY', secretRef: 'ollama-api-key' }])
        resources: { cpu: json('0.5'), memory: '1Gi' }
      }]
      scale: {
        minReplicas: backendMinReplicas
        maxReplicas: backendMaxReplicas
        rules: [{ name: 'http-scale', http: { metadata: { concurrentRequests: '50' } } }]
      }
    }
  }
  identity: {
    type: 'SystemAssigned, UserAssigned'
    userAssignedIdentities: { '${acrPullIdentityId}': {} }
  }
}

resource frontend 'Microsoft.App/containerApps@2023-05-01' = {
  name: frontendName
  location: location
  properties: {
    managedEnvironmentId: environmentId
    configuration: {
      ingress: { external: true, targetPort: 80, transport: 'http', allowInsecure: false }
      registries: [{ server: registryLoginServer, identity: acrPullIdentityId }]
    }
    template: {
      containers: [{ name: frontendName, image: frontendImage, resources: { cpu: json('0.25'), memory: '0.5Gi' } }]
      scale: { minReplicas: frontendMinReplicas, maxReplicas: frontendMaxReplicas }
    }
  }
  identity: {
    type: 'SystemAssigned, UserAssigned'
    userAssignedIdentities: { '${acrPullIdentityId}': {} }
  }
}

output frontendUrl string = 'https://${frontend.properties.configuration.ingress.fqdn}'
output backendInternalFqdn string = backend.properties.configuration.ingress.fqdn
output frontendPrincipalId string = frontend.identity.principalId
output backendPrincipalId string = backend.identity.principalId
