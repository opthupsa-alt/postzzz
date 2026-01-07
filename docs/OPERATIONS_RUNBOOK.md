# 📖 OPERATIONS RUNBOOK - Leedz

> **الإصدار:** 1.0.0  
> **آخر تحديث:** يناير 2026  
> **الغرض:** المرجع الدائم لتشغيل وصيانة مشروع Leedz

---

## 📋 جدول المحتويات

1. [ثوابت المشروع (Project Invariants)](#-ثوابت-المشروع-project-invariants)
2. [البيئات والديبلوي (Environments)](#-البيئات-والديبلوي-environments)
3. [إعداد Vercel](#-إعداد-vercel)
4. [قاعدة البيانات والمهاجرات](#-قاعدة-البيانات-والمهاجرات)
5. [التشغيل المحلي](#-التشغيل-المحلي)
6. [Troubleshooting](#-troubleshooting)

---

## 🔒 ثوابت المشروع (Project Invariants)

### القرارات المعمارية الثابتة (Non-Negotiable)

| القرار | الوصف | المرجع |
|--------|-------|--------|
| **SaaS Multi-tenant** | من البداية: Tenant/Owner/Members/RBAC/Invites/Switch Tenant/Plans/Quotas/Audit/RLS | `09-SAAS_MULTITENANCY.md` |
| **Extension = Execution Engine** | Chrome Extension Runner ينفذ في المتصفح | `11-EXTENSION_RUNNER_SPEC.md` |
| **Backend = Orchestrator** | يخطط ويخزن ويولد التقارير | `01-SYSTEM-OVERVIEW.md` |
| **Job-first** | كل عملية طويلة = Job مع progress | `06-API-REQUIREMENTS.md` |
| **Evidence-based** | كل claim يرتبط بـ Evidence | `11-EXTENSION_RUNNER_SPEC.md` |
| **Execution Window** | منفصل عن تبويبات المستخدم، لا يلمسها أبداً | `11-EXTENSION_RUNNER_SPEC.md` |

### قواعد UI/UX (لا تُكسر)

```
❌ ممنوع:
- تغيير UI/UX الموجود
- تقليص الشاشات أو حذف أزرار
- إضافة مكتبات جديدة للويب بدون تبرير مكتوب

✅ مطلوب:
- الحفاظ على 17 شاشة موجودة كما هي
- أي شاشة جديدة تُوسم "Planned" حتى تُنفذ
- توثيق أي تغيير في SPRINT_CLOSEOUT.md
```

---

## 🏗️ Hosting Reality Check

### الوضع الحالي

| Component | Platform | Status |
|-----------|----------|--------|
| **Frontend** | Vercel | ✅ يعمل |
| **Backend + WebSocket** | TBD | ⏳ يحتاج قرار |
| **Database** | Neon Postgres | ✅ جاهز |

### ⚠️ قيد مهم: Vercel و WebSocket

**Vercel Functions لا تدعم WebSocket دائم (persistent connections).**

المشروع يحتاج WebSocket للتواصل الحي بين Backend و Extension Runner. لذلك Backend **لا يمكن** أن يعيش على Vercel Functions.

### الخيارات المتاحة

#### الخيار A: Backend على منصة تدعم WebSocket دائم ✅ (مُوصى به)

```
┌─────────────────────────────────────────────────────────────────┐
│                        OPTION A                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Frontend (Vercel)                                              │
│       │                                                         │
│       ▼                                                         │
│  Backend (Railway / Render / Fly.io)                            │
│       │                                                         │
│       ├── REST API                                              │
│       ├── WebSocket Server (persistent)                         │
│       └── Job Queue                                             │
│       │                                                         │
│       ▼                                                         │
│  Database (Neon Postgres)                                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

المنصات المقترحة:
├── Railway    - سهل، يدعم WS، تسعير معقول
├── Render     - يدعم WS، free tier محدود
└── Fly.io     - يدعم WS، edge deployment
```

**المميزات:**
- WebSocket دائم بدون قيود
- Full control على Backend
- Job processing بدون timeout
- أبسط معمارياً

**العيوب:**
- تكلفة إضافية (~$5-20/شهر)
- إدارة منصتين

#### الخيار B: Realtime Provider + HTTP Backend

```
┌─────────────────────────────────────────────────────────────────┐
│                        OPTION B                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Frontend (Vercel)                                              │
│       │                                                         │
│       ▼                                                         │
│  Backend HTTP (Vercel Functions / أي منصة)                      │
│       │                                                         │
│       ├── REST API                                              │
│       └── Publishes to Realtime Provider                        │
│       │                                                         │
│       ▼                                                         │
│  Realtime Provider (Ably / Pusher / Supabase Realtime)          │
│       │                                                         │
│       ▼                                                         │
│  Extension Runner (subscribes)                                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

المزودون المقترحون:
├── Ably       - موثوق، free tier جيد
├── Pusher     - شائع، سهل
└── Supabase   - مدمج مع Postgres
```

**المميزات:**
- Backend يبقى serverless
- Scaling تلقائي
- لا حاجة لإدارة WS server

**العيوب:**
- تعقيد إضافي
- تكلفة Realtime provider
- Latency إضافي

### 📌 القرار المُوصى به

**الخيار A (Backend على Railway/Render)** لأن:
1. أبسط معمارياً
2. Full control على WebSocket
3. Job processing بدون قيود
4. تكلفة معقولة للـ MVP

---

## 🌍 البيئات والديبلوي (Environments)

### البيئات المتاحة

| البيئة | URL | الغرض | Database |
|--------|-----|-------|----------|
| **Local Dev** | `http://localhost:5173` | التطوير المحلي | Neon (dev branch) |
| **Vercel Preview** | `*.vercel.app` | مراجعة PRs | Neon (preview branch) |
| **Vercel Production** | `leedz.sa` (TBD) | الإنتاج | Neon (main branch) |

### أين تُحفظ الأسرار

| الموقع | الغرض | الملفات |
|--------|-------|---------|
| **محلياً** | التطوير المحلي | `ops/local/.env.secrets.local` |
| **Vercel Dashboard** | Preview + Production | Environment Variables |
| **Neon Console** | Connection strings | Dashboard → Connection Details |

```
⚠️ تحذير: الأسرار لا تُحفظ أبداً في:
- أي ملف tracked بالـ Git
- README أو docs/
- كود المصدر
```

---

## ⚙️ إعداد Vercel

### 1. الوصول للمشروع

```
URL: https://vercel.com/opthupsa-5935s-projects/leedz
```

### 2. Environment Variables المطلوبة

اذهب إلى: **Settings → Environment Variables**

| Variable | Preview | Production | Notes |
|----------|:-------:|:----------:|-------|
| `DATABASE_URL` | ✅ | ✅ | Pooled connection |
| `POSTGRES_URL` | ✅ | ✅ | Pooled connection |
| `DATABASE_URL_UNPOOLED` | ✅ | ✅ | For migrations |
| `POSTGRES_URL_NON_POOLING` | ✅ | ✅ | For migrations |
| `PGHOST` | ✅ | ✅ | |
| `PGUSER` | ✅ | ✅ | |
| `PGDATABASE` | ✅ | ✅ | |
| `PGPASSWORD` | ✅ | ✅ | |
| `JWT_SECRET` | ✅ | ✅ | Generate unique per env |
| `NODE_ENV` | `preview` | `production` | |

### 3. Neon Pooled vs Unpooled

```
┌─────────────────────────────────────────────────────────────────┐
│                    NEON CONNECTION TYPES                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  POOLED (DATABASE_URL, POSTGRES_URL)                            │
│  ├── Port: 5432                                                 │
│  ├── Use for: Runtime/Application queries                       │
│  ├── Connection limit: High (pooled)                            │
│  └── SSL: Required (sslmode=require)                            │
│                                                                  │
│  UNPOOLED (DATABASE_URL_UNPOOLED, POSTGRES_URL_NON_POOLING)     │
│  ├── Port: 5432 (different host)                                │
│  ├── Use for: Migrations ONLY                                   │
│  ├── Connection limit: Low (direct)                             │
│  └── SSL: Required                                              │
│                                                                  │
│  ⚠️ NEVER use unpooled for runtime queries                      │
│  ⚠️ ALWAYS use unpooled for migrations                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4. بعد تغيير Environment Variables

```bash
# يجب إعادة الديبلوي لتطبيق التغييرات
# من Vercel Dashboard: Deployments → Redeploy
```

---

## 🗄️ قاعدة البيانات والمهاجرات

### الحالة الحالية

```
📊 Database: Neon Postgres
📦 ORM: Prisma
🔄 Migrations: Prisma Migrate
📁 Schema: api/prisma/schema.prisma
```

### أوامر قاعدة البيانات

```bash
# من مجلد api/ أو من root

# Generate Prisma Client (بعد تغيير schema)
npm run db:generate

# Run migrations (production/preview)
npm run db:migrate

# Create new migration (development)
npm run db:migrate:dev

# Push schema changes without migration (dev only)
npm run db:push

# Open Prisma Studio (database GUI)
npm run db:studio

# Seed initial data
npm run db:seed
```

### Prisma Schema Location

```
api/prisma/schema.prisma
```

### Connection Configuration

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")           // Pooled - for runtime
  directUrl = env("DATABASE_URL_UNPOOLED")  // Unpooled - for migrations
}
```

---

## 🚀 التشغيل المحلي

### المتطلبات

```
- Node.js >= 18
- npm
- Git
```

### خطوات التشغيل

#### 1. Clone & Install

```bash
git clone <repo-url>
cd leedz

# Install dependencies for API
cd api
npm install

# Install dependencies for Web
cd ../web
npm install
```

#### 2. إعداد Environment Variables

```bash
# API Backend
cp api/.env.example api/.env
# ثم افتح api/.env وأضف القيم من ops/local/.env.secrets.local

# Web Frontend (إذا لزم الأمر)
cp .env.example web/.env.local
```

#### 3. تشغيل قاعدة البيانات

```bash
cd api

# Generate Prisma Client
npm run db:generate

# Run migrations (يحتاج DATABASE_URL_UNPOOLED)
npm run db:migrate
```

#### 4. تشغيل السيرفرات

```bash
# Terminal 1: API Backend
cd api
npm run dev
# → http://localhost:3001
# → Swagger: http://localhost:3001/api/docs

# Terminal 2: Web Frontend
cd web
npm run dev
# → http://localhost:5173
```

### Scripts المتاحة

#### Root (من مجلد leedz/)

| Script | Command | Description |
|--------|---------|-------------|
| `dev:api` | `npm run dev:api` | Start API dev server |
| `dev:web` | `npm run dev:web` | Start Web dev server |
| `build:api` | `npm run build:api` | Build API |
| `build:web` | `npm run build:web` | Build Web |
| `db:migrate` | `npm run db:migrate` | Run DB migrations |
| `db:studio` | `npm run db:studio` | Open Prisma Studio |

#### API (من مجلد api/)

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `npm run dev` | Start dev server (watch mode) |
| `build` | `npm run build` | Build for production |
| `start:prod` | `npm run start:prod` | Start production server |
| `db:generate` | `npm run db:generate` | Generate Prisma Client |
| `db:migrate` | `npm run db:migrate` | Run migrations |
| `db:migrate:dev` | `npm run db:migrate:dev` | Create new migration |
| `db:studio` | `npm run db:studio` | Open Prisma Studio |

#### Web (من مجلد web/)

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `npm run dev` | Start dev server (Vite) |
| `build` | `npm run build` | Build for production |
| `preview` | `npm run preview` | Preview production build |

---

## 🔧 Troubleshooting

### 1. مشاكل اتصال Database

#### Error: `SSL required`

```bash
# تأكد أن connection string يحتوي على sslmode=require
DATABASE_URL="postgresql://...?sslmode=require"
```

#### Error: `Too many connections`

```bash
# استخدم Pooled connection للـ runtime
# استخدم Unpooled فقط للـ migrations
```

#### Error: `Connection timeout`

```bash
# تأكد من:
# 1. Neon project is active (not suspended)
# 2. IP not blocked
# 3. Correct credentials
```

### 2. مشاكل Vercel Environment Variables

#### Variables not working

```bash
# 1. تأكد من اختيار البيئة الصحيحة (Preview/Production)
# 2. أعد الديبلوي بعد التغيير
# 3. تأكد من عدم وجود spaces في القيم
```

#### Build fails with missing env

```bash
# تأكد أن المتغيرات مضافة لـ "Build" environment
# وليس فقط "Runtime"
```

### 3. مشاكل CORS مع Chrome Extension

```typescript
// في Backend (NestJS) - سيُضاف في Sprint 1
const corsOptions = {
  origin: [
    'https://app.leedz.sa',
    'http://localhost:5173',
    'chrome-extension://<EXTENSION_ID>'  // أضف ID الإضافة
  ],
  credentials: true
};
```

### 4. مشاكل Agent WebSocket

#### Connection drops

```typescript
// تأكد من:
// 1. Heartbeat كل 25 ثانية
// 2. Reconnect logic مع exponential backoff
// 3. Offline queue للرسائل المعلقة
```

#### Jobs not received

```bash
# تحقق من:
# 1. WebSocket connection state
# 2. Authentication token valid
# 3. Agent registered with backend
```

### 5. أخطاء شائعة

| Error | Cause | Solution |
|-------|-------|----------|
| `ECONNREFUSED` | DB not running | Check Neon status |
| `401 Unauthorized` | Invalid/expired token | Re-login |
| `403 Forbidden` | Missing permission | Check RBAC role |
| `429 Too Many Requests` | Rate limited | Wait and retry |
| `500 Internal Server` | Backend error | Check logs |

---

## 🚀 Render Deployment (Backend API)

### لماذا Render وليس Vercel؟

- Vercel للـ Frontend فقط (Serverless)
- Backend يحتاج WebSocket دائم + long-running processes
- Render Free يدعم ذلك

### خطوات النشر على Render

#### 1. إنشاء Web Service

1. افتح [render.com/dashboard](https://render.com/dashboard)
2. New → Web Service
3. Connect your GitHub repo
4. Configure:
   - **Name:** `leedz-api`
   - **Root Directory:** `api`
   - **Runtime:** Node
   - **Build Command:** `npm ci && npx prisma generate && npm run build`
   - **Start Command:** `node dist/main.js`
   - **Plan:** Free

#### 2. Environment Variables (على Render)

أضف هذه المتغيرات (بدون القيم هنا - أضفها من Neon Dashboard):

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Neon Pooled connection string |
| `DATABASE_URL_UNPOOLED` | Neon Direct connection string |
| `JWT_SECRET` | Random 64+ character string |
| `CORS_ORIGINS` | `https://your-vercel-app.vercel.app,http://localhost:5173` |

#### 3. Health Check

- **Path:** `/health`
- Render سيستخدم هذا للتحقق من صحة السيرفر

#### 4. بعد النشر

```bash
# تحقق من الـ API
curl https://leedz-api.onrender.com/health

# يجب أن يرجع:
# {"ok":true,"version":"1.0.0",...}
```

### ⚠️ ملاحظات Render Free

| الميزة | القيمة |
|--------|--------|
| Sleep after inactivity | 15 minutes |
| Cold start time | ~30 seconds |
| Monthly hours | 750 hours |

**للتعامل مع Sleep:**
- Extension يجب أن يتعامل مع reconnection
- أول request بعد sleep سيكون بطيء

---

## 📞 جهات الاتصال

| Service | Dashboard | Support |
|---------|-----------|---------|
| **Vercel** | vercel.com/dashboard | vercel.com/support |
| **Neon** | console.neon.tech | neon.tech/docs |
| **Render** | render.com/dashboard | render.com/docs |

---

## 📚 مراجع إضافية

- [Analysis Pack v2.1](./README.md) - التوثيق الكامل
- [DIFF_SUMMARY.md](./DIFF_SUMMARY.md) - ملخص التغييرات
- [SPRINT_CLOSEOUT.md](./SPRINT_CLOSEOUT.md) - إغلاق السبرنتات

---

> **تحديث هذا الملف:** عند أي تغيير في البيئة أو الإعدادات أو الأوامر
