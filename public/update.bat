@echo off
echo 正在更新 BOM 管理系统文件...
echo.

set PROJECT_DIR=C:\project\bom-manager-full\projects

if not exist "%PROJECT_DIR%" (
    echo 错误：找不到项目目录 %PROJECT_DIR%
    echo 请修改本文件中的 PROJECT_DIR 路径后重试
    pause
    exit /b 1
)

echo 1. 更新 package.json
copy /Y package.json "%PROJECT_DIR%\package.json"

echo 2. 更新构建脚本
copy /Y build.mjs "%PROJECT_DIR%\scripts\build.mjs"

echo 3. 更新启动脚本
copy /Y start.mjs "%PROJECT_DIR%\scripts\start.mjs"

echo 4. 更新开发脚本
copy /Y dev.mjs "%PROJECT_DIR%\scripts\dev.mjs"

echo 5. 更新 .coze 配置
copy /Y .coze "%PROJECT_DIR%\.coze"

echo.
echo 更新完成！请执行以下命令启动项目：
echo.
echo cd /d C:\project\bom-manager-full\projects
echo pnpm install
echo pnpm run build
echo pnpm run start
echo.
pause