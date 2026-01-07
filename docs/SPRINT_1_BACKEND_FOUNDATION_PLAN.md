# 🏗️ Sprint 1: Backend Foundation Plan

> **الحالة:** تخطيط (لم يبدأ التنفيذ)  
> **المدة المتوقعة:** 2-3 أسابيع  
> **المتطلب السابق:** Sprint 0 Prep ✅

---

## 📋 جدول المحتويات

1. [موقع Backend في الريبو](#-موقع-backend-في-الريبو)
2. [Stack المقترح](#-stack-المقترح)
3. [DB Schema الأولي](#-db-schema-الأولي)
4. [خطة التنفيذ التدريجية](#-خطة-التنفيذ-التدريجية)
5. [DoD](#-dod)

---

## 📁 موقع Backend في الريبو

### الهيكل الحالي

```
leedz/
├── docs/                    # التوثيق
├── leedz_extension chrome/  # Chrome Extension
├── web/                     # Frontend (Vite + React) ← Vercel
└── ops/                     # Operations (local secrets)
```

### الاقتراحات

#### الاقتراح A: Monorepo مع مجلد منفصل ✅ (مُوصى به)

```
leedz/
├── docs/
├── leedz_extension chrome/
├── web/                     # Frontend → Vercel
├── api/                     # Backend → Railway/Render (NEW)
│   ├── src/
│   │   ├── modules/
│   │   ├── common/
│   │   └── main.ts
│   ├── prisma/              # أو drizzle/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
└── ops/
```

**المميزات:**
- فصل واضح بين Frontend و Backend
- لا يؤثر على إعدادات Vercel الحالية (web/ فقط)
- سهولة deploy منفصل لكل جزء
- Shared types ممكن عبر package مشترك

**إعدادات Vercel:** لا تتغير (Root Directory = `web`)

#### الاقتراح B: Separate Repo

```
# Repo 1: leedz (الحالي)
leedz/
├── docs/
├── leedz_extension chrome/
├── web/                     # Frontend → Vercel
└── ops/

# Repo 2: leedz-api (جديد)
leedz-api/
├── src/
├── prisma/
├── package.json
└── Dockerfile
```

**المميزات:**
- فصل كامل
- CI/CD مستقل

**العيوب:**
- صعوبة sync بين الريبوهات
- Shared types أصعب

### 📌 القرار المُوصى به

**الاقتراح A (Monorepo)** - مجلد `api/` في نفس الريبو.

---

## 🛠️ Stack المقترح

### Backend Framework: NestJS

| المعيار | NestJS | Express | Fastify |
|---------|:------:|:-------:|:-------:|
| TypeScript native | ✅ | ⚠️ | ⚠️ |
| Modular architecture | ✅ | ❌ | ❌ |
| Built-in DI | ✅ | ❌ | ❌ |
| WebSocket support | ✅ | ⚠️ | ⚠️ |
| Guards/Interceptors | ✅ | ❌ | ❌ |
| OpenAPI generation | ✅ | ⚠️ | ⚠️ |
| Learning curve | متوسط | سهل | سهل |

**السبب:** NestJS يوفر بنية جاهزة للـ multi-tenant، guards للـ RBAC، و WebSocket gateway مدمج.

### ORM: Prisma

| المعيار | Prisma | Drizzle | Kysely |
|---------|:------:|:-------:|:------:|
| Type-safety | ✅ | ✅ | ✅ |
| Migrations | ✅ | ✅ | ❌ |
| Studio GUI | ✅ | ❌ | ❌ |
| RLS support | ⚠️ | ⚠️ | ⚠️ |
| Bundle size | كبير | صغير | صغير |
| Ecosystem | كبير | متوسط | صغير |

**السبب:** Prisma الأكثر نضجاً، migrations سهلة، و Studio مفيد للتطوير.

**ملاحظة RLS:** سنستخدم Prisma للـ CRUD + PostgreSQL RLS policies يدوياً.

### Authentication: Passport + JWT

- `@nestjs/passport`
- `passport-jwt`
- `passport-local`

### WebSocket: Socket.io via NestJS Gateway

- `@nestjs/websockets`
- `@nestjs/platform-socket.io`

### Job Queue: BullMQ (اختياري للـ MVP)

- للـ background jobs طويلة
- يمكن تأجيله لـ Sprint 2

---

## 🗄️ DB Schema الأولي

### ERD Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   tenants   │────<│    users    │────<│ memberships │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    plans    │     │   invites   │     │    roles    │
└─────────────┘     └─────────────┘     └─────────────┘
       │                                       │
       │                                       │
       ▼                                       ▼
┌─────────────┐                         ┌─────────────┐
│   quotas    │                         │ permissions │
└─────────────┘                         └─────────────┘

┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    jobs     │────<│  evidence   │     │ audit_logs  │
└─────────────┘     └─────────────┘     └─────────────┘
```

### Prisma Schema (Draft)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ═══════════════════════════════════════════════════════════════
// TENANT & AUTH
// ═══════════════════════════════════════════════════════════════

model Tenant {
  id          String   @id @default(uuid())
  name        String
  slug        String   @unique
  planId      String?
  plan        Plan?    @relation(fields: [planId], references: [id])
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relations
  users       User[]
  memberships Membership[]
  invites     Invite[]
  jobs        Job[]
  leads       Lead[]
  lists       List[]
  auditLogs   AuditLog[]
  
  @@map("tenants")
}

model User {
  id            String   @id @default(uuid())
  email         String   @unique
  passwordHash  String
  name          String
  avatarUrl     String?
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  // Relations
  memberships   Membership[]
  invitesSent   Invite[]     @relation("InviteSender")
  jobs          Job[]
  auditLogs     AuditLog[]
  
  // Default tenant for quick access
  defaultTenantId String?
  defaultTenant   Tenant?  @relation(fields: [defaultTenantId], references: [id])
  
  @@map("users")
}

model Membership {
  id        String   @id @default(uuid())
  userId    String
  tenantId  String
  role      Role     @default(SALES)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  tenant    Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  @@unique([userId, tenantId])
  @@map("memberships")
}

enum Role {
  OWNER
  ADMIN
  MANAGER
  SALES
}

model Invite {
  id        String       @id @default(uuid())
  email     String
  tenantId  String
  role      Role         @default(SALES)
  token     String       @unique
  status    InviteStatus @default(PENDING)
  expiresAt DateTime
  
  createdAt DateTime     @default(now())
  
  tenant    Tenant       @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  inviterId String
  inviter   User         @relation("InviteSender", fields: [inviterId], references: [id])
  
  @@map("invites")
}

enum InviteStatus {
  PENDING
  ACCEPTED
  REJECTED
  EXPIRED
}

// ═══════════════════════════════════════════════════════════════
// PLANS & QUOTAS
// ═══════════════════════════════════════════════════════════════

model Plan {
  id           String   @id @default(uuid())
  name         String   @unique  // FREE, STARTER, PRO, ENTERPRISE
  displayName  String
  price        Int      // Monthly price in cents
  
  // Quotas
  maxUsers     Int
  maxLeads     Int
  maxSearches  Int
  maxMessages  Int
  
  // Feature flags
  features     Json     // { "ai_reports": true, "bulk_export": false, ... }
  
  createdAt    DateTime @default(now())
  
  tenants      Tenant[]
  
  @@map("plans")
}

// ═══════════════════════════════════════════════════════════════
// JOBS & EVIDENCE
// ═══════════════════════════════════════════════════════════════

model Job {
  id          String    @id @default(uuid())
  tenantId    String
  type        JobType
  status      JobStatus @default(PENDING)
  progress    Int       @default(0)
  
  // Job-specific data
  input       Json?
  output      Json?
  error       Json?
  
  createdAt   DateTime  @default(now())
  startedAt   DateTime?
  completedAt DateTime?
  
  createdById String
  createdBy   User      @relation(fields: [createdById], references: [id])
  tenant      Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  evidence    Evidence[]
  
  @@index([tenantId, status])
  @@map("jobs")
}

enum JobType {
  SEARCH
  SURVEY
  WHATSAPP_SEND
  WHATSAPP_BULK
  IMPORT
  EXPORT
  REPORT_GENERATE
  BULK_STATUS_UPDATE
  BULK_DELETE
}

enum JobStatus {
  PENDING
  RUNNING
  COMPLETED
  FAILED
  CANCELLED
}

model Evidence {
  id           String          @id @default(uuid())
  jobId        String
  type         EvidenceType
  title        String
  source       String          // Connector name
  url          String?
  snippet      String          // Max 10KB, sanitized
  confidence   Confidence
  rawData      Json?           // Max 50KB
  hash         String          // SHA-256 for dedup
  sizeBytes    Int
  
  collectedAt  DateTime
  createdAt    DateTime        @default(now())
  
  job          Job             @relation(fields: [jobId], references: [id], onDelete: Cascade)
  
  @@index([jobId])
  @@map("evidence")
}

enum EvidenceType {
  GOOGLE_MAPS_LISTING
  WEBSITE_CONTENT
  SOCIAL_PROFILE
  SEARCH_RESULT
  CONTACT_INFO
  REVIEW
  NEWS_ARTICLE
}

enum Confidence {
  HIGH
  MEDIUM
  LOW
}

// ═══════════════════════════════════════════════════════════════
// AUDIT
// ═══════════════════════════════════════════════════════════════

model AuditLog {
  id          String   @id @default(uuid())
  tenantId    String
  userId      String?
  eventType   String
  entityType  String?
  entityId    String?
  action      String
  details     Json?
  ipAddress   String?
  userAgent   String?
  
  createdAt   DateTime @default(now())
  
  tenant      Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  user        User?    @relation(fields: [userId], references: [id])
  
  @@index([tenantId, createdAt])
  @@index([tenantId, eventType])
  @@map("audit_logs")
}

// ═══════════════════════════════════════════════════════════════
// LEADS & LISTS (Placeholder - Sprint 2)
// ═══════════════════════════════════════════════════════════════

model Lead {
  id        String @id @default(uuid())
  tenantId  String
  tenant    Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  // ... more fields in Sprint 2
  
  @@map("leads")
}

model List {
  id        String @id @default(uuid())
  tenantId  String
  tenant    Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  // ... more fields in Sprint 2
  
  @@map("lists")
}
```

### RLS Policies (بعد Prisma migrate)

```sql
-- Enable RLS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policy (example)
CREATE POLICY tenant_isolation ON leads
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

---

## 📅 خطة التنفيذ التدريجية

### Week 1: Foundation

| المهمة | التفاصيل | DoD |
|--------|----------|-----|
| إنشاء مجلد `api/` | NestJS scaffold | `pnpm dev` يعمل |
| إعداد Prisma | Schema + connection | `pnpm db:migrate` يعمل |
| إعداد Docker | Dockerfile + compose | `docker build` يعمل |
| Deploy to Railway | أول deploy | URL يستجيب |

### Week 2: Auth & Tenancy

| المهمة | التفاصيل | DoD |
|--------|----------|-----|
| Auth module | Signup, Login, JWT | Tests pass |
| Tenant module | Create, Switch | Tests pass |
| Membership module | Invite, Accept, Roles | Tests pass |
| RBAC Guards | Permission checks | Tests pass |

### Week 3: Jobs & WebSocket

| المهمة | التفاصيل | DoD |
|--------|----------|-----|
| Job module | CRUD + status | Tests pass |
| WebSocket Gateway | Connection + auth | Extension connects |
| Agent endpoints | /agent/* | Extension receives jobs |
| Audit logging | Basic events | Logs in DB |

---

## ✅ DoD (Definition of Done)

### Sprint 1 يُعتبر مكتمل عندما:

```
[ ] api/ folder exists with NestJS project
[ ] Prisma schema matches the draft above
[ ] Migrations run successfully on Neon
[ ] Auth endpoints work (signup, login, refresh, me)
[ ] Tenant endpoints work (create, switch)
[ ] Membership endpoints work (invite, accept, list)
[ ] RBAC guards block unauthorized access
[ ] WebSocket gateway accepts connections
[ ] Agent can connect and receive heartbeat
[ ] Basic audit logging works
[ ] Deployed to Railway/Render
[ ] Frontend can call API (CORS configured)
[ ] No secrets in code
[ ] SPRINT_CLOSEOUT.md updated
```

### ما لا يشمله Sprint 1

- ❌ Leads CRUD (Sprint 2)
- ❌ Search/Survey jobs (Sprint 2)
- ❌ WhatsApp integration (Sprint 3)
- ❌ AI Reports (Sprint 4)
- ❌ Billing/Stripe (Sprint 5)

---

## ⚠️ مخاطر وتخفيفات

| المخاطر | الاحتمالية | التخفيف |
|---------|-----------|---------|
| Railway/Render cold start | متوسط | Keep-alive ping |
| Neon connection limits | منخفض | Connection pooling |
| WebSocket reconnection | متوسط | Exponential backoff |
| CORS issues | عالي | Test early with Extension |

---

## 📚 مراجع

- [NestJS Docs](https://docs.nestjs.com/)
- [Prisma Docs](https://www.prisma.io/docs)
- [Railway Docs](https://docs.railway.app/)
- [Socket.io + NestJS](https://docs.nestjs.com/websockets/gateways)

---

> **ملاحظة:** هذا الملف للتخطيط فقط. التنفيذ الفعلي يبدأ بعد موافقة الفريق.
