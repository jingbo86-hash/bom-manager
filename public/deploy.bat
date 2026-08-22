@echo off
chcp 65001 >nul
title BOM管理系统 - 自动部署
cd /d C:\project\bom-manager-full

echo ============================================
echo   BOM管理系统 - 自动部署脚本
echo ============================================
echo.

echo [1/5] 拉取最新代码...
git pull origin main
if %errorlevel% neq 0 (
    echo ╳ 拉取代码失败，请检查网络连接
    pause
    exit /b 1
)
echo √ 代码已更新
echo.

echo [2/5] 更新数据库结构...
mysql -u root -p123456 bom_system < bom_system_schema.sql
echo √ 数据库已更新
echo.

echo [3/5] 安装依赖...
call pnpm install
if %errorlevel% neq 0 (
    echo ╳ 安装依赖失败
    pause
    exit /b 1
)
echo √ 依赖安装完成
echo.

echo [4/5] 构建项目...
call pnpm run build
if %errorlevel% neq 0 (
    echo ╳ 构建失败
    pause
    exit /b 1
)
echo √ 构建完成
echo.

echo [5/5] 启动服务...
taskkill /f /im node.exe /t 2>nul
start /B cmd /c "cd /d C:\project\bom-manager-full && pnpm run start"
echo √ 服务已启动
echo.

echo ============================================
echo   部署完成！
echo   访问地址: http://localhost:5000
echo ============================================
echo.
pause