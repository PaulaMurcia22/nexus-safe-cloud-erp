[CmdletBinding()]
param(
    [string]$TemplateFile = 'infra/azure/main.bicep',
    [string]$ParametersFile = 'infra/azure/main.dev.bicepparam'
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
    throw 'Azure CLI no está instalado o no está disponible en PATH.'
}
if (-not (Test-Path -LiteralPath $TemplateFile)) { throw "No existe el template: $TemplateFile" }
if (-not (Test-Path -LiteralPath $ParametersFile)) { throw "No existe el archivo de parámetros: $ParametersFile" }

Write-Host 'Validación local de sintaxis Bicep...'
az bicep build --file $TemplateFile
if ($LASTEXITCODE -ne 0) { throw 'La compilación Bicep falló.' }

az bicep lint --file $TemplateFile
if ($LASTEXITCODE -ne 0) { throw 'El lint Bicep falló.' }

if ($TemplateFile -eq 'infra/azure/main.bicep' -and (Test-Path -LiteralPath 'infra/azure/acr-bootstrap.bicep')) {
    az bicep build --file infra/azure/acr-bootstrap.bicep
    if ($LASTEXITCODE -ne 0) { throw 'La compilación de acr-bootstrap.bicep falló.' }
    az bicep lint --file infra/azure/acr-bootstrap.bicep
    if ($LASTEXITCODE -ne 0) { throw 'El lint de acr-bootstrap.bicep falló.' }
}

Write-Host 'Compilación y lint Bicep correctos. No se creó ningún recurso.'
