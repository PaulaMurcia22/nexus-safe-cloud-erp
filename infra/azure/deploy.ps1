param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('Validate', 'Deploy')]
  [string] $Mode,

  [string] $ResourceGroup = 'nexus-student-dev',

  [switch] $UseLocalEnv
)

$ErrorActionPreference = 'Stop'
$parameterFile = Join-Path $PSScriptRoot 'main.dev.bicepparam'
$templateFile = Join-Path $PSScriptRoot 'main.bicep'
$parameterContents = Get-Content -LiteralPath $parameterFile -Raw
if ($parameterContents -match 'REEMPLAZAR') {
  throw "Completa primero los valores REEMPLAZAR de $parameterFile."
}

function Read-SecretValue([string] $Prompt, [int] $MinimumLength = 1) {
  $secure = Read-Host $Prompt -AsSecureString
  $pointer = [IntPtr]::Zero
  try {
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    $value = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    if ($value.Length -lt $MinimumLength) {
      throw "El secreto debe tener al menos $MinimumLength caracteres."
    }
    return $value
  }
  finally {
    if ($pointer -ne [IntPtr]::Zero) {
      [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    }
    $secure.Dispose()
  }
}

$secrets = @{}
if ($UseLocalEnv) {
  $repositoryRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
  $localEnvFile = Join-Path $repositoryRoot '.env'
  if (-not (Test-Path -LiteralPath $localEnvFile)) {
    throw "No existe $localEnvFile para obtener los secretos locales."
  }
  function Get-LocalEnvValue([string] $Name) {
    $line = Get-Content -LiteralPath $localEnvFile | Where-Object { $_ -match "^$Name=" } | Select-Object -First 1
    if ($null -eq $line) { throw "Falta $Name en $localEnvFile." }
    $value = $line.Substring($Name.Length + 1).Trim()
    if ($value.Length -ge 2 -and (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'")))) {
      $value = $value.Substring(1, $value.Length - 2)
    }
    if ([string]::IsNullOrWhiteSpace($value)) { throw "$Name está vacío en $localEnvFile." }
    return $value
  }
  $localDatabasePassword = Get-LocalEnvValue 'DB_PASSWORD'
  $databaseCategories = [int]($localDatabasePassword -cmatch '[A-Z]') + [int]($localDatabasePassword -cmatch '[a-z]') + [int]($localDatabasePassword -match '\d') + [int]($localDatabasePassword -match '[^A-Za-z0-9]')
  if ($localDatabasePassword.Length -ge 12 -and $databaseCategories -ge 3) {
    $secrets.postgresAdminPassword = $localDatabasePassword
  }
  else {
    $databaseBytes = [byte[]]::new(32)
    [System.Security.Cryptography.RandomNumberGenerator]::Fill($databaseBytes)
    $secrets.postgresAdminPassword = 'NexusDb' + [Convert]::ToHexString($databaseBytes).ToLowerInvariant() + '7!'
    [Array]::Clear($databaseBytes, 0, $databaseBytes.Length)
    Write-Output 'DB_PASSWORD local no cumple el mínimo; generé una contraseña fuerte solo para PostgreSQL en Azure.'
  }
  $secrets.sessionSecret = Get-LocalEnvValue 'SESSION_SECRET'
  $secrets.adminPassword = Get-LocalEnvValue 'ADMIN_PASSWORD'
  $secrets.demoUsersPassword = Get-LocalEnvValue 'DEMO_USERS_PASSWORD'
  $randomBytes = [byte[]]::new(24)
  [System.Security.Cryptography.RandomNumberGenerator]::Fill($randomBytes)
  $secrets.rabbitmqPassword = [Convert]::ToHexString($randomBytes)
  [Array]::Clear($randomBytes, 0, $randomBytes.Length)
  if ($secrets.postgresAdminPassword.Length -lt 12) { throw 'La contraseña PostgreSQL de Azure debe tener al menos 12 caracteres.' }
  if ($secrets.sessionSecret.Length -lt 32) { throw 'SESSION_SECRET debe tener al menos 32 caracteres.' }
  if ($secrets.adminPassword.Length -lt 12) { throw 'ADMIN_PASSWORD debe tener al menos 12 caracteres.' }
  if ($secrets.demoUsersPassword.Length -lt 12) { throw 'DEMO_USERS_PASSWORD debe tener al menos 12 caracteres.' }
}
else {
  $secrets = @{
    postgresAdminPassword = Read-SecretValue 'Contraseña PostgreSQL' 12
    sessionSecret = Read-SecretValue 'SESSION_SECRET (mínimo 32 caracteres)' 32
    adminPassword = Read-SecretValue 'Contraseña del administrador ERP' 12
    demoUsersPassword = Read-SecretValue 'Contraseña de usuarios demo' 12
    rabbitmqPassword = Read-SecretValue 'Contraseña RabbitMQ (solo letras y números)' 16
  }
}
if ($secrets.rabbitmqPassword -notmatch '^[a-zA-Z0-9]+$') {
  throw 'La contraseña de RabbitMQ debe contener solo letras y números para formar una URL AMQP válida.'
}

$parameterEnvironment = @{
  NEXUS_POSTGRES_ADMIN_PASSWORD = $secrets.postgresAdminPassword
  NEXUS_SESSION_SECRET = $secrets.sessionSecret
  NEXUS_ADMIN_PASSWORD = $secrets.adminPassword
  NEXUS_DEMO_USERS_PASSWORD = $secrets.demoUsersPassword
  NEXUS_RABBITMQ_PASSWORD = $secrets.rabbitmqPassword
}
$previousEnvironment = @{}
foreach ($name in $parameterEnvironment.Keys) {
  $previousEnvironment[$name] = [Environment]::GetEnvironmentVariable($name, 'Process')
  [Environment]::SetEnvironmentVariable($name, $parameterEnvironment[$name], 'Process')
}

try {
  az bicep build --file $templateFile
  if ($LASTEXITCODE -ne 0) { throw 'No se pudo compilar la plantilla Bicep.' }

  $operation = if ($Mode -eq 'Validate') { 'validate' } else { 'create' }
  az deployment group $operation `
    --name "nexus-dev-$operation" `
    --resource-group $ResourceGroup `
    --template-file $templateFile `
    --parameters $parameterFile
  if ($LASTEXITCODE -ne 0) { throw "Azure CLI terminó con código $LASTEXITCODE." }
}
finally {
  foreach ($name in $parameterEnvironment.Keys) {
    [Environment]::SetEnvironmentVariable($name, $previousEnvironment[$name], 'Process')
  }
  $secrets.Clear()
  $parameterEnvironment.Clear()
}
