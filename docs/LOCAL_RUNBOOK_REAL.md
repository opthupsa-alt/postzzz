# 📖 LOCAL RUNBOOK (REAL) - Leedz Project

> **تاريخ التحديث:** 2026-01-07
> **الغرض:** دليل تشغيل المشروع محلياً مع أوامر حقيقية مختبرة

---

## 📋 المتطلبات

| Requirement | Version | Check Command |
|-------------|---------|---------------|
| Node.js | ≥18.0.0 | `node --version` |
| npm | ≥9.0.0 | `npm --version` |
| Git | Any | `git --version` |
| PowerShell | 5.1+ | `$PSVersionTable.PSVersion` |

---

## 🗂️ هيكل المشروع

```
D:\projects\leedz\
├── api/                    # NestJS Backend (port 3001)
├── web/                    # React Frontend (port 3000)
├── leedz_extension chrome/ # Chrome Extension
├── docs/                   # Documentation
└── ops/                    # Operations scripts
```

---

## 🔧 إعداد البيئة المحلية

### 1. Clone & Install

```powershell
# Clone (if not already)
git clone https://github.com/opthupsa-alt/leedz.git
cd D:\projects\leedz

# Install root dependencies
npm install

# Install API dependencies
cd api
npm install

# Install Web dependencies
cd ../web
npm install
```

### 2. إعداد Environment Variables

#### API (.env)

```powershell
# إنشاء ملف api/.env
# انسخ من .env.example وعدّل القيم
Copy-Item api\.env.example api\.env
```

**المتغيرات المطلوبة (بدون القيم الحساسة):**

```env
# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://[USER]:[PASSWORD]@[HOST]/[DB]?sslmode=require
DATABASE_URL_UNPOOLED=postgresql://[USER]:[PASSWORD]@[HOST-DIRECT]/[DB]?sslmode=require

# JWT
JWT_SECRET=[64+ random characters]
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# Swagger (optional)
SWAGGER_ENABLED=1
SWAGGER_USER=admin
SWAGGER_PASS=[password]
```

#### Web (.env.local)

```powershell
# إنشاء ملف web/.env.local
Copy-Item web\.env.example web\.env.local
```

**المتغيرات المطلوبة:**

```env
VITE_API_BASE_URL=http://localhost:3001
```

---

## 🚀 تشغيل API محلياً

### Terminal 1: API Server

```powershell
cd D:\projects\leedz\api

# Generate Prisma Client
npx prisma generate

# Check migration status
npx prisma migrate status

# Apply migrations (if needed)
npx prisma migrate deploy

# Start dev server
npm run dev
```

**Expected Output:**
```
🚀 Leedz API running on port 3001
📚 Swagger docs: http://localhost:3001/api/docs
```

### التحقق من API

```powershell
# Health check
Invoke-RestMethod -Uri "http://localhost:3001/health"
```

**Expected:**
```json
{
  "ok": true,
  "version": "1.0.0",
  "environment": "development"
}
```

---

## 🌐 تشغيل Web محلياً

### Terminal 2: Web Server

```powershell
cd D:\projects\leedz\web

# Start dev server
npm run dev
```

**Expected Output:**
```
VITE v6.4.1  ready in 400 ms
➜  Local:   http://localhost:3000/
```

### فتح الواجهة

افتح في المتصفح: http://localhost:3000

---

## 🧩 تحميل Extension محلياً

### 1. افتح Chrome Extensions

```
chrome://extensions/
```

### 2. Enable Developer Mode

Toggle "Developer mode" في أعلى اليمين

### 3. Load Unpacked

1. اضغط "Load unpacked"
2. اختر المجلد:
   ```
   D:\projects\leedz\leedz_extension chrome\extension\dist
   ```

### 4. تحقق من التحميل

- يجب أن يظهر "Leadzzz (ليدززز)" في القائمة
- اضغط على أيقونة الـ Extension لفتح Side Panel

### ⚠️ ملاحظة مهمة

الـ Extension حالياً يشير لـ port 8787. لتصحيحه:

1. افتح Side Panel
2. غيّر "API Base" إلى: `http://localhost:3001`
3. اضغط Enter

---

## 🧪 Smoke Tests

### تشغيل Smoke Tests الآلية

```powershell
cd D:\projects\leedz
.\ops\smoke-local.ps1
```

**Expected Output:**
```
═══════════════════════════════════════════════════════════════
  LEEDZ LOCAL SMOKE TESTS
  API: http://localhost:3001
═══════════════════════════════════════════════════════════════

[PASS] GET /health
[PASS] POST /auth/signup
[PASS] POST /auth/signup (no name) → 400
[PASS] POST /auth/login
[PASS] POST /auth/login (wrong pass) → 401
[PASS] POST /auth/login (no user) → 401
[PASS] GET /auth/me
[PASS] GET /auth/me (no token) → 401
[PASS] GET /jobs

═══════════════════════════════════════════════════════════════
  RESULTS: 9 passed, 0 failed
═══════════════════════════════════════════════════════════════
```

### Smoke Tests اليدوية

#### 1. Health Check

```powershell
Invoke-RestMethod -Uri "http://localhost:3001/health"
```

#### 2. Signup

```powershell
$body = @{
  name = "Test User"
  email = "test$(Get-Date -Format 'HHmmss')@example.com"
  password = "TestPass123!"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3001/auth/signup" -Method POST -Body $body -ContentType "application/json"
```

#### 3. Login

```powershell
$body = @{
  email = "test@example.com"
  password = "TestPass123!"
} | ConvertTo-Json

$login = Invoke-RestMethod -Uri "http://localhost:3001/auth/login" -Method POST -Body $body -ContentType "application/json"
$token = $login.token
```

#### 4. Auth/Me

```powershell
$headers = @{ Authorization = "Bearer $token" }
Invoke-RestMethod -Uri "http://localhost:3001/auth/me" -Headers $headers
```

#### 5. Create Job

```powershell
$jobBody = @{
  type = "PROSPECT_SEARCH"
  input = @{ query = "test company" }
} | ConvertTo-Json -Depth 3

Invoke-RestMethod -Uri "http://localhost:3001/jobs" -Method POST -Headers $headers -Body $jobBody -ContentType "application/json"
```

---

## 🔧 Troubleshooting

### Error: Port 3001 already in use

```powershell
# Find process using port 3001
Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | Select-Object OwningProcess

# Kill process
Stop-Process -Id [PID] -Force
```

### Error: Prisma Client not generated

```powershell
cd D:\projects\leedz\api
npx prisma generate
```

### Error: Database connection failed

1. تحقق من `api/.env` يحتوي على DATABASE_URL صحيح
2. تأكد من استخدام `sslmode=require`
3. تحقق من Neon Dashboard أن الـ database متاحة

### Error: CORS blocked

تأكد من أن `CORS_ORIGINS` في `api/.env` يحتوي على:
```
http://localhost:3000,http://localhost:5173
```

### Error: Tailwind not loading

تأكد من وجود Tailwind CDN في `web/index.html`:
```html
<script src="https://cdn.tailwindcss.com"></script>
```

### Error: Extension not connecting

1. تحقق من API يعمل على port 3001
2. غيّر API Base في Extension إلى `http://localhost:3001`
3. تحقق من CORS يسمح بـ chrome-extension://

### Error: Login returns 500

1. تحقق من logs في API terminal
2. تأكد من وجود المستخدم في قاعدة البيانات
3. تحقق من JWT_SECRET في .env

---

## 📊 Ports Summary

| Service | Port | URL |
|---------|------|-----|
| API | 3001 | http://localhost:3001 |
| Web | 3000 | http://localhost:3000 |
| Swagger | 3001 | http://localhost:3001/api/docs |
| Prisma Studio | 5555 | `npx prisma studio` |

---

## 🛑 إيقاف الخدمات

```powershell
# إيقاف كل Node processes
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
```

---

## 📝 أوامر مفيدة

```powershell
# Prisma Studio (DB GUI)
cd D:\projects\leedz\api
npx prisma studio

# Reset database (CAUTION!)
npx prisma migrate reset

# Generate new migration
npx prisma migrate dev --name [migration_name]

# Build API for production
npm run build

# Build Web for production
cd D:\projects\leedz\web
npm run build
```

---

> **آخر تحديث:** 2026-01-07
