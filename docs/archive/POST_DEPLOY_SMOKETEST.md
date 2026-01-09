# Post-Deploy Smoke Test Guide

## Prerequisites

- Render API deployed and running
- Vercel Web deployed
- Environment variables configured

## Variables (Replace with actual values)

```bash
# Set these before running tests
API_URL="https://leedz-api.onrender.com"
WEB_URL="https://leedz-web.vercel.app"
```

---

## 1. Health Check

```bash
curl -s "$API_URL/health" | jq .
```

**Expected:** `200 OK` with `{"ok":true,"version":"1.0.0",...}`

---

## 2. Root Endpoint

```bash
curl -s "$API_URL/" | jq .
```

**Expected (Swagger disabled):** `{"name":"Leedz API","version":"1.0.0","status":"running","health":"/health"}`

**Expected (Swagger enabled):** Redirect to `/api/docs`

---

## 3. Swagger Docs (if SWAGGER_ENABLED=1)

```bash
# Should return 401 without auth
curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/docs"

# With Basic Auth (replace USER:PASS)
curl -s -u "USER:PASS" "$API_URL/api/docs" | head -20
```

**Expected:** `401` without auth, HTML with auth

---

## 4. Auth Flow

### 4.1 Signup

```bash
curl -s -X POST "$API_URL/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!",
    "name": "Test User",
    "tenantName": "Test Company"
  }' | jq .
```

**Expected:** `201` with `{user, tenant, role, token}`

### 4.2 Login

```bash
curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!"
  }' | jq .
```

**Expected:** `200` with `{user, tenant, role, token}`

### 4.3 Me (with token)

```bash
TOKEN="<token_from_login>"
curl -s "$API_URL/auth/me" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Expected:** `200` with `{user, tenant, role}`

---

## 5. Jobs Flow

### 5.1 Create Job

```bash
curl -s -X POST "$API_URL/jobs" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "google_maps",
    "input": {"query": "test business"}
  }' | jq .
```

**Expected:** `201` with job object (status: PENDING)

### 5.2 List Jobs

```bash
curl -s "$API_URL/jobs" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Expected:** `200` with array of jobs

---

## 6. Agent Flow

### 6.1 Acknowledge Job

```bash
JOB_ID="<job_id_from_create>"
curl -s -X POST "$API_URL/api/agent/jobs/$JOB_ID/ack" \
  -H "X-Agent-Id: test-agent-001" | jq .
```

**Expected:** `200` with job (status: RUNNING)

### 6.2 Update Progress

```bash
curl -s -X POST "$API_URL/api/agent/jobs/$JOB_ID/progress" \
  -H "X-Agent-Id: test-agent-001" \
  -H "Content-Type: application/json" \
  -d '{"progress": 50, "message": "Processing..."}' | jq .
```

**Expected:** `200` with job (progress: 50)

### 6.3 Submit Evidence

```bash
curl -s -X POST "$API_URL/api/agent/jobs/$JOB_ID/evidence" \
  -H "X-Agent-Id: test-agent-001" \
  -H "Content-Type: application/json" \
  -d '{
    "evidence": [{
      "type": "google_maps",
      "title": "Test Business",
      "source": "google_maps",
      "url": "https://maps.google.com/test",
      "snippet": "Test business info",
      "confidence": "HIGH"
    }]
  }' | jq .
```

**Expected:** `200` with `{count: 1, evidence: [...]}`

### 6.4 Mark Done

```bash
curl -s -X POST "$API_URL/api/agent/jobs/$JOB_ID/done" \
  -H "X-Agent-Id: test-agent-001" \
  -H "Content-Type: application/json" \
  -d '{"output": {"totalResults": 1}}' | jq .
```

**Expected:** `200` with job (status: COMPLETED, progress: 100)

---

## 7. Web Frontend

1. Open `$WEB_URL` in browser
2. Check Network tab - requests should go to `$API_URL`
3. Verify no CORS errors in console

---

## Quick Validation Script (PowerShell)

```powershell
$API = "https://leedz-api.onrender.com"

# Health
Write-Host "Testing /health..."
$health = Invoke-RestMethod -Uri "$API/health" -Method GET
if ($health.ok) { Write-Host "✅ Health OK" } else { Write-Host "❌ Health FAILED" }

# Root
Write-Host "Testing /..."
try {
    $root = Invoke-RestMethod -Uri "$API/" -Method GET
    Write-Host "✅ Root OK: $($root.name)"
} catch {
    Write-Host "⚠️ Root redirects (Swagger enabled)"
}
```

---

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| `502 Bad Gateway` | App not started | Check Render logs |
| `CORS error` | Origin not in allowlist | Update CORS_ORIGINS on Render |
| `401 Unauthorized` | Invalid/expired token | Re-login |
| `500 Internal Server` | DB connection issue | Check DATABASE_URL |

---

> **Last Updated:** Sprint 1 - Deploy Gate
