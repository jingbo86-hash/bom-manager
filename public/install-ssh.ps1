# 以管理员身份运行此脚本
# 右键 → 使用 PowerShell 运行

Write-Host "=== 安装 OpenSSH Server ===" -ForegroundColor Cyan

# 1. 检查是否已安装
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

# 3. 防火墙放行 22 端口
$firewallRule = Get-NetFirewallRule -DisplayName 'OpenSSH-Server' -ErrorAction SilentlyContinue
if (-not $firewallRule) {
    Write-Host "正在配置防火墙放行 22 端口..." -ForegroundColor Cyan
    New-NetFirewallRule -Name 'OpenSSH-Server' -DisplayName 'OpenSSH Server (sshd)' `
        -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort 22
    Write-Host "防火墙规则已添加" -ForegroundColor Green
} else {
    Write-Host "防火墙规则已存在，跳过" -ForegroundColor Yellow
}

# 4. 验证服务状态
Write-Host "`n=== 验证结果 ===" -ForegroundColor Cyan
$svc = Get-Service sshd
Write-Host "服务状态: $($svc.Status)" -ForegroundColor $(if($svc.Status -eq 'Running'){'Green'}else{'Red'})
Write-Host "启动类型: $($svc.StartType)" -ForegroundColor Cyan

# 5. 显示本机 IP 地址
Write-Host "`n本机 IP 地址:" -ForegroundColor Cyan
Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike '*Loopback*' } | `
    Select-Object IPAddress, InterfaceAlias | Format-Table -AutoSize

# 6. 测试 SSH 连接
Write-Host "`n测试 SSH 连接（本机）..." -ForegroundColor Cyan
try {
    $result = ssh localhost "echo SSH 连接成功" 2>&1
    Write-Host $result -ForegroundColor Green
} catch {
    Write-Host "连接测试失败，请检查服务是否已启动" -ForegroundColor Yellow
}

Write-Host "`n=== 安装完成 ===" -ForegroundColor Green
Write-Host "如果外网连接不上，请检查云服务商的安全组/防火墙是否放行了 22 端口" -ForegroundColor Yellow