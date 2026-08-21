# 以管理员身份运行此脚本
Write-Host "=== 安装 OpenSSH Server ===" -ForegroundColor Cyan

# 1. 检查并安装
$sshStatus = Get-WindowsCapability -Online | Where-Object Name -like 'OpenSSH.Server*'
if ($sshStatus.State -eq 'Installed') {
    Write-Host "OpenSSH Server 已安装，跳过安装步骤" -ForegroundColor Yellow
} else {
    Write-Host "正在安装 OpenSSH Server..." -ForegroundColor Cyan
    Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0
    Write-Host "安装完成" -ForegroundColor Green
}

# 2. 启动 SSH 服务
Write-Host "正在启动 SSH 服务..." -ForegroundColor Cyan
Start-Service sshd
Set-Service -Name sshd -StartupType 'Automatic'
Write-Host "SSH 服务已启动并设为开机自启" -ForegroundColor Green

# 3. 防火墙放行
$firewallRule = Get-NetFirewallRule -DisplayName 'OpenSSH-Server' -ErrorAction SilentlyContinue
if ($null -eq $firewallRule) {
    Write-Host "正在配置防火墙..." -ForegroundColor Cyan
    New-NetFirewallRule -Name 'OpenSSH-Server' -DisplayName 'OpenSSH Server (sshd)' -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort 22
    Write-Host "防火墙规则已添加" -ForegroundColor Green
} else {
    Write-Host "防火墙规则已存在" -ForegroundColor Yellow
}

# 4. 验证服务
Write-Host "`n=== 验证结果 ===" -ForegroundColor Cyan
$svc = Get-Service sshd
Write-Host "服务状态: $($svc.Status)" -ForegroundColor Green
Write-Host "启动类型: $($svc.StartType)" -ForegroundColor Cyan

# 5. 显示 IP
Write-Host "`n=== 本机 IP ===" -ForegroundColor Cyan
Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike '*Loopback*' } | Select-Object IPAddress, InterfaceAlias

# 6. 测试连接
Write-Host "`n=== 测试 SSH 连接 ===" -ForegroundColor Cyan
ssh localhost "echo SSH 连接成功"

Write-Host "`n=== 安装完成 ===" -ForegroundColor Green
Write-Host "如果外网连不上，请检查云服务商安全组是否放行了 22 端口" -ForegroundColor Yellow