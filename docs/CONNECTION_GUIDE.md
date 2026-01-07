# 🔗 Leedz Connection Guide

> دليل شامل لإعداد وربط جميع خدمات المشروع

---

## 📊 نظرة عامة على البنية التحتية

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│    Backend      │────▶│   Database      │
│   (Vercel)      │     │   (Render)      │     │   (Neon)        │
│                 │     │                 │     │                 │
│ leedz.vercel.app│     │leedz-api.       │     │ PostgreSQL      │
│                 │     │onrender.com     │     │ (Pooled/Direct) │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## 🗄️ قاعدة البيانات (Neon PostgreSQL)

### معلومات الاتصال

| Parameter | Value |
|-----------|-------|
| **Host (Pooled)** | `ep-patient-forest-a4000zkv-pooler.us-east-1.aws.neon.tech` |
| **Host (Direct)** | `ep-patient-forest-a4000zkv.us-east-1.aws.neon.tech` |
| **Database** | `neondb` |
| **User** | `neondb_owner` |
| **Region** | `us-east-1` |

### Connection Strings

#### Pooled (للـ Production Runtime)
```
postgresql://neondb_owner:npg_PXr6zJD5huKO@ep-patient-forest-a4000zkv-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require
```

#### Direct (للـ Migrations و Local Development)
```
postgresql://neondb_owner:npg_PXr6zJD5huKO@ep-patient-forest-a4000zkv.us-east-1.aws.neon.tech/neondb?sslmode=require
```

### متى تستخدم كل نوع؟

| Use Case | Connection Type | Why |
|----------|-----------------|-----|
| Production API | **Pooled** | أفضل أداء، يدير الاتصالات تلقائياً |
| Prisma Migrations | **Direct** | Migrations تحتاج اتصال مباشر |
| Local Development | **Direct** | أسهل للتصحيح، لا مشاكل pooler |

### الجداول الموجودة (9 جداول)

| Table | Description |
|-------|-------------|
| `User` | المستخدمين |
| `Tenant` | المنظمات/الشركات |
| `Membership` | عضوية المستخدم في Tenant |
| `Job` | وظائف البحث |
| `JobLog` | سجلات تنفيذ الوظائف |
| `Evidence` | الأدلة المجمعة |
| `AuditLog` | سجل التدقيق |
| `Plan` | خطط الاشتراك |
| `Invite` | دعوات الانضمام |

---

## 🖥️ Backend (Render)

### URLs

| Environment | URL |
|-------------|-----|
| **Production** | https://leedz-api.onrender.com |
| **Health Check** | https://leedz-api.onrender.com/health |
| **Swagger Docs** | https://leedz-api.onrender.com/api/docs |

### Dashboard
https://dashboard.render.com/project/prj-d5f4r015pdvs73fuepjg

### Environment Variables (Required)

| Variable | Value | Description |
|----------|-------|-------------|
| `NODE_ENV` | `production` | بيئة التشغيل |
| `DATABASE_URL` | `postgresql://...pooler...` | Pooled connection |
| `DATABASE_URL_UNPOOLED` | `postgresql://...direct...` | Direct connection (migrations) |
| `JWT_SECRET` | `[64+ chars secure random]` | مفتاح توقيع JWT |
| `JWT_EXPIRES_IN` | `7d` | مدة صلاحية Token |
| `CORS_ORIGINS` | `https://leedz.vercel.app,https://leedz-git-main-opthupsa-5935s-projects.vercel.app,http://localhost:3000` | المواقع المسموح بها |
| `SWAGGER_ENABLED` | `1` | تفعيل Swagger |
| `SWAGGER_USER` | `admin` | اسم مستخدم Swagger |
| `SWAGGER_PASS` | `[secure password]` | كلمة مرور Swagger |

### Build & Start Commands

| Setting | Value |
|---------|-------|
| **Root Directory** | `api` |
| **Build Command** | `npm ci && npx prisma generate && npx prisma migrate deploy && npm run build` |
| **Start Command** | `node dist/main.js` |
| **Health Check Path** | `/health` |

---

## 🌐 Frontend (Vercel)

### URLs

| Environment | URL |
|-------------|-----|
| **Production** | https://leedz.vercel.app |
| **Preview** | https://leedz-git-main-opthupsa-5935s-projects.vercel.app |

### Dashboard
https://vercel.com/opthupsa-5935s-projects/leedz

### Environment Variables (Required)

| Variable | Value | Description |
|----------|-------|-------------|
| `VITE_API_BASE_URL` | `https://leedz-api.onrender.com` | عنوان الـ API |

### Build Settings

| Setting | Value |
|---------|-------|
| **Root Directory** | `web` |
| **Framework** | Vite |
| **Build Command** | `npm ci && npm run build` |
| **Output Directory** | `dist` |

---

## 💻 Local Development

### ملفات البيئة المطلوبة

#### `api/.env`
```env
# Database (Direct connection for local)
DATABASE_URL=postgresql://neondb_owner:npg_PXr6zJD5huKO@ep-patient-forest-a4000zkv.us-east-1.aws.neon.tech/neondb?sslmode=require
DATABASE_URL_UNPOOLED=postgresql://neondb_owner:npg_PXr6zJD5huKO@ep-patient-forest-a4000zkv.us-east-1.aws.neon.tech/neondb?sslmode=require

# JWT
JWT_SECRET=leedz-local-dev-secret-key-change-in-production-64chars-minimum-here
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# Swagger
SWAGGER_ENABLED=1
SWAGGER_USER=admin
SWAGGER_PASS=leedz2026

# Server
PORT=3001
NODE_ENV=development
```

#### `web/.env.local`
```env
VITE_API_BASE_URL=http://localhost:3001
```

### أوامر التشغيل

```powershell
# Terminal 1: API
cd D:\projects\leedz\api
npm run dev
# → http://localhost:3001

# Terminal 2: Web
cd D:\projects\leedz\web
npm run dev
# → http://localhost:3000
```

---

## 🔧 Troubleshooting

### مشكلة: `Can't reach database server`

**السبب:** Neon Pooler لا يعمل من شبكتك

**الحل:** استخدم Direct connection (بدون `-pooler` في الـ host)

### مشكلة: `EPERM: operation not permitted` (Prisma)

**السبب:** ملف Prisma مقفل من عملية Node

**الحل:**
```powershell
Get-Process -Name "node" | Stop-Process -Force
npx prisma generate
```

### مشكلة: CORS Error في المتصفح

**السبب:** `CORS_ORIGINS` على Render لا يشمل URL الـ frontend

**الحل:** أضف URL الـ frontend إلى `CORS_ORIGINS` على Render

### مشكلة: 401 Unauthorized

**السبب:** Token منتهي أو غير صحيح

**الحل:** أعد تسجيل الدخول للحصول على token جديد

---

## 📋 Checklist للإعداد الكامل

### Local Development
- [x] Clone repository
- [x] `npm install` in `api/` and `web/`
- [x] Create `api/.env` with database credentials
- [x] Create `web/.env.local` with API URL
- [x] `npx prisma generate` in `api/`
- [x] `npm run dev` in both folders

### Render (Backend)
- [x] Connect GitHub repo
- [x] Set Root Directory: `api`
- [x] Set Build Command
- [x] Set Start Command
- [x] Add all environment variables
- [ ] Update CORS_ORIGINS with Vercel URLs

### Vercel (Frontend)
- [x] Connect GitHub repo
- [x] Set Root Directory: `web`
- [x] Set Build Command
- [ ] Add `VITE_API_BASE_URL` environment variable

### Neon (Database)
- [x] Database created
- [x] Tables migrated (9 tables)
- [x] Connection tested

---

## 🔐 Security Notes

1. **Never commit `.env` files** - They contain secrets
2. **Use strong JWT_SECRET** - At least 64 random characters
3. **Rotate passwords regularly** - Especially database password
4. **Use Pooled connection in production** - Better security and performance
5. **Enable SSL** - Always use `sslmode=require`

---

> **آخر تحديث:** Jan 7, 2026
