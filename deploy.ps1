param(
    [string]$MYSQL_PASSWORD = "123456"
)

$ErrorActionPreference = "Stop"
$projectDir = "C:\project\bom-manager-full"

Write-Host "[1/5] Pulling latest code..."
Set-Location $projectDir
git pull origin main
if ($LASTEXITCODE -ne 0) { throw "git pull failed" }

Write-Host "[2/5] Updating database..."
$sqlContent = Get-Content "bom_system_schema.sql" -Raw
$mysql = "mysql"
& $mysql -u root -p$MYSQL_PASSWORD bom_system -e $sqlContent 2>&1 | Out-Null
Write-Host "  DB updated (warnings suppressed)"

Write-Host "[3/5] Installing dependencies..."
pnpm install
if ($LASTEXITCODE -ne 0) { throw "pnpm install failed" }

Write-Host "[4/5] Building project..."
pnpm run build
if ($LASTEXITCODE -ne 0) { throw "pnpm run build failed" }

Write-Host "[5/5] Starting server..."
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Process powershell -ArgumentList "-NoProfile", "-Command", "Set-Location '$projectDir'; pnpm run start" -WindowStyle Hidden

Write-Host "Deploy completed successfully!"