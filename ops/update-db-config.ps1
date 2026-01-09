# ═══════════════════════════════════════════════════════════════════════════════
# Leedz - Update Database Configuration
# ═══════════════════════════════════════════════════════════════════════════════
# هذا السكربت يحدث جدول PlatformSettings في قاعدة البيانات
# ═══════════════════════════════════════════════════════════════════════════════

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot

Write-Host ""
Write-Host "🗄️ تحديث إعدادات قاعدة البيانات..." -ForegroundColor Cyan
Write-Host ""

# قراءة .env.master
$MasterEnvPath = Join-Path $ProjectRoot ".env.master"
if (-not (Test-Path $MasterEnvPath)) {
    Write-Host "❌ ملف .env.master غير موجود!" -ForegroundColor Red
    exit 1
}

$Config = @{}
Get-Content $MasterEnvPath | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
        $Config[$matches[1].Trim()] = $matches[2].Trim()
    }
}

$ApiPort = $Config['API_PORT'] ?? '3001'
$WebPort = $Config['WEB_PORT'] ?? '3000'
$ApiUrl = "http://localhost:$ApiPort"
$WebUrl = "http://localhost:$WebPort"
$DatabaseUrl = $Config['DATABASE_URL']

if (-not $DatabaseUrl) {
    Write-Host "❌ DATABASE_URL غير موجود في .env.master!" -ForegroundColor Red
    exit 1
}

Write-Host "📋 الإعدادات:" -ForegroundColor Yellow
Write-Host "   • API URL: $ApiUrl" -ForegroundColor Gray
Write-Host "   • Web URL: $WebUrl" -ForegroundColor Gray
Write-Host ""

# تنفيذ التحديث عبر API
$ApiPath = Join-Path $ProjectRoot "api"
Push-Location $ApiPath

try {
    # تعيين متغير البيئة
    $env:DATABASE_URL = $DatabaseUrl
    
    # إنشاء سكربت Node.js للتحديث
    $DisconnectMethod = '$disconnect'
    $UpdateScript = @"
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const result = await prisma.platformSettings.upsert({
      where: { id: 'default' },
      update: {
        platformUrl: '$WebUrl',
        apiUrl: '$ApiUrl',
      },
      create: {
        id: 'default',
        platformUrl: '$WebUrl',
        apiUrl: '$ApiUrl',
      },
    });
    
    console.log('Done:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$DisconnectMethod();
  }
}

main();
"@
    
    # حفظ وتنفيذ السكربت من مجلد api
    $TempScript = Join-Path $ApiPath "temp-update-db.js"
    Set-Content $TempScript $UpdateScript -Encoding UTF8
    
    Write-Host "🔄 تنفيذ التحديث..." -ForegroundColor Yellow
    $result = node $TempScript 2>&1
    Write-Host $result
    
    # حذف الملف المؤقت
    Remove-Item $TempScript -ErrorAction SilentlyContinue
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ تم تحديث قاعدة البيانات بنجاح!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "❌ فشل تحديث قاعدة البيانات" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ خطأ: $_" -ForegroundColor Red
} finally {
    Pop-Location
}

Write-Host ""
