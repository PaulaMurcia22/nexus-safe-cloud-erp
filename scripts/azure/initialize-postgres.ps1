[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$HostName,
    [string]$Database = 'nexuserpm',
    [string]$User = 'nexusadmin',
    [string]$ScriptsPath = 'database/scripts',
    [switch]$AllowExistingSchema,
    [switch]$Execute
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
if (-not $Execute) { throw 'Modo seguro: agrega -Execute únicamente para una base nueva autorizada.' }
if (-not (Get-Command psql -ErrorAction SilentlyContinue)) { throw 'psql no está disponible en PATH.' }
if (-not (Test-Path -LiteralPath 'database/docker-init/01_init_schema.sql')) { throw 'No se encontró el orquestador SQL.' }
if (-not (Test-Path -LiteralPath $ScriptsPath)) { throw "No existe la carpeta SQL: $ScriptsPath" }
$securePassword = Read-Host 'Contraseña PostgreSQL' -AsSecureString
$passwordPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
$env:PGPASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPtr)
[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPtr)
$env:PGSSLMODE = 'require'
try {
    psql --host $HostName --port 5432 --username $User --dbname $Database --command "SELECT 1" --quiet
    if ($LASTEXITCODE -ne 0) { throw 'No fue posible conectarse a PostgreSQL.' }
    $existing = psql --host $HostName --port 5432 --username $User --dbname $Database --tuples-only --no-align --command "SELECT to_regclass('public.users')"
    if ($existing.Trim() -and -not $AllowExistingSchema) { throw 'La base ya contiene public.users. Usa una base nueva o -AllowExistingSchema después de revisar los scripts.' }
    psql --host $HostName --port 5432 --username $User --dbname $Database --set ON_ERROR_STOP=on --file database/docker-init/01_init_schema.sql
    if ($LASTEXITCODE -ne 0) { throw 'La inicialización SQL falló.' }
} finally {
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    Remove-Item Env:PGSSLMODE -ErrorAction SilentlyContinue
}
Write-Host 'Estructura 01-18 aplicada. No se ejecutó el seed 90 ni se cargaron datos demo.'
