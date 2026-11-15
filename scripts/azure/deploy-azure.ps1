[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$ResourceGroup,
    [string]$Location = 'eastus',
    [string]$ParametersFile = 'infra/azure/main.dev.bicepparam',
    [switch]$Execute
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
if (-not $Execute) { throw 'Modo seguro: agrega -Execute solo después de revisar costos y obtener autorización.' }
if (-not (Get-Command az -ErrorAction SilentlyContinue)) { throw 'Azure CLI no está disponible en PATH.' }
if (-not (Test-Path -LiteralPath $ParametersFile)) { throw "No existe el archivo de parámetros: $ParametersFile" }
az account show --output table
if ($LASTEXITCODE -ne 0) { throw 'Inicia sesión con az login antes de continuar.' }
$toPlain = {
    param([Security.SecureString]$Value)
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Value)
    try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}
$confirmation = Read-Host "Escribe CREAR para desplegar en el grupo '$ResourceGroup'"
if ($confirmation -cne 'CREAR') { throw 'Operación cancelada.' }

$secureFile = Join-Path ([System.IO.Path]::GetTempPath()) "nexus-azure-secrets-$([guid]::NewGuid()).json"
try {
    [ordered]@{
        postgresAdminPassword = & $toPlain (Read-Host 'Contraseña PostgreSQL' -AsSecureString)
        sessionSecret = & $toPlain (Read-Host 'SESSION_SECRET (mínimo 32 caracteres)' -AsSecureString)
        adminPassword = & $toPlain (Read-Host 'Contraseña ADMIN' -AsSecureString)
        demoUsersPassword = & $toPlain (Read-Host 'Contraseña usuarios demo' -AsSecureString)
    } | ConvertTo-Json | Set-Content -LiteralPath $secureFile -Encoding utf8
    Write-Host 'Validando el template contra Azure...'
    az deployment group validate --resource-group $ResourceGroup --template-file infra/azure/main.bicep --parameters $ParametersFile "@$secureFile" --parameters location=$Location
    if ($LASTEXITCODE -ne 0) { throw 'La validación Azure falló.' }
    $final = Read-Host 'Escribe DESPLEGAR para crear recursos'
    if ($final -cne 'DESPLEGAR') { throw 'Despliegue cancelado después de validar.' }
    az deployment group create --resource-group $ResourceGroup --template-file infra/azure/main.bicep --parameters $ParametersFile "@$secureFile" --parameters location=$Location
    if ($LASTEXITCODE -ne 0) { throw 'El despliegue Azure falló.' }
} finally {
    if (Test-Path -LiteralPath $secureFile) { Remove-Item -LiteralPath $secureFile -Force }
}
