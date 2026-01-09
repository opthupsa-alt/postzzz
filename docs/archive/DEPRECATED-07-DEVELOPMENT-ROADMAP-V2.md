# 🗺️ خارطة طريق التطوير - Analysis Pack v2 (Sprint-Based)

> **الإصدار:** 2.0.0  
> **تاريخ التحديث:** يناير 2026  
> **الحالة:** جاهز للتنفيذ

---

## 📋 ملخص التغييرات من v1

| التغيير | الوصف |
|---------|-------|
| ✅ Sprint-based | تحويل من مراحل عامة إلى Sprints محددة |
| ✅ Frontend-first | الخطة تبدأ من Backend مع ربط تدريجي للـ Frontend الموجود |
| ✅ SaaS Priority | Sprint 0 مخصص للـ Multi-tenancy |
| ✅ API Contracts | كل Sprint يُنتج APIs قابلة للربط فوراً |
| ✅ Extension Sprint | Sprint مخصص للـ Browser Extension |

---

## 🎯 الحالة الحالية

### ما تم إنجازه ✅ (Frontend Prototype)
- [x] 17 شاشة كاملة (React + TypeScript)
- [x] إدارة الحالة (Zustand Store)
- [x] التنقل والتوجيه (React Router)
- [x] تصميم RTL عربي أولاً
- [x] Mock Data للتجربة
- [x] 15 مكون قابل لإعادة الاستخدام
- [x] توثيق شامل (Analysis Pack v1)

### ما يحتاج تطوير 🔧 (Backend + Integration)
- [ ] Backend API (Node.js/NestJS)
- [ ] قاعدة البيانات (PostgreSQL)
- [ ] Multi-tenancy
- [ ] المصادقة الحقيقية (JWT)
- [ ] RBAC (4 أدوار)
- [ ] نظام المهام (Jobs + Queue)
- [ ] تكامل Google Maps API
- [ ] تكامل WhatsApp Business API
- [ ] تحليل AI للتقارير
- [ ] Browser Extension
- [ ] نظام الاشتراكات

---

## 📅 خطة Sprints

### نظرة عامة

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  Sprint 0: Foundation + SaaS        ████████░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│  (3 أسابيع)                         Week 1-3                            │
│                                                                          │
│  Sprint 1: Core CRUD + Auth         ░░░░░░░░████████░░░░░░░░░░░░░░░░░░  │
│  (3 أسابيع)                         Week 4-6                            │
│                                                                          │
│  Sprint 2: Jobs + Survey            ░░░░░░░░░░░░░░░░████████░░░░░░░░░░  │
│  (3 أسابيع)                         Week 7-9                            │
│                                                                          │
│  Sprint 3: WhatsApp + Integrations  ░░░░░░░░░░░░░░░░░░░░░░░░████████░░  │
│  (3 أسابيع)                         Week 10-12                          │
│                                                                          │
│  Sprint 4: AI + Reports             ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░████  │
│  (2 أسابيع)                         Week 13-14                          │
│                                                                          │
│  Sprint 5: Extension + Polish       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░██  │
│  (2 أسابيع)                         Week 15-16                          │
│                                                                          │
│  Sprint 6: Billing + Launch         ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░█  │
│  (2 أسابيع)                         Week 17-18                          │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

الإجمالي: 18 أسبوع (4.5 أشهر)
```

---

## 🏗️ Sprint 0: Foundation + SaaS (Week 1-3)

### الهدف
إعداد البنية التحتية الأساسية مع Multi-tenancy من اليوم الأول.

### المهام

#### Week 1: Project Setup
```
Backend:
├── إنشاء مشروع NestJS
├── إعداد TypeScript + ESLint + Prettier
├── إعداد Docker + docker-compose
├── إعداد PostgreSQL + Prisma
├── إنشاء Database Schema (جميع الجداول)
├── إعداد Migrations
└── Seed data للتطوير

DevOps:
├── إعداد GitHub repository
├── إعداد GitHub Actions (CI)
├── إعداد بيئة Development
└── إعداد Secrets management
```

#### Week 2: Multi-tenancy Core
```
Entities:
├── tenants table + CRUD
├── users table + CRUD
├── memberships table + CRUD
├── invites table + CRUD
└── RLS policies

Middleware:
├── Tenant context middleware
├── Tenant scoping في repositories
└── JWT structure مع tenant context
```

#### Week 3: Auth Foundation
```
Auth:
├── POST /api/auth/signup (create tenant + owner)
├── POST /api/auth/login
├── POST /api/auth/logout
├── POST /api/auth/refresh
├── GET /api/auth/me
├── POST /api/auth/switch-tenant
└── Email verification (basic)

Security:
├── Password hashing (Argon2)
├── JWT signing/verification
├── Rate limiting
├── CORS configuration
└── Security headers (Helmet)
```

### المخرجات
- ✅ Backend project structure
- ✅ Database with all tables
- ✅ Multi-tenancy working
- ✅ Auth endpoints working
- ✅ CI pipeline

### Frontend Integration
```typescript
// إضافة API client
// src/api/client.ts
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// تحديث LoginPage للاتصال بـ API
// تحديث App.tsx للتحقق من auth state
```

---

## 🔐 Sprint 1: Core CRUD + RBAC (Week 4-6)

### الهدف
تنفيذ CRUD الأساسي للـ Leads مع نظام الصلاحيات.

### المهام

#### Week 4: Leads CRUD
```
Endpoints:
├── GET /api/leads (with pagination, filters, search)
├── GET /api/leads/:id
├── POST /api/leads
├── POST /api/leads/bulk
├── PATCH /api/leads/:id
├── PATCH /api/leads/:id/status
├── DELETE /api/leads/:id
└── DELETE /api/leads/bulk

Features:
├── Full-text search (Arabic)
├── Filtering (status, hasPhone, hasWebsite, etc.)
├── Sorting
├── Pagination
└── Tenant scoping
```

#### Week 5: Lists + Team
```
Lists:
├── GET /api/lists
├── GET /api/lists/:id
├── POST /api/lists
├── PATCH /api/lists/:id
├── DELETE /api/lists/:id
├── POST /api/lists/:id/leads
└── DELETE /api/lists/:id/leads

Team:
├── GET /api/team
├── POST /api/team/invite
├── POST /api/team/invite/:token/accept
├── PATCH /api/team/:id/role
├── DELETE /api/team/:id
└── GET /api/team/invites
```

#### Week 6: RBAC + Audit
```
RBAC:
├── Permission middleware
├── Role-based access control
├── Owner/Admin/Manager/Sales logic
└── Scope filtering (own/team/all)

Audit:
├── Audit log middleware
├── POST /api/audit-logs (internal)
├── GET /api/audit-logs (admin only)
└── Audit event types
```

### المخرجات
- ✅ Leads CRUD working
- ✅ Lists CRUD working
- ✅ Team management working
- ✅ RBAC enforced
- ✅ Audit logging

### Frontend Integration
```typescript
// تحديث useStore لاستخدام API
// src/store/useStore.ts

// Before (Mock):
// saveLead: (lead) => set((state) => ({ savedLeads: [...state.savedLeads, lead] }))

// After (API):
saveLead: async (lead) => {
  const response = await api.post('/leads', lead);
  set((state) => ({ savedLeads: [...state.savedLeads, response.data] }));
}

// تحديث Guard component للتحقق من permissions
// تحديث TeamPage للاتصال بـ API
// تحديث AuditLogsPage للاتصال بـ API
```

---

## ⚙️ Sprint 2: Jobs + Survey (Week 7-9)

### الهدف
تنفيذ نظام المهام الخلفية والفحص الآلي.

### المهام

#### Week 7: Job Infrastructure
```
Infrastructure:
├── إعداد Redis
├── إعداد BullMQ
├── Job queue configuration
├── Job workers
└── WebSocket setup (Socket.io)

Endpoints:
├── GET /api/jobs
├── GET /api/jobs/:id
├── GET /api/jobs/:id/logs
├── POST /api/jobs/:id/cancel
└── WebSocket: job progress updates
```

#### Week 8: Search Job
```
Search:
├── POST /api/search
├── GET /api/search/:jobId/results
├── Google Maps Places API integration
├── Result caching
└── Rate limiting

Job Flow:
├── Create SEARCH job
├── Call Google Maps API
├── Parse results
├── Update progress via WebSocket
└── Return results
```

#### Week 9: Survey Job
```
Survey:
├── POST /api/leads/:id/survey
├── GET /api/leads/:id/evidence
├── GET /api/leads/:id/report
├── Web scraping service
└── Evidence extraction

Job Flow:
├── Create SURVEY job
├── Fetch website content
├── Extract evidence
├── Store evidence
├── Update lead status to PROSPECTED
└── Notify via WebSocket
```

### المخرجات
- ✅ Job queue working
- ✅ WebSocket updates working
- ✅ Search job working (Google Maps)
- ✅ Survey job working (basic)
- ✅ Evidence storage

### Frontend Integration
```typescript
// تحديث JobProgressWidget للاتصال بـ WebSocket
// src/components/JobProgressWidget.tsx

useEffect(() => {
  const socket = io(import.meta.env.VITE_WS_URL);
  
  socket.on('job:progress', (data) => {
    updateJob(data.id, { progress: data.progress, message: data.message });
  });
  
  socket.on('job:completed', (data) => {
    updateJob(data.id, { status: 'SUCCESS', result: data.result });
    showToast('SUCCESS', 'اكتمل', data.message);
  });
  
  return () => socket.disconnect();
}, []);

// تحديث ProspectingPage لاستخدام API
// تحديث LeadDetailPage لتشغيل Survey
```

---

## 💬 Sprint 3: WhatsApp + Integrations (Week 10-12)

### الهدف
تنفيذ تكامل WhatsApp Business API والتكاملات الأخرى.

### المهام

#### Week 10: WhatsApp Core
```
Setup:
├── Meta Business Account setup
├── WhatsApp Business API configuration
├── Phone number registration
└── Webhook endpoint

Endpoints:
├── POST /api/whatsapp/send
├── POST /api/whatsapp/send/bulk
├── GET /api/whatsapp/messages
├── GET /api/whatsapp/status
└── POST /api/whatsapp/webhook (Meta callback)
```

#### Week 11: Templates + Messages
```
Templates:
├── GET /api/whatsapp/templates
├── POST /api/whatsapp/templates
├── PATCH /api/whatsapp/templates/:id
├── DELETE /api/whatsapp/templates/:id
└── Template variable substitution

Messages:
├── WHATSAPP job type
├── WHATSAPP_BULK job type
├── Delivery status tracking
├── Idempotency handling
└── Activity logging
```

#### Week 12: Integrations Framework
```
Framework:
├── Integration connections table
├── Credentials encryption
├── Connection status tracking
└── Sync job infrastructure

Endpoints:
├── GET /api/integrations
├── POST /api/integrations/:type/connect
├── POST /api/integrations/:type/disconnect
├── POST /api/integrations/:type/sync
└── GET /api/integrations/:type/status

API Keys:
├── GET /api/api-keys
├── POST /api/api-keys
├── DELETE /api/api-keys/:id
└── API key authentication middleware
```

### المخرجات
- ✅ WhatsApp sending working
- ✅ Templates management working
- ✅ Message logging working
- ✅ Integrations framework ready
- ✅ API keys management

### Frontend Integration
```typescript
// تحديث WhatsAppModal للاتصال بـ API
// تحديث WhatsAppMessagesPage للاتصال بـ API
// تحديث IntegrationsPage للاتصال بـ API
// تحديث SettingsPage (API Keys section)
```

---

## 🤖 Sprint 4: AI + Reports (Week 13-14)

### الهدف
تنفيذ التحليل الذكي وتوليد التقارير.

### المهام

#### Week 13: AI Integration
```
Setup:
├── OpenAI/Gemini API integration
├── Prompt templates
├── Response parsing
└── Error handling

Features:
├── Report generation from evidence
├── Lead scoring
├── Confidence levels
└── Evidence linking
```

#### Week 14: Smart Features
```
AI Writing:
├── POST /api/ai/generate-message
├── Message personalization
└── Tone adjustment

Report:
├── REPORT job type
├── Section generation
├── Summary generation
└── Score calculation

Enhancements:
├── AI suggestions in search
├── Smart list recommendations
└── Activity insights
```

### المخرجات
- ✅ AI report generation working
- ✅ Lead scoring working
- ✅ AI message writing working
- ✅ Smart suggestions

### Frontend Integration
```typescript
// تحديث ReportViewer لعرض التقارير الحقيقية
// تحديث WhatsAppModal لاستخدام AI writing
// تحديث LeadDetailPage لعرض score
```

---

## 🔌 Sprint 5: Extension + Polish (Week 15-16)

### الهدف
تنفيذ Browser Extension وتحسين التجربة.

### المهام

#### Week 15: Extension Backend
```
CORS:
├── chrome-extension:// origin allowed
├── Extension-specific auth flow
└── Tenant context in extension

Endpoints:
├── POST /api/extension/resolve (detect entity)
├── POST /api/extension/reveal (reveal data)
├── POST /api/extension/save (save to CRM)
└── GET /api/extension/context (current tenant)

Features:
├── LinkedIn profile detection
├── Company website detection
├── Data extraction
└── CRM save
```

#### Week 16: Extension Frontend + Polish
```
Extension:
├── Chrome Extension manifest v3
├── Content script
├── Side panel UI (from ExtensionSidePanel.tsx)
├── Auth flow (use web session)
└── Chrome Web Store preparation

Polish:
├── Error states in all screens
├── Loading states
├── Empty states
├── Toast improvements
└── Performance optimization
```

### المخرجات
- ✅ Extension working
- ✅ All error states implemented
- ✅ Performance optimized
- ✅ Ready for Chrome Web Store

### Frontend Integration
```typescript
// إنشاء Extension project منفصل
// استخدام ExtensionSidePanel.tsx كأساس
// ربط بـ API endpoints
```

---

## 💳 Sprint 6: Billing + Launch (Week 17-18)

### الهدف
تنفيذ نظام الاشتراكات والإطلاق.

### المهام

#### Week 17: Billing
```
Stripe Integration:
├── Stripe account setup
├── Products/Prices creation
├── Checkout session
├── Webhook handling
└── Subscription management

Endpoints:
├── GET /api/billing/plans
├── GET /api/billing/subscription
├── POST /api/billing/checkout
├── POST /api/billing/portal
├── POST /api/billing/webhook
└── GET /api/billing/usage

Usage Limits:
├── Usage counter middleware
├── Limit enforcement
├── Upgrade prompts
└── Feature flags by plan
```

#### Week 18: Launch Preparation
```
Testing:
├── E2E tests (Playwright)
├── Load testing
├── Security audit
└── Bug fixes

Deployment:
├── Production environment
├── Database migration
├── Monitoring (Sentry)
├── Analytics (Mixpanel)
└── Backup strategy

Documentation:
├── API documentation (Swagger)
├── User guide
└── Admin guide
```

### المخرجات
- ✅ Billing working
- ✅ Usage limits enforced
- ✅ Production deployed
- ✅ Monitoring active
- ✅ Documentation complete

### Frontend Integration
```typescript
// إضافة شاشة /app/billing
// إضافة Upgrade prompts
// إضافة Usage indicators
```

---

## 📊 API Mapping Table (Sprint-by-Sprint)

### Sprint 0 APIs
| Endpoint | Method | Permission | Job? | Audit? |
|----------|--------|------------|------|--------|
| /api/auth/signup | POST | Public | ✗ | ✓ |
| /api/auth/login | POST | Public | ✗ | ✓ |
| /api/auth/logout | POST | Auth | ✗ | ✓ |
| /api/auth/refresh | POST | Auth | ✗ | ✗ |
| /api/auth/me | GET | Auth | ✗ | ✗ |
| /api/auth/switch-tenant | POST | Auth | ✗ | ✓ |

### Sprint 1 APIs
| Endpoint | Method | Permission | Job? | Audit? |
|----------|--------|------------|------|--------|
| /api/leads | GET | leads:read | ✗ | ✗ |
| /api/leads | POST | leads:create | ✗ | ✓ |
| /api/leads/:id | GET | leads:read | ✗ | ✗ |
| /api/leads/:id | PATCH | leads:update | ✗ | ✓ |
| /api/leads/:id | DELETE | leads:delete | ✗ | ✓ |
| /api/leads/bulk | POST | leads:create | ✗ | ✓ |
| /api/leads/bulk | DELETE | leads:delete | ✗ | ✓ |
| /api/lists | GET | lists:read | ✗ | ✗ |
| /api/lists | POST | lists:create | ✗ | ✓ |
| /api/lists/:id | GET | lists:read | ✗ | ✗ |
| /api/lists/:id | PATCH | lists:update | ✗ | ✓ |
| /api/lists/:id | DELETE | lists:delete | ✗ | ✓ |
| /api/lists/:id/leads | POST | lists:update | ✗ | ✓ |
| /api/lists/:id/leads | DELETE | lists:update | ✗ | ✓ |
| /api/team | GET | team:read | ✗ | ✗ |
| /api/team/invite | POST | team:invite | ✗ | ✓ |
| /api/team/invite/:token/accept | POST | Public | ✗ | ✓ |
| /api/team/:id/role | PATCH | team:change_role | ✗ | ✓ |
| /api/team/:id | DELETE | team:remove | ✗ | ✓ |
| /api/audit-logs | GET | audit:read | ✗ | ✗ |

### Sprint 2 APIs
| Endpoint | Method | Permission | Job? | Audit? |
|----------|--------|------------|------|--------|
| /api/jobs | GET | Auth | ✗ | ✗ |
| /api/jobs/:id | GET | Auth | ✗ | ✗ |
| /api/jobs/:id/logs | GET | Auth | ✗ | ✗ |
| /api/jobs/:id/cancel | POST | Auth | ✗ | ✗ |
| /api/search | POST | Auth | ✓ SEARCH | ✗ |
| /api/search/:jobId/results | GET | Auth | ✗ | ✗ |
| /api/leads/:id/survey | POST | leads:update | ✓ SURVEY | ✓ |
| /api/leads/:id/evidence | GET | leads:read | ✗ | ✗ |
| /api/leads/:id/report | GET | leads:read | ✗ | ✗ |

### Sprint 3 APIs
| Endpoint | Method | Permission | Job? | Audit? |
|----------|--------|------------|------|--------|
| /api/whatsapp/send | POST | whatsapp:send | ✓ WHATSAPP | ✓ |
| /api/whatsapp/send/bulk | POST | whatsapp:bulk_send | ✓ WHATSAPP_BULK | ✓ |
| /api/whatsapp/messages | GET | whatsapp:view_logs | ✗ | ✗ |
| /api/whatsapp/status | GET | Auth | ✗ | ✗ |
| /api/whatsapp/templates | GET | whatsapp:templates | ✗ | ✗ |
| /api/whatsapp/templates | POST | whatsapp:templates | ✗ | ✓ |
| /api/whatsapp/templates/:id | PATCH | whatsapp:templates | ✗ | ✓ |
| /api/whatsapp/templates/:id | DELETE | whatsapp:templates | ✗ | ✓ |
| /api/integrations | GET | integrations:read | ✗ | ✗ |
| /api/integrations/:type/connect | POST | integrations:manage | ✗ | ✓ |
| /api/integrations/:type/disconnect | POST | integrations:manage | ✗ | ✓ |
| /api/integrations/:type/sync | POST | integrations:manage | ✓ SYNC | ✓ |
| /api/api-keys | GET | api_keys:read | ✗ | ✗ |
| /api/api-keys | POST | api_keys:manage | ✗ | ✓ |
| /api/api-keys/:id | DELETE | api_keys:manage | ✗ | ✓ |

### Sprint 4 APIs
| Endpoint | Method | Permission | Job? | Audit? |
|----------|--------|------------|------|--------|
| /api/ai/generate-message | POST | Auth | ✗ | ✗ |
| /api/leads/:id/report/generate | POST | leads:update | ✓ REPORT | ✓ |

### Sprint 5 APIs
| Endpoint | Method | Permission | Job? | Audit? |
|----------|--------|------------|------|--------|
| /api/extension/resolve | POST | Auth | ✗ | ✗ |
| /api/extension/reveal | POST | Auth | ✓ REVEAL | ✓ |
| /api/extension/save | POST | leads:create | ✗ | ✓ |
| /api/extension/context | GET | Auth | ✗ | ✗ |
| /api/leads/import | POST | leads:import | ✓ IMPORT | ✓ |
| /api/leads/export | POST | leads:export | ✓ EXPORT | ✓ |

### Sprint 6 APIs
| Endpoint | Method | Permission | Job? | Audit? |
|----------|--------|------------|------|--------|
| /api/billing/plans | GET | Public | ✗ | ✗ |
| /api/billing/subscription | GET | billing:read | ✗ | ✗ |
| /api/billing/checkout | POST | billing:manage | ✗ | ✓ |
| /api/billing/portal | POST | billing:manage | ✗ | ✗ |
| /api/billing/usage | GET | billing:read | ✗ | ✗ |

---

## 🛠️ التقنيات المستخدمة

### Backend Stack
| التقنية | الاستخدام |
|---------|----------|
| Node.js 20 LTS | Runtime |
| NestJS 10 | Framework |
| TypeScript 5 | Language |
| PostgreSQL 16 | Database |
| Prisma 5 | ORM |
| Redis 7 | Cache + Queue |
| BullMQ | Job Queue |
| Socket.io | WebSocket |
| Passport | Auth |
| Zod | Validation |

### External Services
| الخدمة | الاستخدام |
|--------|----------|
| Google Maps Places API | Search |
| Meta WhatsApp Business API | Messaging |
| OpenAI GPT-4 / Google Gemini | AI |
| Stripe | Billing |
| SendGrid / Resend | Email |
| Sentry | Error Tracking |
| Mixpanel | Analytics |

### DevOps
| التقنية | الاستخدام |
|---------|----------|
| Docker | Containerization |
| GitHub Actions | CI/CD |
| AWS / GCP | Cloud |
| Nginx | Reverse Proxy |
| Let's Encrypt | SSL |

---

## 👥 الفريق المقترح

| الدور | العدد | المدة | الملاحظات |
|-------|-------|-------|----------|
| Backend Developer (Senior) | 1 | كامل | Lead developer |
| Backend Developer (Mid) | 1 | كامل | Support |
| Frontend Developer | 1 | Sprint 1+ | Integration |
| DevOps Engineer | 1 | جزئي | Setup + maintenance |
| QA Engineer | 1 | Sprint 4+ | Testing |
| Product Manager | 1 | كامل | Coordination |

---

## 💰 تقدير التكاليف

### تكاليف التطوير (18 أسبوع)
| البند | التكلفة الشهرية | الإجمالي (4.5 شهر) |
|-------|----------------|-------------------|
| Backend Senior | $8,000 | $36,000 |
| Backend Mid | $5,000 | $22,500 |
| Frontend | $5,000 | $22,500 |
| DevOps (جزئي) | $2,000 | $9,000 |
| QA (من Sprint 4) | $3,000 | $6,000 |
| PM | $4,000 | $18,000 |
| **الإجمالي** | | **$114,000** |

### تكاليف التشغيل الشهرية (Production)
| البند | التكلفة |
|-------|---------|
| Cloud Hosting (AWS/GCP) | $300-500 |
| PostgreSQL (managed) | $100-200 |
| Redis (managed) | $50-100 |
| Google Maps API | $200-1,000 |
| WhatsApp Business API | $100-500 |
| OpenAI/Gemini API | $100-300 |
| Stripe fees | 2.9% + $0.30/tx |
| Monitoring (Sentry) | $50 |
| Email (SendGrid) | $20-50 |
| **الإجمالي** | **$920-2,700** |

---

## ✅ معايير النجاح (Definition of Done)

### Sprint 0
- [ ] Backend project running locally
- [ ] All database tables created
- [ ] Signup creates tenant + owner
- [ ] Login returns JWT with tenant context
- [ ] CI pipeline passing

### Sprint 1
- [ ] Leads CRUD working with tenant scoping
- [ ] Lists CRUD working
- [ ] Team invite flow working
- [ ] RBAC enforced on all endpoints
- [ ] Audit logs recorded

### Sprint 2
- [ ] Job queue processing reliably
- [ ] WebSocket updates working
- [ ] Search returns Google Maps results
- [ ] Survey extracts evidence
- [ ] Frontend connected to job system

### Sprint 3
- [ ] WhatsApp messages sending successfully
- [ ] Delivery status tracked
- [ ] Templates working with variables
- [ ] API keys can authenticate requests
- [ ] Integration connections stored securely

### Sprint 4
- [ ] AI generates quality reports
- [ ] Lead scoring working
- [ ] AI message writing working
- [ ] Response time < 30s for AI calls

### Sprint 5
- [ ] Extension detects LinkedIn/websites
- [ ] Extension saves to CRM
- [ ] Extension uses web auth
- [ ] All error states implemented
- [ ] Performance optimized

### Sprint 6
- [ ] Stripe checkout working
- [ ] Subscription status tracked
- [ ] Usage limits enforced
- [ ] Production deployed
- [ ] Uptime > 99%

---

## ⚠️ المخاطر والتخفيف

| المخاطر | الاحتمالية | التأثير | التخفيف |
|---------|------------|---------|---------|
| Google Maps API changes | Low | High | Abstract API layer |
| WhatsApp API approval delay | Medium | High | Start process early |
| AI costs higher than expected | Medium | Medium | Caching + prompt optimization |
| Extension review delay | Medium | Low | Submit early |
| Team availability | Medium | High | Document everything |

---

## 📞 الخطوات التالية

1. **مراجعة الخطة** مع الفريق
2. **إعداد البيئة** التطويرية
3. **إنشاء مشروع Backend** (NestJS)
4. **بدء Sprint 0** - Foundation + SaaS

---

> **ملاحظة:** هذه الخطة مبنية على أن الـ Frontend Prototype مكتمل. التركيز على Backend مع ربط تدريجي.
