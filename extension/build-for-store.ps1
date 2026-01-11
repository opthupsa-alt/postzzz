# ═══════════════════════════════════════════════════════════════════════════════
# Leedz Extension - Build for Chrome Web Store
# ═══════════════════════════════════════════════════════════════════════════════
# هذا السكربت يجهز الإضافة للنشر على متجر Chrome
# ═══════════════════════════════════════════════════════════════════════════════

Write-Host "🚀 Building Leedz Extension for Chrome Web Store..." -ForegroundColor Cyan

# 1. Copy production config to config.js
Write-Host "📋 Copying production config..." -ForegroundColor Yellow
Copy-Item -Path "config.production.js" -Destination "config.js" -Force

# 2. Create build directory
$buildDir = "build"
if (Test-Path $buildDir) {
    Remove-Item -Path $buildDir -Recurse -Force
}
New-Item -ItemType Directory -Path $buildDir | Out-Null

# 3. Copy all required files
Write-Host "📦 Copying extension files..." -ForegroundColor Yellow
$filesToCopy = @(
    "manifest.json",
    "background.js",
    "sidepanel.html",
    "sidepanel.js",
    "config.js"
)

foreach ($file in $filesToCopy) {
    Copy-Item -Path $file -Destination $buildDir -Force
}

# Copy directories
$dirsToCopy = @("icons", "lib", "components", "settings", "search")
foreach ($dir in $dirsToCopy) {
    if (Test-Path $dir) {
        Copy-Item -Path $dir -Destination $buildDir -Recurse -Force
    }
}

# 4. Create ZIP file
Write-Host "🗜️ Creating ZIP archive..." -ForegroundColor Yellow
$zipPath = "leedz-extension-v1.0.0.zip"
if (Test-Path $zipPath) {
    Remove-Item -Path $zipPath -Force
}
Compress-Archive -Path "$buildDir\*" -DestinationPath $zipPath

# 5. Cleanup
Remove-Item -Path $buildDir -Recurse -Force

Write-Host ""
Write-Host "✅ Build complete!" -ForegroundColor Green
Write-Host "📁 Output: $zipPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Go to https://chrome.google.com/webstore/devconsole" -ForegroundColor White
Write-Host "2. Click 'New Item' and upload $zipPath" -ForegroundColor White
Write-Host "3. Fill in the store listing details" -ForegroundColor White
