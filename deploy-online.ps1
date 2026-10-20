param(
  [int]$Port = 3000
)

$ErrorActionPreference = 'Stop'

function Write-Step([string]$text) {
  Write-Host "[STEP] $text" -ForegroundColor Cyan
}

function Ensure-Command([string]$name, [string]$installTip) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] 缺少命令: $name" -ForegroundColor Red
    Write-Host "[ACTION] $installTip" -ForegroundColor Yellow
    exit 1
  }
}

Write-Step "检查 Node.js / npm"
Ensure-Command "node" "请先安装 Node.js LTS: https://nodejs.org/"
Ensure-Command "npm" "请先安装 Node.js LTS: https://nodejs.org/"

Write-Step "安装依赖（若已安装会很快跳过）"
npm ci

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$cloudflaredPath = Join-Path $root "cloudflared.exe"

if (-not (Test-Path $cloudflaredPath)) {
  Write-Step "下载 cloudflared（首次需要）"
  $url = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
  Invoke-WebRequest -Uri $url -OutFile $cloudflaredPath
}

Write-Step "启动聊天服务"
$serverCmd = 'cd /d "' + $root + '" && node server.js'
$env:PORT = $Port
Start-Process -FilePath "cmd.exe" -ArgumentList "/c $serverCmd" -WindowStyle Hidden

Start-Sleep -Seconds 2
try { Invoke-RestMethod -Uri "http://localhost:$Port/health" -TimeoutSec 5 | Out-Null } catch { throw "聊天服务未能在端口 $Port 启动" }

Write-Step "生成公网链接（把 trycloudflare.com 链接发给聊天对象）"
& $cloudflaredPath tunnel --url "http://localhost:$Port"
