# 📋 SPRINT CLOSEOUT - Leedz

> **الغرض:** ذاكرة تشغيل المشروع - يُحدث بعد كل سبرنت/تغيير رئيسي

---

## Sprint 0 Hardening ✅

**التاريخ:** يناير 2026  
**الحالة:** مكتمل

### ما تم إنجازه ✅

| المهمة | الملف/المجلد | الحالة |
|--------|-------------|--------|
| إنشاء مجلد الأسرار المحلي | `ops/local/` | ✅ |
| ملف الأسرار المحلي | `ops/local/.env.secrets.local` | ✅ |
| توثيق الأسرار المحلي | `ops/local/SECRETS.md` | ✅ |
| قالب Environment Variables | `.env.example` | ✅ |
| تحديث .gitignore للأسرار | `.gitignore` (root) | ✅ |
| دليل التشغيل | `docs/OPERATIONS_RUNBOOK.md` | ✅ |
| تحديث README | `docs/README.md` | ✅ |
| ملف إغلاق السبرنتات | `docs/SPRINT_CLOSEOUT.md` | ✅ |
| **الأسرار تم تثبيتها محلياً** | `ops/local/.env.secrets.local` | ✅ |
| **Secrets verified locally** | Sprint 1 Gate passed | ✅ |
| Hosting Reality Check | `docs/OPERATIONS_RUNBOOK.md` | ✅ |
| ملف الثوابت | `docs/PROJECT_CONSTANTS.md` | ✅ |
| خطة Sprint 1 | `docs/SPRINT_1_BACKEND_FOUNDATION_PLAN.md` | ✅ |

### الملفات المُنشأة/المُعدّلة

```
leedz/
├── .gitignore                          # NEW - root gitignore with secrets protection
├── .env.example                        # NEW - template without secrets
├── ops/
│   └── local/
│       ├── .env.secrets.local          # UPDATED - actual secrets (gitignored)
│       └── SECRETS.md                  # UPDATED - secrets documentation (gitignored)
└── docs/
    ├── README.md                       # UPDATED - added How to Run section
    ├── OPERATIONS_RUNBOOK.md           # UPDATED - added Hosting Reality Check
    ├── PROJECT_CONSTANTS.md            # NEW - project invariants
    ├── SPRINT_1_BACKEND_FOUNDATION_PLAN.md  # NEW - Sprint 1 planning
    └── SPRINT_CLOSEOUT.md              # UPDATED - this file
```

### قرارات ثبتناها

| القرار | التفاصيل | السبب |
|--------|----------|-------|
| مجلد الأسرار | `ops/local/` | فصل واضح عن الكود |
| سياسة الأسرار | لا أسرار في tracked files | أمان |
| Neon Pooled vs Unpooled | Pooled للـ runtime، Unpooled للـ migrations | أداء + استقرار |
| Backend Hosting | Railway/Render (ليس Vercel) | WebSocket دائم مطلوب |
| Backend Stack | NestJS + Prisma (مقترح) | Type-safe, modular, WS support |
| Backend Location | `api/` في نفس الريبو | Monorepo أبسط |

### ما لم يتم (TBD)

| المهمة | السبب | متى |
|--------|-------|-----|
| اختيار ORM | يحتاج تقييم (Prisma vs Drizzle) | Sprint 1 |
| إعداد Backend | لا يوجد backend بعد | Sprint 1 |
| إعداد Migrations | يعتمد على ORM | Sprint 1 |
| JWT Secret generation | يحتاج backend | Sprint 1 |

### مخاطر/تحذيرات ⚠️

| المخاطر | الاحتمالية | التأثير | التخفيف |
|---------|-----------|--------|---------|
| تسرب الأسرار | منخفض | عالي | .gitignore + مراجعة PRs |
| Neon cold start | متوسط | منخفض | Connection pooling |
| Vercel env sync | متوسط | متوسط | توثيق في Runbook |

### خطوات تحقق سريعة (Smoke Tests)

```bash
# 1. تأكد أن الأسرار محمية
git status
# يجب ألا يظهر: ops/local/ أو .env.secrets.local

# 2. تأكد من وجود .env.example
ls .env.example
# يجب أن يكون موجوداً

# 3. تأكد من .gitignore
cat .gitignore | grep "ops/local"
# يجب أن يظهر: ops/local/

# 4. تشغيل الـ frontend
cd web && pnpm dev
# يجب أن يعمل على http://localhost:5173
```

---

## Sprint 1: Backend Foundation ✅

**التاريخ:** يناير 2026  
**الحالة:** مكتمل

### ما تم إنجازه ✅

| المهمة | الملف/المجلد | الحالة |
|--------|-------------|--------|
| إنشاء NestJS Backend | `api/` | ✅ |
| إعداد Prisma ORM | `api/prisma/schema.prisma` | ✅ |
| Health Endpoint | `GET /health` | ✅ |
| Auth Module (signup/login/me) | `api/src/auth/` | ✅ |
| Tenants Module | `api/src/tenants/` | ✅ |
| Users/Team Module | `api/src/users/` | ✅ |
| Invites Module | `api/src/invites/` | ✅ |
| Jobs Module | `api/src/jobs/` | ✅ |
| Agent/Runner Endpoints | `api/src/agent/` | ✅ |
| WebSocket Gateway | `api/src/agent/agent.gateway.ts` | ✅ |
| Audit Logging | `api/src/audit/` | ✅ |
| RBAC Guards & Permissions | `api/src/common/` | ✅ |
| Swagger Documentation | `/api/docs` | ✅ |
| Root package.json scripts | `package.json` | ✅ |
| Runbook تحديث | `docs/OPERATIONS_RUNBOOK.md` | ✅ |

### الملفات المُنشأة

```
leedz/
├── package.json                        # NEW - root monorepo scripts
├── api/
│   ├── package.json                    # NEW - NestJS dependencies
│   ├── tsconfig.json                   # NEW - TypeScript config
│   ├── nest-cli.json                   # NEW - NestJS CLI config
│   ├── .env.example                    # NEW - API env template
│   ├── .gitignore                      # NEW - API gitignore
│   ├── prisma/
│   │   └── schema.prisma               # NEW - Database schema
│   └── src/
│       ├── main.ts                     # NEW - Entry point
│       ├── app.module.ts               # NEW - Root module
│       ├── prisma/                     # NEW - Prisma service
│       ├── health/                     # NEW - Health endpoint
│       ├── auth/                       # NEW - Auth (signup/login/JWT)
│       ├── tenants/                    # NEW - Tenant management
│       ├── users/                      # NEW - Team management
│       ├── invites/                    # NEW - Invite system
│       ├── jobs/                       # NEW - Job orchestration
│       ├── agent/                      # NEW - Runner/Agent API + WS
│       ├── audit/                      # NEW - Audit logging
│       └── common/                     # NEW - Guards, decorators, constants
└── docs/
    ├── OPERATIONS_RUNBOOK.md           # UPDATED - Real commands
    └── SPRINT_CLOSEOUT.md              # UPDATED - This file
```

### Database Schema (Prisma)

```
Models: Tenant, User, Membership, Invite, Job, JobLog, Evidence, AuditLog, Plan
Enums: Role (OWNER, ADMIN, MANAGER, SALES), JobStatus, InviteStatus
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/auth/signup` | POST | Register + create tenant |
| `/auth/login` | POST | Login |
| `/auth/me` | GET | Current user info |
| `/tenants` | GET | User's tenants |
| `/tenants/switch` | POST | Switch tenant |
| `/users/team` | GET | Team members |
| `/users/:id/role` | PATCH | Update role |
| `/invites` | GET/POST | List/Create invites |
| `/invites/accept` | POST | Accept invite |
| `/jobs` | GET/POST | List/Create jobs |
| `/jobs/:id` | GET | Job details |
| `/jobs/:id/cancel` | POST | Cancel job |
| `/api/agent/config` | GET | Agent config |
| `/api/agent/heartbeat` | POST | Agent heartbeat |
| `/api/agent/jobs/:id/ack` | POST | Acknowledge job |
| `/api/agent/jobs/:id/progress` | POST | Update progress |
| `/api/agent/jobs/:id/evidence` | POST | Submit evidence |
| `/api/agent/jobs/:id/done` | POST | Mark done |

### قرارات ثبتناها

| القرار | التفاصيل | السبب |
|--------|----------|-------|
| ORM | Prisma | Type-safe, migrations, studio |
| Backend Framework | NestJS | Modular, TypeScript, WS support |
| Package Manager | npm | Simplicity |
| API Port | 3001 | Avoid conflict with frontend |
| WebSocket | Socket.io via NestJS | Real-time Runner communication |

### DoD Verification ✅

```
✅ api/ يعمل محليًا (npm run build passes)
✅ Prisma schema defined with all required models
✅ Auth endpoints implemented (signup/login/me)
✅ Tenants + Invites + RBAC implemented
✅ Jobs + Agent endpoints implemented
✅ Audit logging implemented
✅ Runbook محدث بأوامر حقيقية
✅ لا أسرار داخل tracked files
✅ لا تغيير في UI
```

### Smoke Test Results ✅ (2026-01-07)

| Test | Endpoint | Status |
|------|----------|--------|
| Root | `GET /` | ✅ 200 |
| Health | `GET /health` | ✅ 200 |
| Signup | `POST /auth/signup` | ✅ 201 |
| Login | `POST /auth/login` | ✅ 200 |
| Me | `GET /auth/me` | ✅ 200 |
| Create Job | `POST /jobs` | ✅ 201 |
| Agent ACK | `POST /api/agent/jobs/:id/ack` | ✅ 200 |
| Agent Progress | `POST /api/agent/jobs/:id/progress` | ✅ 200 |
| Agent Evidence | `POST /api/agent/jobs/:id/evidence` | ✅ 200 |
| Agent Done | `POST /api/agent/jobs/:id/done` | ✅ 200 |
| Get Job | `GET /jobs/:id` | ✅ 200 (COMPLETED, evidence: 1) |

**Full pipeline verified:** Job created → ACK → Progress → Evidence (with hash) → Done → Status COMPLETED

### Render Deployment (Ready for Manual Deploy)

**Status:** Code ready - Manual dashboard deploy required (RENDER_API_KEY not available)

**Configuration:**
- **Service Name:** `leedz-api`
- **Root Directory:** `api`
- **Build Command:** `npm ci && npx prisma generate && npx prisma migrate deploy && npm run build`
- **Start Command:** `node dist/main.js`
- **Health Check:** `/health`
- **Plan:** Free

**Environment Variables المطلوبة على Render:**

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | (من Neon - Pooled) |
| `DATABASE_URL_UNPOOLED` | (من Neon - Direct) |
| `JWT_SECRET` | (Generate 64+ chars) |
| `CORS_ORIGINS` | `https://leedz-web.vercel.app,http://localhost:5173` |
| `SWAGGER_ENABLED` | `1` |
| `SWAGGER_USER` | (Generate) |
| `SWAGGER_PASS` | (Generate) |

### Vercel Deployment (Ready for Manual Deploy)

**Status:** Code ready - Manual dashboard deploy required (VERCEL_TOKEN not available)

**Configuration:**
- **Root Directory:** `web`
- **Framework:** Vite
- **Build Command:** `npm ci && npm run build`
- **Output Directory:** `dist`

**Environment Variables المطلوبة على Vercel:**

| Variable | Value |
|----------|-------|
| `VITE_API_BASE_URL` | `https://leedz-api.onrender.com` |

### BLOCKERS

| Blocker | Impact | Workaround |
|---------|--------|------------|
| `RENDER_API_KEY` missing | Cannot auto-deploy API | Manual Render Dashboard deploy |
| `VERCEL_TOKEN` missing | Cannot auto-deploy Web | Manual Vercel Dashboard deploy |

### ما لم يتم (TBD for Sprint 2)

| المهمة | السبب | متى |
|--------|-------|-----|
| Execute Render Deploy | Manual action needed | Now |
| Execute Vercel Deploy | Manual action needed | Now |
| RLS policies | يحتاج PostgreSQL setup | Sprint 2 |
| Email sending for invites | يحتاج email service | Sprint 2 |
| Frontend-Backend integration | بعد Render URL | Sprint 2 |

### مخاطر/تحذيرات ⚠️

| المخاطر | الاحتمالية | التأثير | التخفيف |
|---------|-----------|--------|---------|
| Render Free tier sleep | عالي | متوسط | Upgrade أو keep-alive |
| WebSocket disconnects | متوسط | متوسط | Reconnection logic in Runner |

---

## 📅 سجل التحديثات

| التاريخ | السبرنت | التغيير | بواسطة |
|---------|---------|---------|--------|
| يناير 2026 | Sprint 0 Prep | إعداد Ops الأولي | - |
| يناير 2026 | Sprint 0 Hardening | Secrets + Hosting + Constants + Sprint 1 Plan | - |
| يناير 2026 | Sprint 1 | Backend Foundation (NestJS + Prisma + Auth + Jobs + Agent) | - |
| يناير 2026 | Sprint 1 | Smoke Tests passed + Render config ready | - |
| يناير 2026 | Sprint 1 | Swagger Basic Auth + Deploy configs finalized | - |
| يناير 2026 | Sprint 1 | POST_DEPLOY_SMOKETEST.md created + Final deploy prep | - |

---

## 🔧 Manual Deploy Checklists

### Render API Checklist

1. [ ] Open https://render.com/dashboard
2. [ ] New → Web Service → Connect `opthupsa-alt/leedz`
3. [ ] **Root Directory:** `api`
4. [ ] **Build Command:** `npm ci && npx prisma generate && npx prisma migrate deploy && npm run build`
5. [ ] **Start Command:** `node dist/main.js`
6. [ ] **Health Check Path:** `/health`
7. [ ] Add Environment Variables:
   - [ ] `NODE_ENV` = `production`
   - [ ] `DATABASE_URL` = *(from Neon - Pooled)*
   - [ ] `DATABASE_URL_UNPOOLED` = *(from Neon - Direct)*
   - [ ] `JWT_SECRET` = *(generate 64+ chars)*
   - [ ] `CORS_ORIGINS` = `https://leedz-web.vercel.app,http://localhost:5173`
   - [ ] `SWAGGER_ENABLED` = `1`
   - [ ] `SWAGGER_USER` = *(generate)*
   - [ ] `SWAGGER_PASS` = *(generate)*
8. [ ] Deploy
9. [ ] Verify: `curl https://<render-url>/health`

### Vercel Web Checklist

1. [ ] Open https://vercel.com/new
2. [ ] Import `opthupsa-alt/leedz`
3. [ ] **Root Directory:** `web`
4. [ ] **Framework:** Vite
5. [ ] **Build Command:** `npm ci && npm run build`
6. [ ] **Output Directory:** `dist`
7. [ ] Add Environment Variable:
   - [ ] `VITE_API_BASE_URL` = `https://<render-url>`
8. [ ] Deploy
9. [ ] Verify: Open site, check Network tab for API calls

---

> **تحديث هذا الملف:** بعد كل سبرنت أو تغيير رئيسي
