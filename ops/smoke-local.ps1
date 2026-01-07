# ═══════════════════════════════════════════════════════════════════════
# LEEDZ LOCAL SMOKE TEST SCRIPT
# ═══════════════════════════════════════════════════════════════════════
# Usage: .\ops\smoke-local.ps1
# Prerequisites: API running on localhost:3001
# ═══════════════════════════════════════════════════════════════════════

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$API_BASE = "http://localhost:3001"
$TIMESTAMP = Get-Date -Format "HHmmss"
$TEST_EMAIL = "smoketest$TIMESTAMP@example.com"
$TEST_PASSWORD = "SmokeTest123!"
$TEST_NAME = "Smoke Test User"

$passed = 0
$failed = 0
$token = $null

function Write-TestResult {
    param([string]$TestName, [bool]$Success, [string]$Details = "")
    if ($Success) {
        Write-Host "[PASS] $TestName" -ForegroundColor Green
        if ($Details) { Write-Host "       $Details" -ForegroundColor Gray }
        $script:passed++
    } else {
        Write-Host "[FAIL] $TestName" -ForegroundColor Red
        if ($Details) { Write-Host "       $Details" -ForegroundColor Yellow }
        $script:failed++
    }
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  LEEDZ LOCAL SMOKE TESTS" -ForegroundColor Cyan
Write-Host "  API: $API_BASE" -ForegroundColor Cyan
Write-Host "  Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# ─────────────────────────────────────────────────────────────────────────
# TEST 1: Health Check
# ─────────────────────────────────────────────────────────────────────────
Write-Host "─── Test 1: Health Check ───" -ForegroundColor White
try {
    $health = Invoke-RestMethod -Uri "$API_BASE/health" -TimeoutSec 10
    $success = $health.ok -eq $true
    Write-TestResult "GET /health" $success "ok=$($health.ok), version=$($health.version)"
} catch {
    Write-TestResult "GET /health" $false $_.Exception.Message
}

# ─────────────────────────────────────────────────────────────────────────
# TEST 2: Signup
# ─────────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "─── Test 2: Signup ───" -ForegroundColor White
try {
    $signupBody = @{
        name = $TEST_NAME
        email = $TEST_EMAIL
        password = $TEST_PASSWORD
    } | ConvertTo-Json
    
    $signup = Invoke-RestMethod -Uri "$API_BASE/auth/signup" -Method POST -Body $signupBody -ContentType "application/json" -TimeoutSec 30
    $success = $signup.token -and $signup.user.email -eq $TEST_EMAIL
    $token = $signup.token
    Write-TestResult "POST /auth/signup" $success "email=$($signup.user.email)"
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    Write-TestResult "POST /auth/signup" $false "Status: $status"
}

# ─────────────────────────────────────────────────────────────────────────
# TEST 3: Signup Validation (missing name)
# ─────────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "─── Test 3: Signup Validation ───" -ForegroundColor White
try {
    $badBody = @{
        email = "bad@example.com"
        password = "Pass123!"
    } | ConvertTo-Json
    
    $null = Invoke-RestMethod -Uri "$API_BASE/auth/signup" -Method POST -Body $badBody -ContentType "application/json" -TimeoutSec 10
    Write-TestResult "POST /auth/signup (no name) → 400" $false "Expected 400, got success"
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    $success = $status -eq 400
    Write-TestResult "POST /auth/signup (no name) → 400" $success "Status: $status"
}

# ─────────────────────────────────────────────────────────────────────────
# TEST 4: Login
# ─────────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "─── Test 4: Login ───" -ForegroundColor White
try {
    $loginBody = @{
        email = $TEST_EMAIL
        password = $TEST_PASSWORD
    } | ConvertTo-Json
    
    $login = Invoke-RestMethod -Uri "$API_BASE/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -TimeoutSec 30
    $success = $login.token -and $login.user.email -eq $TEST_EMAIL
    $token = $login.token
    Write-TestResult "POST /auth/login" $success "email=$($login.user.email), role=$($login.role)"
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    Write-TestResult "POST /auth/login" $false "Status: $status"
}

# ─────────────────────────────────────────────────────────────────────────
# TEST 5: Login with wrong password → 401
# ─────────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "─── Test 5: Login Wrong Password ───" -ForegroundColor White
try {
    $badLoginBody = @{
        email = $TEST_EMAIL
        password = "WrongPassword!"
    } | ConvertTo-Json
    
    $null = Invoke-RestMethod -Uri "$API_BASE/auth/login" -Method POST -Body $badLoginBody -ContentType "application/json" -TimeoutSec 10
    Write-TestResult "POST /auth/login (wrong pass) → 401" $false "Expected 401, got success"
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    $success = $status -eq 401
    Write-TestResult "POST /auth/login (wrong pass) → 401" $success "Status: $status"
}

# ─────────────────────────────────────────────────────────────────────────
# TEST 6: Login with non-existent user → 401
# ─────────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "─── Test 6: Login Non-existent User ───" -ForegroundColor White
try {
    $noUserBody = @{
        email = "nonexistent$TIMESTAMP@example.com"
        password = "Pass123!"
    } | ConvertTo-Json
    
    $null = Invoke-RestMethod -Uri "$API_BASE/auth/login" -Method POST -Body $noUserBody -ContentType "application/json" -TimeoutSec 10
    Write-TestResult "POST /auth/login (no user) → 401" $false "Expected 401, got success"
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    $success = $status -eq 401
    Write-TestResult "POST /auth/login (no user) → 401" $success "Status: $status"
}

# ─────────────────────────────────────────────────────────────────────────
# TEST 7: Auth/Me with valid token
# ─────────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "─── Test 7: Auth/Me ───" -ForegroundColor White
if ($token) {
    try {
        $headers = @{ Authorization = "Bearer $token" }
        $me = Invoke-RestMethod -Uri "$API_BASE/auth/me" -Headers $headers -TimeoutSec 10
        $success = $me.user.email -eq $TEST_EMAIL
        Write-TestResult "GET /auth/me" $success "email=$($me.user.email), role=$($me.role)"
    } catch {
        $status = $_.Exception.Response.StatusCode.value__
        Write-TestResult "GET /auth/me" $false "Status: $status"
    }
} else {
    Write-TestResult "GET /auth/me" $false "No token available (signup/login failed)"
}

# ─────────────────────────────────────────────────────────────────────────
# TEST 8: Auth/Me without token → 401
# ─────────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "─── Test 8: Auth/Me No Token ───" -ForegroundColor White
try {
    $null = Invoke-RestMethod -Uri "$API_BASE/auth/me" -TimeoutSec 10
    Write-TestResult "GET /auth/me (no token) → 401" $false "Expected 401, got success"
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    $success = $status -eq 401
    Write-TestResult "GET /auth/me (no token) → 401" $success "Status: $status"
}

# ─────────────────────────────────────────────────────────────────────────
# TEST 9: Jobs endpoint
# ─────────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "─── Test 9: Jobs ───" -ForegroundColor White
if ($token) {
    try {
        $headers = @{ Authorization = "Bearer $token" }
        $jobs = Invoke-RestMethod -Uri "$API_BASE/jobs" -Headers $headers -TimeoutSec 10
        $success = $jobs -is [array]
        Write-TestResult "GET /jobs" $success "count=$($jobs.Count)"
    } catch {
        $status = $_.Exception.Response.StatusCode.value__
        Write-TestResult "GET /jobs" $false "Status: $status"
    }
} else {
    Write-TestResult "GET /jobs" $false "No token available"
}

# ─────────────────────────────────────────────────────────────────────────
# SUMMARY
# ─────────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  RESULTS: $passed passed, $failed failed" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Red" })
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

if ($failed -gt 0) {
    exit 1
} else {
    exit 0
}
