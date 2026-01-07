# Leedz Smoke Test Script
# Run after deployment to verify all endpoints
# Usage: .\ops\smoke-test.ps1

$API_URL = "https://leedz-api.onrender.com"
$ProgressPreference = 'SilentlyContinue'

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Leedz API Smoke Tests" -ForegroundColor Cyan
Write-Host "  Target: $API_URL" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Health Check
Write-Host "[1/6] Testing /health..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$API_URL/health" -TimeoutSec 120
    if ($health.ok -eq $true) {
        Write-Host "  ✅ Health OK - Version: $($health.version)" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Health returned but ok=false" -ForegroundColor Red
    }
} catch {
    Write-Host "  ❌ Health FAILED: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Root Endpoint
Write-Host "[2/6] Testing / (root)..." -ForegroundColor Yellow
try {
    $root = Invoke-WebRequest -Uri "$API_URL/" -UseBasicParsing -TimeoutSec 30 -MaximumRedirection 0 -ErrorAction SilentlyContinue
    Write-Host "  ✅ Root OK - Status: $($root.StatusCode)" -ForegroundColor Green
} catch {
    if ($_.Exception.Response.StatusCode -eq 302 -or $_.Exception.Response.StatusCode -eq 301) {
        Write-Host "  ✅ Root redirects (Swagger enabled)" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️ Root: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

# Test 3: Swagger Docs (should require auth)
Write-Host "[3/6] Testing /api/docs (Swagger)..." -ForegroundColor Yellow
try {
    $swagger = Invoke-WebRequest -Uri "$API_URL/api/docs" -UseBasicParsing -TimeoutSec 30 -ErrorAction Stop
    Write-Host "  ⚠️ Swagger accessible without auth (check SWAGGER_ENABLED)" -ForegroundColor Yellow
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "  ✅ Swagger protected (401 - Basic Auth required)" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Swagger error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test 4: Auth Signup
Write-Host "[4/6] Testing /auth/signup..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$signupBody = @{
    email = "smoketest$timestamp@test.com"
    password = "SmokeTest123!"
    name = "Smoke Test User"
    tenantName = "Smoke Test Tenant"
} | ConvertTo-Json

try {
    $signup = Invoke-RestMethod -Uri "$API_URL/auth/signup" -Method POST -Body $signupBody -ContentType "application/json" -TimeoutSec 30
    if ($signup.token) {
        Write-Host "  ✅ Signup OK - Got token" -ForegroundColor Green
        $TOKEN = $signup.token
    } else {
        Write-Host "  ❌ Signup returned but no token" -ForegroundColor Red
    }
} catch {
    Write-Host "  ❌ Signup FAILED: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Auth Me (if we have token)
if ($TOKEN) {
    Write-Host "[5/6] Testing /auth/me..." -ForegroundColor Yellow
    try {
        $headers = @{ Authorization = "Bearer $TOKEN" }
        $me = Invoke-RestMethod -Uri "$API_URL/auth/me" -Headers $headers -TimeoutSec 30
        if ($me.user) {
            Write-Host "  ✅ Me OK - User: $($me.user.email)" -ForegroundColor Green
        } else {
            Write-Host "  ❌ Me returned but no user" -ForegroundColor Red
        }
    } catch {
        Write-Host "  ❌ Me FAILED: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "[5/6] Skipping /auth/me (no token)" -ForegroundColor Gray
}

# Test 6: Jobs endpoint (if we have token)
if ($TOKEN) {
    Write-Host "[6/6] Testing /jobs..." -ForegroundColor Yellow
    try {
        $headers = @{ Authorization = "Bearer $TOKEN" }
        $jobs = Invoke-RestMethod -Uri "$API_URL/jobs" -Headers $headers -TimeoutSec 30
        Write-Host "  ✅ Jobs OK - Count: $($jobs.Count)" -ForegroundColor Green
    } catch {
        Write-Host "  ❌ Jobs FAILED: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "[6/6] Skipping /jobs (no token)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Smoke Tests Complete" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
