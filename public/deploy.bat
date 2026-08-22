@echo off
chcp 65001 >nul
cd /d C:\project\bom-manager-full

echo ============================================
echo  [1/5] Pulling latest code...
echo ============================================
git pull origin main
if %errorlevel% neq 0 (
    echo [ERROR] git pull failed, check network
    pause
    exit /b 1
)

echo ============================================
echo  [2/5] Updating database...
echo ============================================
mysql -u root -p123456 bom_system < bom_system_schema.sql
if %errorlevel% neq 0 (
    echo [WARN] DB update may have failed, continuing...
)

echo ============================================
echo  [3/5] Installing dependencies...
echo ============================================
call pnpm install
if %errorlevel% neq 0 (
    echo [ERROR] pnpm install failed
    pause
    exit /b 1
)

echo ============================================
echo  [4/5] Building project...
echo ============================================
call pnpm run build
if %errorlevel% neq 0 (
    echo [ERROR] build failed
    pause
    exit /b 1
)

echo ============================================
echo  [5/5] Starting server...
echo ============================================
taskkill /f /im node.exe /t 2>nul
start /B cmd /c "set MYSQL_PASSWORD=123456 && cd /d C:\project\bom-manager-full && pnpm run start"

echo ============================================
echo  DEPLOY COMPLETE!
echo ============================================
echo  Access at: http://localhost:5000
echo ============================================
pause