# ═══════════════════════════════════════════════════════════════════════════════
# Leedz - Sync Configuration & Start All Services
# ═══════════════════════════════════════════════════════════════════════════════
# هذا السكربت يقرأ من .env.master ويدفع الإعدادات لجميع الطرفيات ثم يشغل المشروع
# ═══════════════════════════════════════════════════════════════════════════════

param(
    [switch]$SyncOnly,      # فقط مزامنة الإعدادات بدون تشغيل
    [switch]$StartOnly,     # فقط تشغيل بدون مزامنة
    [switch]$UpdateDB       # تحديث قاعدة البيانات أيضاً
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   🚀 Leedz - Sync & Start" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# ─────────────────────────────────────────────────────────────────────────────────
# قراءة ملف .env.master
# ─────────────────────────────────────────────────────────────────────────────────
$MasterEnvPath = Join-Path $ProjectRoot ".env.master"

if (-not (Test-Path $MasterEnvPath)) {
    Write-Host "❌ ملف .env.master غير موجود!" -ForegroundColor Red
    Write-Host "   أنشئ الملف أولاً من .env.master.example" -ForegroundColor Yellow
    exit 1
}

Write-Host "📖 قراءة .env.master..." -ForegroundColor Yellow

# Parse .env.master file
$Config = @{}
Get-Content $MasterEnvPath | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        $Config[$key] = $value
    }
}

# Extract values
$ApiPort = $Config['API_PORT'] ?? '3001'
$WebPort = $Config['WEB_PORT'] ?? '3000'
$HostIP = $Config['HOST_IP'] ?? 'localhost'
$ApiUrl = $Config['API_URL'] ?? "http://${HostIP}:$ApiPort"
$WebUrl = $Config['WEB_URL'] ?? "http://${HostIP}:$WebPort"
$DatabaseUrl = $Config['DATABASE_URL']
$DatabaseUrlUnpooled = $Config['DATABASE_URL_UNPOOLED']
$JwtSecret = $Config['JWT_SECRET']
$JwtExpiresIn = $Config['JWT_EXPIRES_IN'] ?? '7d'
$SwaggerEnabled = $Config['SWAGGER_ENABLED'] ?? '1'
$SwaggerUser = $Config['SWAGGER_USER'] ?? 'admin'
$SwaggerPass = $Config['SWAGGER_PASS'] ?? 'leedz2026'
$ExtDebugMode = $Config['EXTENSION_DEBUG_MODE'] ?? 'false'
$ExtShowWindow = $Config['EXTENSION_SHOW_SEARCH_WINDOW'] ?? 'false'
$ExtMatchThreshold = $Config['EXTENSION_MATCH_THRESHOLD'] ?? '90'

Write-Host ""
Write-Host "📋 الإعدادات المقروءة:" -ForegroundColor Yellow
Write-Host "   • Host IP:  $HostIP" -ForegroundColor Gray
Write-Host "   • API Port: $ApiPort" -ForegroundColor Gray
Write-Host "   • Web Port: $WebPort" -ForegroundColor Gray
Write-Host "   • API URL:  $ApiUrl" -ForegroundColor Gray
Write-Host "   • Web URL:  $WebUrl" -ForegroundColor Gray
Write-Host "   • Database: $(if($DatabaseUrl){'✅ موجود'}else{'❌ غير موجود'})" -ForegroundColor Gray
Write-Host ""

# ─────────────────────────────────────────────────────────────────────────────────
# مزامنة الإعدادات
# ─────────────────────────────────────────────────────────────────────────────────
if (-not $StartOnly) {
    Write-Host "🔄 مزامنة الإعدادات لجميع الطرفيات..." -ForegroundColor Yellow
    Write-Host ""
    
    # 1. تحديث api/.env
    Write-Host "   📦 تحديث api/.env..." -ForegroundColor Blue
    $ApiEnvContent = @"
# ═══════════════════════════════════════════════════════════════════════════════
# LEEDZ API - LOCAL ENVIRONMENT VARIABLES
# ═══════════════════════════════════════════════════════════════════════════════
# تم توليد هذا الملف تلقائياً من .env.master
# لا تعدّل هذا الملف مباشرة - عدّل .env.master وشغّل sync-and-start.ps1
# ═══════════════════════════════════════════════════════════════════════════════

# Database (Neon PostgreSQL)
DATABASE_URL=$DatabaseUrl
DATABASE_URL_UNPOOLED=$DatabaseUrlUnpooled

# JWT
JWT_SECRET=$JwtSecret
JWT_EXPIRES_IN=$JwtExpiresIn

# CORS
CORS_ORIGINS=$WebUrl,http://localhost:5173

# Swagger
SWAGGER_ENABLED=$SwaggerEnabled
SWAGGER_USER=$SwaggerUser
SWAGGER_PASS=$SwaggerPass

# Server
PORT=$ApiPort
NODE_ENV=development
"@
    $ApiEnvPath = Join-Path $ProjectRoot "api\.env"
    Set-Content $ApiEnvPath $ApiEnvContent -Encoding UTF8
    Write-Host "      ✅ api/.env تم تحديثه" -ForegroundColor Green
    
    # 2. تحديث web/.env.local
    Write-Host "   🌐 تحديث web/.env.local..." -ForegroundColor Blue
    $WebEnvContent = @"
# ═══════════════════════════════════════════════════════════════════════════════
# LEEDZ WEB - LOCAL ENVIRONMENT VARIABLES
# ═══════════════════════════════════════════════════════════════════════════════
# تم توليد هذا الملف تلقائياً من .env.master
# لا تعدّل هذا الملف مباشرة - عدّل .env.master وشغّل sync-and-start.ps1
# ═══════════════════════════════════════════════════════════════════════════════

VITE_API_BASE_URL=$ApiUrl
"@
    $WebEnvPath = Join-Path $ProjectRoot "web\.env.local"
    Set-Content $WebEnvPath $WebEnvContent -Encoding UTF8
    Write-Host "      ✅ web/.env.local تم تحديثه" -ForegroundColor Green
    
    # 3. تحديث extension/config.js
    Write-Host "   🧩 تحديث extension/config.js..." -ForegroundColor Blue
    $ExtConfigContent = @"
// ═══════════════════════════════════════════════════════════════════════════════
// Leedz Extension - Configuration
// ═══════════════════════════════════════════════════════════════════════════════
// تم توليد هذا الملف تلقائياً من .env.master
// لا تعدّل هذا الملف مباشرة - عدّل .env.master وشغّل sync-and-start.ps1
// ═══════════════════════════════════════════════════════════════════════════════

var LEEDZ_CONFIG = {
  // URLs
  API_URL: '$ApiUrl',
  WEB_URL: '$WebUrl',
  
  // Ports
  API_PORT: $ApiPort,
  WEB_PORT: $WebPort,
  
  // Extension Settings
  DEBUG_MODE: $($ExtDebugMode.ToLower()),
  SHOW_SEARCH_WINDOW: $($ExtShowWindow.ToLower()),
  MATCH_THRESHOLD: $ExtMatchThreshold
};

// للاستخدام في background.js و sidepanel.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LEEDZ_CONFIG;
}
"@
    $ExtConfigPath = Join-Path $ProjectRoot "extension\config.js"
    Set-Content $ExtConfigPath $ExtConfigContent -Encoding UTF8
    Write-Host "      ✅ extension/config.js تم تحديثه" -ForegroundColor Green
    
    # 4. تحديث قاعدة البيانات (إذا طُلب)
    if ($UpdateDB) {
        Write-Host "   🗄️ تحديث قاعدة البيانات..." -ForegroundColor Blue
        
        # إنشاء سكربت SQL للتحديث
        $SqlScript = @"
-- تحديث PlatformConfig
UPDATE "PlatformConfig" 
SET "platformUrl" = '$WebUrl', 
    "apiUrl" = '$ApiUrl',
    "updatedAt" = NOW()
WHERE id = 'default';

-- إذا لم يكن موجوداً، أنشئه
INSERT INTO "PlatformConfig" (id, "platformUrl", "apiUrl", "createdAt", "updatedAt")
SELECT 'default', '$WebUrl', '$ApiUrl', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "PlatformConfig" WHERE id = 'default');
"@
        
        try {
            # تنفيذ SQL عبر prisma
            $ApiPath = Join-Path $ProjectRoot "api"
            Push-Location $ApiPath
            $env:DATABASE_URL = $DatabaseUrl
            
            # استخدام npx prisma db execute
            $SqlScript | npx prisma db execute --stdin 2>$null
            
            Pop-Location
            Write-Host "      ✅ قاعدة البيانات تم تحديثها" -ForegroundColor Green
        } catch {
            Write-Host "      ⚠️ تعذر تحديث قاعدة البيانات: $_" -ForegroundColor Yellow
        }
    }
    
    Write-Host ""
    Write-Host "✅ تمت مزامنة جميع الإعدادات!" -ForegroundColor Green
    Write-Host ""
}

# ─────────────────────────────────────────────────────────────────────────────────
# تشغيل الخدمات
# ─────────────────────────────────────────────────────────────────────────────────
if (-not $SyncOnly) {
    Write-Host "🚀 تشغيل الخدمات..." -ForegroundColor Yellow
    Write-Host ""
    
    # التحقق من البورتات وإيقاف العمليات القديمة
    function Stop-ProcessOnPort {
        param([int]$Port)
        $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
        if ($connections) {
            $processIds = $connections | Select-Object -ExpandProperty OwningProcess -Unique
            foreach ($procId in $processIds) {
                $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
                if ($proc -and $proc.Name -ne 'System') {
                    Write-Host "   ⚠️ إيقاف $($proc.Name) على البورت $Port" -ForegroundColor Yellow
                    Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
                    Start-Sleep -Milliseconds 500
                }
            }
        }
    }
    
    # إيقاف العمليات على البورتات المطلوبة
    Stop-ProcessOnPort $ApiPort
    Stop-ProcessOnPort $WebPort
    
    Start-Sleep -Seconds 1
    
    # تشغيل Backend
    Write-Host "   📦 تشغيل Backend على البورت $ApiPort..." -ForegroundColor Blue
    $ApiPath = Join-Path $ProjectRoot "api"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ApiPath'; Write-Host '🚀 Starting Leedz API...' -ForegroundColor Cyan; npm run dev" -WindowStyle Normal
    
    Start-Sleep -Seconds 3
    
    # تشغيل Frontend
    Write-Host "   🌐 تشغيل Frontend على البورت $WebPort..." -ForegroundColor Blue
    $WebPath = Join-Path $ProjectRoot "web"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$WebPath'; Write-Host '🚀 Starting Leedz Web...' -ForegroundColor Cyan; npm run dev -- --port $WebPort" -WindowStyle Normal
    
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host "   ✅ تم تشغيل جميع الخدمات!" -ForegroundColor Green
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host ""
    Write-Host "🔗 الروابط:" -ForegroundColor Yellow
    Write-Host "   • Frontend: $WebUrl" -ForegroundColor Cyan
    Write-Host "   • Backend:  $ApiUrl" -ForegroundColor Cyan
    Write-Host "   • API Docs: $ApiUrl/api" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📌 Chrome Extension:" -ForegroundColor Yellow
    Write-Host "   1. افتح chrome://extensions" -ForegroundColor Gray
    Write-Host "   2. فعّل Developer mode" -ForegroundColor Gray
    Write-Host "   3. اضغط Load unpacked (أو Reload إذا محملة)" -ForegroundColor Gray
    Write-Host "   4. اختر مجلد extension/" -ForegroundColor Gray
    Write-Host ""
    Write-Host "👤 بيانات الدخول:" -ForegroundColor Yellow
    Write-Host "   • Super Admin: admin@optarget.com / Admin@123" -ForegroundColor Gray
    Write-Host "   • Test User: testuser123@test.com / Test@123" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "💡 لتغيير الإعدادات: عدّل .env.master وأعد تشغيل هذا السكربت" -ForegroundColor DarkGray
Write-Host ""
