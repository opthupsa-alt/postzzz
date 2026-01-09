# 🔍 تقرير التضاربات والنواقص - Analysis Pack v2

> **الإصدار:** 2.0.0  
> **تاريخ الإنشاء:** يناير 2026  
> **الغرض:** تحديد جميع التضاربات والفجوات في الوثائق الحالية واتخاذ قرارات نهائية

---

## 📋 ملخص تنفيذي

تم اكتشاف **18 تضارباً/نقصاً** في الوثائق الحالية تتطلب قرارات نهائية قبل بدء التطوير. هذا التقرير يوثق كل منها مع القرار المتخذ والتعديلات المطلوبة.

---

## 🚨 جدول التضاربات والنواقص

| ID | الفئة | الوصف | الخطورة |
|----|-------|-------|---------|
| C-01 | Roles | تضارب في أدوار المستخدمين | 🔴 عالية |
| C-02 | Entity | Company ككيان مستقل vs جزء من Lead | 🔴 عالية |
| C-03 | JobType | أنواع Jobs ناقصة | 🟠 متوسطة |
| C-04 | Evidence | EvidenceType ثابت vs قابل للتوسعة | 🟡 منخفضة |
| C-05 | SaaS | غياب Multi-tenancy كامل | 🔴 عالية |
| C-06 | Billing | غياب نظام الاشتراكات | 🔴 عالية |
| C-07 | Audit | عدم وضوح أحداث Audit | 🟠 متوسطة |
| C-08 | Permissions | غياب Permission Matrix | 🔴 عالية |
| C-09 | Jobs | غياب Job Logs | 🟠 متوسطة |
| C-10 | Extension | غياب Tenant Context | 🟠 متوسطة |
| C-11 | Signup | غياب تدفق التسجيل | 🔴 عالية |
| C-12 | Invite | نقص في تدفق الدعوات | 🟠 متوسطة |
| C-13 | API | غياب Tenant Scoping | 🔴 عالية |
| C-14 | Activity | خلط Activity مع Audit | 🟠 متوسطة |
| C-15 | LeadStatus | حالة PROSPECTED غير واضحة | 🟡 منخفضة |
| C-16 | Integration | غياب Integration Connections | 🟠 متوسطة |
| C-17 | FeatureFlags | غياب نظام Feature Flags | 🟠 متوسطة |
| C-18 | Error States | غياب حالات الخطأ في UI | 🟡 منخفضة |

---

## 📝 التفاصيل والقرارات

---

### C-01: تضارب في أدوار المستخدمين 🔴

**أين ظهر:**
- `00-GLOSSARY.md` (سطر 102-105): يعرّف `ADMIN` و `SALES` فقط
- `02-DATA-MODEL.md` (سطر 188): `type UserRole = 'ADMIN' | 'SALES'`
- `03-SCREENS-ANALYSIS.md` (سطر 536): مودال دعوة عضو يعرض "Sales/Manager/Admin"
- `04-USER-FLOWS.md` (سطر 523): "اختيار الدور (Sales/Manager/Admin)"

**لماذا مشكلة:**
- الـ UI يعرض 3 أدوار بينما الـ Data Model يعرّف 2 فقط
- عدم وضوح صلاحيات كل دور

**القرار النهائي:**
```
الأدوار المعتمدة (4 أدوار):
├── OWNER    → مالك المنظمة (واحد فقط لكل Tenant)
├── ADMIN    → مدير كامل الصلاحيات
├── MANAGER  → مدير فريق (يرى فريقه فقط)
└── SALES    → مندوب مبيعات (يرى بياناته فقط)
```

**التعديل المطلوب:**
1. تحديث `00-GLOSSARY.md` بالأدوار الأربعة
2. تحديث `02-DATA-MODEL.md` بـ `type UserRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'SALES'`
3. إنشاء Permission Matrix في `09-SAAS_MULTITENANCY.md`

**الأثر:**
- تغيير في Guard component
- تغيير في API authorization
- تغيير في UI (مودال الدعوة)

---

### C-02: Company ككيان مستقل vs جزء من Lead 🔴

**أين ظهر:**
- `00-GLOSSARY.md` (سطر 36): Company معرّفة ككيان منفصل
- `01-SYSTEM-OVERVIEW.md` (سطر 121-132): صفحة `CompanyDetailPage.tsx` موجودة
- `02-DATA-MODEL.md`: **لا يوجد** جدول companies في الـ Schema
- `03-SCREENS-ANALYSIS.md` (سطر 392-413): تفاصيل شاشة Company موجودة
- مسار `/app/companies/:id` موجود في فهرس الشاشات

**لماذا مشكلة:**
- صفحة Company موجودة في UI لكن لا يوجد Entity في Data Model
- علاقة Lead ↔ Company غير واضحة
- هل Company هي Lead enriched أم كيان مستقل؟

**القرار النهائي:**
```
Company = Lead Enriched View (ليس كيان مستقل)

التفسير:
- Lead هو السجل الأساسي في CRM
- Company View هي عرض مُثرى للـ Lead مع بيانات إضافية من Evidence
- لا حاجة لجدول companies منفصل
- صفحة /app/companies/:id تعرض Lead مع Evidence مجمّعة
```

**التعديل المطلوب:**
1. توضيح في `00-GLOSSARY.md` أن Company = Lead Enriched View
2. تحديث `02-DATA-MODEL.md` بإضافة حقول enrichment للـ Lead
3. توضيح في `03-SCREENS-ANALYSIS.md` أن CompanyDetailPage تستخدم Lead + Evidence

**الأثر:**
- لا تغيير في DB Schema (Lead يبقى الكيان الأساسي)
- API `/api/leads/:id?view=company` لجلب العرض المُثرى
- Frontend يبقى كما هو

---

### C-03: أنواع Jobs ناقصة 🟠

**أين ظهر:**
- `00-GLOSSARY.md` (سطر 62-66): `SEARCH | SURVEY | WHATSAPP` فقط
- `02-DATA-MODEL.md` (سطر 144): نفس الأنواع الثلاثة
- `03-SCREENS-ANALYSIS.md`:
  - سطر 260: "تصدير Excel (يُنشئ Job)"
  - سطر 261: "Reveal Data (يُنشئ Job)"
  - سطر 322: "بدء الاستيراد (يُنشئ Job)"
  - سطر 411: "بدء خطة مبيعات (يُنشئ Job)"
- `04-USER-FLOWS.md` (سطر 211): "إنشاء Job من نوع SEARCH" للاستيراد (خطأ)

**لماذا مشكلة:**
- UI يُنشئ Jobs لعمليات غير معرّفة في JobType
- استخدام SEARCH للاستيراد غير صحيح

**القرار النهائي:**
```typescript
type JobType = 
  | 'SEARCH'        // بحث Google Maps
  | 'SURVEY'        // فحص آلي للعميل
  | 'WHATSAPP'      // إرسال رسالة واتساب
  | 'WHATSAPP_BULK' // إرسال رسائل جماعية
  | 'IMPORT'        // استيراد من ملف
  | 'EXPORT'        // تصدير لملف
  | 'REVEAL'        // كشف بيانات التواصل
  | 'REPORT'        // توليد تقرير AI
  | 'SYNC'          // مزامنة مع تكامل خارجي
```

**التعديل المطلوب:**
1. تحديث `00-GLOSSARY.md` بجميع أنواع Jobs
2. تحديث `02-DATA-MODEL.md`
3. تحديث `04-USER-FLOWS.md` لاستخدام الأنواع الصحيحة

**الأثر:**
- تغيير في JobProgressWidget لعرض أيقونات مختلفة
- تغيير في Backend Job handlers

---

### C-04: EvidenceType ثابت vs قابل للتوسعة 🟡

**أين ظهر:**
- `00-GLOSSARY.md` (سطر 79-86): 4 أنواع ثابتة
- `02-DATA-MODEL.md` (سطر 76): `type EvidenceType = 'WEBSITE' | 'SOCIAL' | 'NEWS' | 'REVIEWS'`

**لماذا مشكلة:**
- قد نحتاج أنواع جديدة مستقبلاً (LINKEDIN, GOVERNMENT_REGISTRY, etc.)
- Enum ثابت يتطلب migration لكل نوع جديد

**القرار النهائي:**
```
EvidenceType = Enum قابل للتوسعة في الكود، ثابت في DB

الأنواع الأولية:
├── WEBSITE         → الموقع الرسمي
├── SOCIAL          → LinkedIn, Twitter, etc.
├── NEWS            → مقالات إخبارية
├── REVIEWS         → Google Maps Reviews
├── GOVERNMENT      → سجلات حكومية
├── FINANCIAL       → بيانات مالية
└── CUSTOM          → مصدر مخصص (مع metadata)
```

**التعديل المطلوب:**
1. تحديث `00-GLOSSARY.md` بالأنواع الجديدة
2. إضافة حقل `metadata: JSONB` للـ Evidence للمرونة

**الأثر:**
- تغيير طفيف في EvidenceList component لعرض أيقونات جديدة

---

### C-05: غياب Multi-tenancy كامل 🔴

**أين ظهر:**
- `02-DATA-MODEL.md`: **لا يوجد** tenantId في أي جدول
- `06-API-REQUIREMENTS.md`: **لا يوجد** tenant context في الـ API
- جميع الوثائق تفترض single-tenant

**لماذا مشكلة:**
- النظام مصمم كـ SaaS لكن لا يوجد عزل بيانات
- لا يمكن خدمة عدة شركات

**القرار النهائي:**
```
Multi-tenancy Strategy: Shared Database with Tenant ID

كل جدول Domain يحتوي:
├── tenant_id UUID NOT NULL REFERENCES tenants(id)
├── Query Scoping في كل API call
├── RLS (Row Level Security) كطبقة حماية إضافية
└── Tenant context من JWT token
```

**التعديل المطلوب:**
1. إنشاء `09-SAAS_MULTITENANCY.md` كامل
2. تحديث `02-DATA-MODEL.md` بإضافة tenant_id لكل جدول
3. تحديث `06-API-REQUIREMENTS.md` بـ tenant context

**الأثر:**
- تغيير جذري في DB Schema
- تغيير في كل API endpoint
- إضافة Tenant Switcher في AppShell

---

### C-06: غياب نظام الاشتراكات 🔴

**أين ظهر:**
- `01-SYSTEM-OVERVIEW.md` (سطر 223): "الاشتراك | تفاصيل الباقة (قريباً)"
- `03-SCREENS-ANALYSIS.md`: لا يوجد تفاصيل لشاشة Billing
- `02-DATA-MODEL.md`: **لا يوجد** جداول plans/subscriptions

**لماذا مشكلة:**
- SaaS بدون نظام اشتراكات = لا إيرادات
- لا يمكن تحديد حدود الاستخدام

**القرار النهائي:**
```
Billing Model: Seat-based + Usage Limits

الكيانات:
├── plans (id, name, seats_limit, leads_limit, messages_limit, features)
├── subscriptions (tenant_id, plan_id, status, current_period_start/end)
├── usage_counters (tenant_id, metric, value, period)
└── invoices (tenant_id, amount, status, paid_at)

الباقات الأولية:
├── FREE      → 1 seat, 100 leads, 50 messages/month
├── STARTER   → 3 seats, 1000 leads, 500 messages/month
├── PRO       → 10 seats, 10000 leads, 5000 messages/month
└── ENTERPRISE → unlimited (custom)
```

**التعديل المطلوب:**
1. إضافة Billing entities في `02-DATA-MODEL.md`
2. إضافة Billing API في `06-API-REQUIREMENTS.md`
3. توثيق شاشة Billing في `03-SCREENS-ANALYSIS.md`

**الأثر:**
- شاشة جديدة `/app/billing`
- Usage limits enforcement في Backend
- Upgrade prompts في UI

---

### C-07: عدم وضوح أحداث Audit 🟠

**أين ظهر:**
- `02-DATA-MODEL.md` (سطر 194-204): AuditLog بسيط جداً
- `03-SCREENS-ANALYSIS.md` (سطر 572-588): شاشة Audit Logs
- لا يوجد قائمة بالأحداث المطلوب تسجيلها

**لماذا مشكلة:**
- لا نعرف ما الأحداث الحساسة
- لا يوجد schema موحد للـ details

**القرار النهائي:**
```typescript
// Audit Event Types (إلزامي التسجيل)
type AuditEventType =
  // Auth
  | 'AUTH_LOGIN' | 'AUTH_LOGOUT' | 'AUTH_FAILED_LOGIN'
  | 'AUTH_PASSWORD_CHANGE' | 'AUTH_2FA_ENABLE' | 'AUTH_2FA_DISABLE'
  // Team
  | 'TEAM_INVITE_SENT' | 'TEAM_INVITE_ACCEPTED' | 'TEAM_MEMBER_REMOVED'
  | 'TEAM_ROLE_CHANGED'
  // Data
  | 'LEAD_CREATED' | 'LEAD_DELETED' | 'LEAD_BULK_DELETE'
  | 'LEAD_EXPORTED' | 'LEAD_IMPORTED'
  // WhatsApp
  | 'WHATSAPP_MESSAGE_SENT' | 'WHATSAPP_BULK_SENT'
  // API
  | 'API_KEY_CREATED' | 'API_KEY_REVOKED'
  // Integration
  | 'INTEGRATION_CONNECTED' | 'INTEGRATION_DISCONNECTED'
  // Billing
  | 'SUBSCRIPTION_CREATED' | 'SUBSCRIPTION_CANCELLED' | 'PAYMENT_FAILED'

// Audit Log Schema
interface AuditLog {
  id: string;
  tenantId: string;
  userId: string;
  eventType: AuditEventType;
  entityType: string;      // 'lead' | 'team' | 'integration' | ...
  entityId: string | null;
  action: string;          // human-readable
  details: {
    before?: object;       // للتعديلات
    after?: object;
    metadata?: object;
  };
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}
```

**التعديل المطلوب:**
1. تحديث `02-DATA-MODEL.md` بـ AuditLog schema الجديد
2. إضافة قائمة الأحداث في `00-GLOSSARY.md`

**الأثر:**
- Audit middleware في Backend
- تحسين شاشة Audit Logs

---

### C-08: غياب Permission Matrix 🔴

**أين ظهر:**
- `05-COMPONENTS-REFERENCE.md` (سطر 490-514): Guard component يتحقق من role فقط
- لا يوجد تعريف للصلاحيات التفصيلية

**لماذا مشكلة:**
- لا نعرف ما يمكن لكل دور فعله
- Guard component بسيط جداً

**القرار النهائي:**
```
Permission Matrix:

| Permission              | OWNER | ADMIN | MANAGER | SALES |
|------------------------|-------|-------|---------|-------|
| leads:read             | ✓     | ✓     | team    | own   |
| leads:create           | ✓     | ✓     | ✓       | ✓     |
| leads:update           | ✓     | ✓     | team    | own   |
| leads:delete           | ✓     | ✓     | ✗       | ✗     |
| leads:export           | ✓     | ✓     | ✓       | ✗     |
| leads:import           | ✓     | ✓     | ✓       | ✗     |
| whatsapp:send          | ✓     | ✓     | ✓       | ✓     |
| whatsapp:bulk          | ✓     | ✓     | ✓       | ✗     |
| team:read              | ✓     | ✓     | team    | ✗     |
| team:invite            | ✓     | ✓     | ✗       | ✗     |
| team:remove            | ✓     | ✓     | ✗       | ✗     |
| team:change_role       | ✓     | ✓     | ✗       | ✗     |
| integrations:manage    | ✓     | ✓     | ✗       | ✗     |
| api_keys:manage        | ✓     | ✓     | ✗       | ✗     |
| audit:read             | ✓     | ✓     | ✗       | ✗     |
| billing:manage         | ✓     | ✗     | ✗       | ✗     |
| org:settings           | ✓     | ✓     | ✗       | ✗     |

Legend:
- ✓ = full access
- ✗ = no access
- team = can access team members' data only
- own = can access own data only
```

**التعديل المطلوب:**
1. إضافة Permission Matrix في `09-SAAS_MULTITENANCY.md`
2. تحديث Guard component documentation

**الأثر:**
- تغيير في Guard component
- إضافة permission checks في كل API

---

### C-09: غياب Job Logs 🟠

**أين ظهر:**
- `02-DATA-MODEL.md` (سطر 131-154): Job entity بسيط بدون logs
- `06-API-REQUIREMENTS.md`: لا يوجد endpoint لـ job logs

**لماذا مشكلة:**
- لا يمكن تتبع خطوات الـ Job
- لا يمكن debug الفشل

**القرار النهائي:**
```typescript
interface JobLog {
  id: string;
  jobId: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  message: string;
  data?: object;
  timestamp: Date;
}

// Job entity updated
interface Job {
  id: string;
  tenantId: string;
  type: JobType;
  status: JobStatus;
  progress: number;
  message: string;
  entityType?: string;    // 'lead' | 'list' | ...
  entityId?: string;
  result?: object;
  error?: {
    code: string;
    message: string;
    stack?: string;
  };
  createdBy: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  logs: JobLog[];         // embedded or separate table
}
```

**التعديل المطلوب:**
1. تحديث Job entity في `02-DATA-MODEL.md`
2. إضافة `GET /api/jobs/:id/logs` في `06-API-REQUIREMENTS.md`

**الأثر:**
- تحسين JobProgressWidget لعرض logs
- أفضل debugging

---

### C-10: Extension - غياب Tenant Context 🟠

**أين ظهر:**
- `03-SCREENS-ANALYSIS.md` (سطر 17): Extension في `/extension-preview`
- `04-USER-FLOWS.md` (سطر 621-672): تدفق Extension
- لا يوجد ذكر لكيفية معرفة الـ Tenant

**لماذا مشكلة:**
- Extension يحتاج معرفة أي شركة يعمل عليها المستخدم
- المستخدم قد ينتمي لعدة شركات

**القرار النهائي:**
```
Extension Tenant Context:

1. Extension يستخدم نفس JWT token من الـ Web App
2. Token يحتوي على currentTenantId
3. إذا المستخدم في عدة tenants:
   - Extension يعرض Tenant Switcher
   - أو يستخدم آخر tenant مختار
4. API calls من Extension تحمل نفس tenant context
```

**التعديل المطلوب:**
1. توثيق Extension auth flow في `04-USER-FLOWS.md`
2. إضافة Tenant Switcher في Extension UI

**الأثر:**
- تغيير في Extension Side Panel
- إضافة tenant context في Extension API calls

---

### C-11: غياب تدفق التسجيل (Signup) 🔴

**أين ظهر:**
- `03-SCREENS-ANALYSIS.md` (سطر 10-28): فهرس الشاشات - لا يوجد `/signup`
- `04-USER-FLOWS.md` (سطر 23-72): تدفق المصادقة - login فقط

**لماذا مشكلة:**
- SaaS يحتاج signup flow
- لا يمكن إنشاء شركات جديدة

**القرار النهائي:**
```
Signup Flow:

1. /signup → إنشاء حساب جديد
   ├── اسم الشركة (Organization Name)
   ├── اسم المستخدم
   ├── البريد الإلكتروني
   ├── كلمة المرور
   └── [اختياري] الباقة المختارة

2. Email Verification → تأكيد البريد

3. Onboarding (اختياري):
   ├── ربط WhatsApp
   ├── دعوة أعضاء الفريق
   └── استيراد عملاء

4. Dashboard → بدء العمل
```

**التعديل المطلوب:**
1. إضافة شاشة Signup في `03-SCREENS-ANALYSIS.md`
2. إضافة Signup flow في `04-USER-FLOWS.md`
3. إضافة Signup API في `06-API-REQUIREMENTS.md`

**الأثر:**
- شاشة جديدة `/signup`
- شاشة جديدة `/verify-email`
- شاشة جديدة `/onboarding` (اختياري)

---

### C-12: نقص في تدفق الدعوات 🟠

**أين ظهر:**
- `04-USER-FLOWS.md` (سطر 511-536): دعوة عضو جديد
- لا يوجد تدفق قبول الدعوة
- `02-DATA-MODEL.md`: لا يوجد جدول invites

**لماذا مشكلة:**
- الدعوة تُرسل لكن لا يوجد آلية قبول
- لا يوجد tracking للدعوات

**القرار النهائي:**
```typescript
interface Invite {
  id: string;
  tenantId: string;
  email: string;
  role: UserRole;
  token: string;           // unique invite token
  invitedBy: string;       // user id
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';
  expiresAt: Date;
  acceptedAt?: Date;
  createdAt: Date;
}

// Accept Invite Flow:
// 1. User clicks invite link → /accept-invite?token=xxx
// 2. If not registered → signup with pre-filled email
// 3. If registered → add to tenant with role
// 4. Redirect to dashboard
```

**التعديل المطلوب:**
1. إضافة Invite entity في `02-DATA-MODEL.md`
2. إضافة `/accept-invite` شاشة في `03-SCREENS-ANALYSIS.md`
3. إضافة Accept Invite flow في `04-USER-FLOWS.md`
4. إضافة Invite APIs في `06-API-REQUIREMENTS.md`

**الأثر:**
- شاشة جديدة `/accept-invite`
- تغيير في Team invite modal

---

### C-13: API - غياب Tenant Scoping 🔴

**أين ظهر:**
- `06-API-REQUIREMENTS.md`: جميع الـ APIs بدون tenant context
- لا يوجد header أو parameter للـ tenant

**لماذا مشكلة:**
- API غير جاهز لـ multi-tenancy
- خطر تسرب بيانات بين الشركات

**القرار النهائي:**
```
Tenant Context Strategy:

1. JWT Token يحتوي:
   {
     "sub": "user-id",
     "tenantId": "current-tenant-id",
     "tenants": ["tenant-1", "tenant-2"],  // all user tenants
     "role": "ADMIN"
   }

2. كل API request:
   - يقرأ tenantId من JWT
   - يُطبق tenant scoping على كل query
   - يرفض إذا tenantId غير موجود

3. Switch Tenant:
   POST /api/auth/switch-tenant
   { "tenantId": "new-tenant-id" }
   → يُرجع JWT جديد

4. Headers:
   Authorization: Bearer <jwt>
   X-Tenant-ID: <tenant-id>  // optional override for admins
```

**التعديل المطلوب:**
1. تحديث `06-API-REQUIREMENTS.md` بـ tenant context
2. إضافة switch-tenant endpoint
3. تحديث JWT schema

**الأثر:**
- تغيير في كل API endpoint
- إضافة tenant middleware

---

### C-14: خلط Activity مع Audit 🟠

**أين ظهر:**
- `02-DATA-MODEL.md` (سطر 111-127): Activity entity
- `02-DATA-MODEL.md` (سطر 194-204): AuditLog entity
- كلاهما يسجل "إجراءات" لكن بشكل مختلف

**لماذا مشكلة:**
- Activity = timeline للعميل (user-facing)
- Audit = سجل أمني (admin-facing)
- الخلط يسبب ارتباك

**القرار النهائي:**
```
الفصل الواضح:

Activity (Lead Timeline):
├── مرتبط بـ Lead
├── يظهر في صفحة تفاصيل العميل
├── أنواع: SEARCH, SURVEY, WHATSAPP, LIST_ADD, STATUS_CHANGE, NOTE
├── User-facing
└── يمكن للمستخدم إضافة notes

AuditLog (Security Log):
├── مرتبط بـ Tenant
├── يظهر في صفحة Audit Logs (Admin only)
├── أنواع: جميع الأحداث الأمنية (C-07)
├── Admin-facing
└── لا يمكن تعديله أو حذفه
```

**التعديل المطلوب:**
1. توضيح الفرق في `00-GLOSSARY.md`
2. تحديث schemas في `02-DATA-MODEL.md`

**الأثر:**
- لا تغيير في UI (الفصل موجود بالفعل)
- توضيح في Backend

---

### C-15: حالة PROSPECTED غير واضحة 🟡

**أين ظهر:**
- `00-GLOSSARY.md` (سطر 53): "تم إجراء فحص آلي (Survey) للعميل"
- لكن Survey يُنتج Evidence + Report

**لماذا مشكلة:**
- هل PROSPECTED = تم الفحص؟
- أم PROSPECTED = تم الاكتشاف من البحث؟

**القرار النهائي:**
```
LeadStatus Flow:

NEW → (من البحث أو الإضافة اليدوية)
  ↓
PROSPECTED → (بعد Survey ناجح، يوجد Evidence/Report)
  ↓
CONTACTED → (بعد إرسال رسالة واتساب)
  ↓
QUALIFIED → (يدوي: العميل مؤهل للصفقة)
  ↓
LOST → (يدوي: العميل مستبعد)
```

**التعديل المطلوب:**
1. توضيح في `00-GLOSSARY.md`
2. إضافة auto-transition بعد Survey في `04-USER-FLOWS.md`

**الأثر:**
- تغيير طفيف في Survey flow

---

### C-16: غياب Integration Connections 🟠

**أين ظهر:**
- `06-API-REQUIREMENTS.md` (سطر 952-1003): Integration APIs
- `02-DATA-MODEL.md`: لا يوجد جدول integration_connections

**لماذا مشكلة:**
- لا يمكن تخزين credentials التكاملات
- لا يمكن تتبع حالة الربط

**القرار النهائي:**
```typescript
interface IntegrationConnection {
  id: string;
  tenantId: string;
  integrationType: 'WHATSAPP' | 'SALESFORCE' | 'HUBSPOT' | 'SLACK' | 'NOTION';
  status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
  credentials: object;     // encrypted
  config: object;
  lastSyncAt?: Date;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

**التعديل المطلوب:**
1. إضافة IntegrationConnection في `02-DATA-MODEL.md`
2. تحديث Integration APIs في `06-API-REQUIREMENTS.md`

**الأثر:**
- تخزين آمن للـ credentials
- تتبع حالة التكاملات

---

### C-17: غياب نظام Feature Flags 🟠

**أين ظهر:**
- لا يوجد ذكر لـ Feature Flags في أي وثيقة
- الباقات المختلفة تحتاج features مختلفة

**لماذا مشكلة:**
- لا يمكن تفعيل/تعطيل ميزات حسب الباقة
- لا يمكن إطلاق ميزات تدريجياً

**القرار النهائي:**
```typescript
// Global Feature Flags (platform-wide)
interface FeatureFlag {
  id: string;
  key: string;           // 'ai_reports', 'bulk_whatsapp', etc.
  enabled: boolean;
  rolloutPercentage: number;  // 0-100
  createdAt: Date;
}

// Tenant Feature Overrides
interface TenantFeature {
  tenantId: string;
  featureKey: string;
  enabled: boolean;
  expiresAt?: Date;      // for trials
}

// Features per Plan
const planFeatures = {
  FREE: ['basic_search', 'manual_leads'],
  STARTER: ['basic_search', 'manual_leads', 'whatsapp', 'lists'],
  PRO: ['...all', 'ai_reports', 'bulk_whatsapp', 'export'],
  ENTERPRISE: ['...all', 'api_access', 'sso', 'audit_logs']
};
```

**التعديل المطلوب:**
1. إضافة Feature Flags في `02-DATA-MODEL.md`
2. توثيق في `09-SAAS_MULTITENANCY.md`

**الأثر:**
- إضافة feature checks في UI و API
- Upgrade prompts عند محاولة استخدام feature غير متاح

---

### C-18: غياب حالات الخطأ في UI 🟡

**أين ظهر:**
- `03-SCREENS-ANALYSIS.md`: معظم الشاشات لا توثق حالة Error
- `04-USER-FLOWS.md` (سطر 48): "رسالة خطأ (غير مُنفذ)"

**لماذا مشكلة:**
- UI غير مكتمل
- تجربة مستخدم سيئة عند الأخطاء

**القرار النهائي:**
```
كل شاشة يجب أن توثق:

1. Loading State → SkeletonBlocks
2. Empty State → EmptyState component
3. Error State → ErrorState component (جديد)
4. Success State → البيانات الفعلية

Error State يعرض:
├── أيقونة خطأ
├── رسالة واضحة
├── زر "إعادة المحاولة"
└── رابط "تواصل مع الدعم" (اختياري)
```

**التعديل المطلوب:**
1. إضافة ErrorState component في `05-COMPONENTS-REFERENCE.md`
2. توثيق Error states في `03-SCREENS-ANALYSIS.md`

**الأثر:**
- إضافة ErrorState component
- تحسين تجربة المستخدم

---

## 📊 ملخص القرارات

| ID | القرار | الأولوية |
|----|--------|----------|
| C-01 | 4 أدوار: OWNER, ADMIN, MANAGER, SALES | Sprint 1 |
| C-02 | Company = Lead Enriched View | Sprint 2 |
| C-03 | 9 أنواع Jobs | Sprint 1 |
| C-04 | 7 أنواع Evidence + CUSTOM | Sprint 2 |
| C-05 | Shared DB with Tenant ID | Sprint 0 |
| C-06 | Seat-based Billing | Sprint 3 |
| C-07 | 20+ Audit Event Types | Sprint 2 |
| C-08 | Permission Matrix (4 roles × 15 permissions) | Sprint 1 |
| C-09 | Job Logs table | Sprint 1 |
| C-10 | Extension uses JWT tenant context | Sprint 4 |
| C-11 | Signup + Email Verification | Sprint 0 |
| C-12 | Invites table + Accept flow | Sprint 1 |
| C-13 | JWT-based Tenant Scoping | Sprint 0 |
| C-14 | Activity ≠ AuditLog (clear separation) | Sprint 1 |
| C-15 | PROSPECTED = after Survey | Sprint 2 |
| C-16 | IntegrationConnections table | Sprint 3 |
| C-17 | Feature Flags + Plan Features | Sprint 3 |
| C-18 | ErrorState component | Sprint 1 |

---

## ✅ Checklist للتحقق

- [ ] جميع التضاربات لها قرار نهائي
- [ ] جميع القرارات موثقة مع التبرير
- [ ] جميع التعديلات المطلوبة محددة
- [ ] الأثر على UI/API/DB واضح
- [ ] الأولويات محددة (Sprint)

---

> **الوثيقة التالية:** [09-SAAS_MULTITENANCY.md](./09-SAAS_MULTITENANCY.md) - تصميم SaaS Multi-tenancy
