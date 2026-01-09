# ═══════════════════════════════════════════════════════════════════════════════
# Leedz - Development Startup Script
# ═══════════════════════════════════════════════════════════════════════════════
# هذا السكربت يقرأ من config.local.json ويشغل جميع الخدمات بالبورتات الصحيحة
# ═══════════════════════════════════════════════════════════════════════════════

param(
    [switch]$ApiOnly,
    [switch]$WebOnly,
    [switch]$UpdateConfig
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot

# ─────────────────────────────────────────────────────────────────────────────────
# قراءة ملف الإعدادات المركزي
# ─────────────────────────────────────────────────────────────────────────────────
$ConfigPath = Join-Path $ProjectRoot "config.local.json"

if (-not (Test-Path $ConfigPath)) {
    Write-Host "❌ ملف config.local.json غير موجود!" -ForegroundColor Red
    Write-Host "   أنشئ الملف من config.local.example.json" -ForegroundColor Yellow
    exit 1
}

$Config = Get-Content $ConfigPath -Raw | ConvertFrom-Json
$ApiPort = $Config.ports.api
$WebPort = $Config.ports.web
$ApiUrl = $Config.urls.api
$WebUrl = $Config.urls.web

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   🚀 Leedz Development Environment" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 الإعدادات من config.local.json:" -ForegroundColor Yellow
Write-Host "   • API Port: $ApiPort" -ForegroundColor Gray
Write-Host "   • Web Port: $WebPort" -ForegroundColor Gray
Write-Host "   • API URL:  $ApiUrl" -ForegroundColor Gray
Write-Host "   • Web URL:  $WebUrl" -ForegroundColor Gray
Write-Host ""

# ─────────────────────────────────────────────────────────────────────────────────
# تحديث ملفات الإعدادات في كل مجلد
# ─────────────────────────────────────────────────────────────────────────────────
function Update-EnvFiles {
    Write-Host "🔄 تحديث ملفات الإعدادات..." -ForegroundColor Yellow
    
    # تحديث api/.env
    $ApiEnvPath = Join-Path $ProjectRoot "api\.env"
    if (Test-Path $ApiEnvPath) {
        $ApiEnv = Get-Content $ApiEnvPath -Raw
        $ApiEnv = $ApiEnv -replace "PORT=\d+", "PORT=$ApiPort"
        $ApiEnv = $ApiEnv -replace "CORS_ORIGINS=.*", "CORS_ORIGINS=$WebUrl,http://localhost:5173"
        Set-Content $ApiEnvPath $ApiEnv
        Write-Host "   ✅ api/.env تم تحديثه" -ForegroundColor Green
    }
    
    # تحديث web/.env.local
    $WebEnvPath = Join-Path $ProjectRoot "web\.env.local"
    $WebEnvContent = "VITE_API_BASE_URL=$ApiUrl"
    Set-Content $WebEnvPath $WebEnvContent
    Write-Host "   ✅ web/.env.local تم تحديثه" -ForegroundColor Green
    
    # تحديث extension/config.js
    $ExtConfigPath = Join-Path $ProjectRoot "extension\config.js"
    $ExtConfigContent = @"
// ═══════════════════════════════════════════════════════════════════════════════
// Leedz Extension - Configuration
// ═══════════════════════════════════════════════════════════════════════════════
// هذا الملف يُولَّد تلقائياً من config.local.json
// لا تعدّل هذا الملف مباشرة - عدّل config.local.json وشغّل start-dev.ps1
// ═══════════════════════════════════════════════════════════════════════════════

const LEEDZ_CONFIG = {
  API_URL: '$ApiUrl',
  WEB_URL: '$WebUrl',
  API_PORT: $ApiPort,
  WEB_PORT: $WebPort,
  DEBUG_MODE: $($Config.extension.debugMode.ToString().ToLower()),
  SHOW_SEARCH_WINDOW: $($Config.extension.showSearchWindow.ToString().ToLower())
};

// تصدير للاستخدام في background.js و sidepanel.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LEEDZ_CONFIG;
}
"@
    Set-Content $ExtConfigPath $ExtConfigContent -Encoding UTF8
    Write-Host "   ✅ extension/config.js تم تحديثه" -ForegroundColor Green
    
    Write-Host ""
}

# تحديث الإعدادات دائماً عند التشغيل
Update-EnvFiles

# ─────────────────────────────────────────────────────────────────────────────────
# التحقق من البورتات المستخدمة
# ─────────────────────────────────────────────────────────────────────────────────
function Test-PortInUse {
    param([int]$Port)
    $connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    return $null -ne $connection
}

function Stop-ProcessOnPort {
    param([int]$Port)
    $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    if ($connections) {
        $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($pid in $pids) {
            $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
            if ($process) {
                Write-Host "   ⚠️ إيقاف العملية $($process.Name) (PID: $pid) على البورت $Port" -ForegroundColor Yellow
                Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
            }
        }
        Start-Sleep -Seconds 1
    }
}

# التحقق وإيقاف العمليات على البورتات المطلوبة
if (-not $WebOnly) {
    if (Test-PortInUse $ApiPort) {
        Write-Host "⚠️ البورت $ApiPort مستخدم" -ForegroundColor Yellow
        Stop-ProcessOnPort $ApiPort
    }
}

if (-not $ApiOnly) {
    if (Test-PortInUse $WebPort) {
        Write-Host "⚠️ البورت $WebPort مستخدم" -ForegroundColor Yellow
        Stop-ProcessOnPort $WebPort
    }
}

# ─────────────────────────────────────────────────────────────────────────────────
# تشغيل الخدمات
# ─────────────────────────────────────────────────────────────────────────────────
Write-Host "🚀 بدء تشغيل الخدمات..." -ForegroundColor Cyan
Write-Host ""

if (-not $WebOnly) {
    Write-Host "📦 تشغيل Backend API على البورت $ApiPort..." -ForegroundColor Blue
    $ApiPath = Join-Path $ProjectRoot "api"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ApiPath'; `$env:PORT=$ApiPort; npm run dev" -WindowStyle Normal
    Start-Sleep -Seconds 2
}

if (-not $ApiOnly) {
    Write-Host "🌐 تشغيل Frontend على البورت $WebPort..." -ForegroundColor Blue
    $WebPath = Join-Path $ProjectRoot "web"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$WebPath'; npm run dev -- --port $WebPort" -WindowStyle Normal
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "   ✅ تم تشغيل الخدمات بنجاح!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "🔗 الروابط:" -ForegroundColor Yellow
Write-Host "   • Frontend: $WebUrl" -ForegroundColor Cyan
Write-Host "   • Backend:  $ApiUrl" -ForegroundColor Cyan
Write-Host "   • API Docs: $ApiUrl/api" -ForegroundColor Cyan
Write-Host ""
Write-Host "📌 Extension:" -ForegroundColor Yellow
Write-Host "   1. افتح chrome://extensions" -ForegroundColor Gray
Write-Host "   2. فعّل Developer mode" -ForegroundColor Gray
Write-Host "   3. اضغط Load unpacked" -ForegroundColor Gray
Write-Host "   4. اختر مجلد extension/" -ForegroundColor Gray
Write-Host ""
Write-Host "💡 لتغيير البورتات: عدّل config.local.json وأعد تشغيل هذا السكربت" -ForegroundColor DarkGray
Write-Host ""
