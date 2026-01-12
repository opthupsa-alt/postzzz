# ═══════════════════════════════════════════════════════════════════════════════
# Leedz - Setup for Local Network Testing
# ═══════════════════════════════════════════════════════════════════════════════
# هذا السكربت يضبط المشروع للاختبار على الشبكة المحلية
# ═══════════════════════════════════════════════════════════════════════════════

param(
    [string]$IP = "192.168.20.16"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   🌐 Leedz - Local Network Setup" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "📍 IP Address: $IP" -ForegroundColor Yellow
Write-Host ""

# ─────────────────────────────────────────────────────────────────────────────────
# تحديث .env.master
# ─────────────────────────────────────────────────────────────────────────────────
$MasterEnvPath = Join-Path $ProjectRoot ".env.master"

if (-not (Test-Path $MasterEnvPath)) {
    Write-Host "❌ ملف .env.master غير موجود!" -ForegroundColor Red
    exit 1
}

Write-Host "📝 تحديث .env.master..." -ForegroundColor Yellow

# قراءة الملف الحالي
$content = Get-Content $MasterEnvPath -Raw

# تحديث أو إضافة HOST_IP
if ($content -match "HOST_IP=") {
    $content = $content -replace "HOST_IP=.*", "HOST_IP=$IP"
} else {
    $content += "`nHOST_IP=$IP"
}

# تحديث أو إضافة API_URL
if ($content -match "API_URL=") {
    $content = $content -replace "API_URL=.*", "API_URL=http://${IP}:3001"
} else {
    $content += "`nAPI_URL=http://${IP}:3001"
}

# تحديث أو إضافة WEB_URL
if ($content -match "WEB_URL=") {
    $content = $content -replace "WEB_URL=.*", "WEB_URL=http://${IP}:3000"
} else {
    $content += "`nWEB_URL=http://${IP}:3000"
}

# حفظ الملف
Set-Content $MasterEnvPath $content -NoNewline
Write-Host "   ✅ .env.master تم تحديثه" -ForegroundColor Green

# ─────────────────────────────────────────────────────────────────────────────────
# تشغيل sync-and-start.ps1
# ─────────────────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "🔄 تشغيل المزامنة والخدمات..." -ForegroundColor Yellow
Write-Host ""

$SyncScript = Join-Path $PSScriptRoot "sync-and-start.ps1"
& $SyncScript

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "   ✅ تم ضبط المشروع للشبكة المحلية!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "🔗 يمكن الوصول من أي جهاز على الشبكة:" -ForegroundColor Yellow
Write-Host "   • Frontend: http://${IP}:3000" -ForegroundColor Cyan
Write-Host "   • Backend:  http://${IP}:3001" -ForegroundColor Cyan
Write-Host ""
Write-Host "📱 للاختبار من جهاز آخر:" -ForegroundColor Yellow
Write-Host "   1. تأكد أن الجهاز على نفس الشبكة" -ForegroundColor Gray
Write-Host "   2. افتح http://${IP}:3000 في المتصفح" -ForegroundColor Gray
Write-Host ""
