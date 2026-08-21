#!/bin/bash
# 服务器手动部署脚本（在服务器上执行）
# 后续每次更新代码后，只需执行: bash deploy.sh

set -e

cd /root/bom-manager/projects

echo "===== 1. 拉取最新代码 ====="
git pull origin main

echo "===== 2. 更新数据库表结构 ====="
echo "（使用 IF NOT EXISTS，不会删除已有数据）"
mysql -u root bom_system < bom_system_schema.sql

echo "===== 3. 安装依赖 ====="
pnpm install

echo "===== 4. 构建 ====="
pnpm run build

echo "===== 5. 重启服务 ====="
pm2 restart bom-manager || pm2 start pnpm --name "bom-manager" -- run start

echo ""
echo "✅ 部署完成！"