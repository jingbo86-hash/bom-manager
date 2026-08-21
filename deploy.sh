#!/bin/bash
# 服务器初始化部署脚本（在服务器上执行一次）
# 使用方法: ssh root@123.57.229.31 'bash -s' < deploy.sh

set -e

echo "===== 1. 安装 Node.js 18 ====="
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs
node --version
npm --version

echo "===== 2. 安装 pnpm ====="
npm install -g pnpm

echo "===== 3. 安装 PM2（进程管理） ====="
npm install -g pm2

echo "===== 4. 安装 MySQL 8.0 ====="
apt-get install -y mysql-server
systemctl start mysql
systemctl enable mysql

echo "===== 5. 创建数据库 ====="
mysql -u root <<SQL
CREATE DATABASE IF NOT EXISTS bom_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '';
FLUSH PRIVILEGES;
SQL

echo "===== 6. 克隆项目 ====="
mkdir -p /root/bom-manager
cd /root/bom-manager

# 替换为你的 Git 仓库地址
git clone https://github.com/你的用户名/bom-manager.git .
cd /root/bom-manager/projects

echo "===== 7. 导入数据库表结构 ====="
mysql -u root bom_system < bom_system_schema.sql

echo "===== 8. 安装依赖并构建 ====="
pnpm install
pnpm run build

echo "===== 9. 启动服务 ====="
pm2 start pnpm --name "bom-manager" -- run start
pm2 save
pm2 startup

echo ""
echo "✅ 部署完成！访问 http://123.57.229.31:5000"
echo ""
echo "后续代码推送后，会自动通过 GitHub Actions 部署"