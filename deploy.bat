@echo off
set MYSQL_PASSWORD=%1
if "%MYSQL_PASSWORD%"=="" set MYSQL_PASSWORD=123456

cd /d C:\project\bom-manager-full
echo [1/5] Pulling latest code...
git pull origin main
if %errorlevel% neq 0 (
    echo ERROR: git pull failed
    exit /b 1
)

echo [2/5] Updating database...
mysql -u root -p%MYSQL_PASSWORD% bom_system < bom_system_schema.sql
if %errorlevel% neq 0 (
    echo WARN: mysql import failed, continuing...
)

echo [3/5] Installing dependencies...
call pnpm install
if %errorlevel% neq 0 (
    echo ERROR: pnpm install failed
    exit /b 1
)

echo [4/5] Building project...
call pnpm run build
if %errorlevel% neq 0 (
    echo ERROR: pnpm run build failed
    exit /b 1
)

echo [5/5] Starting server...
taskkill /f /im node.exe /t 2>nul
start /B cmd /c "cd /d C:\project\bom-manager-full && pnpm run start"

echo Deploy completed successfully!