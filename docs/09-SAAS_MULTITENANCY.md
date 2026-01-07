# 🏢 تصميم SaaS Multi-tenancy - Analysis Pack v2

> **الإصدار:** 2.0.0  
> **تاريخ الإنشاء:** يناير 2026  
> **الغرض:** تصميم كامل لنظام Multi-tenant SaaS

---

## 📋 ملخص تنفيذي

هذا المستند يُعرّف التصميم الكامل لتحويل نظام ليدززز إلى منصة SaaS متعددة المستأجرين (Multi-tenant) مع عزل كامل للبيانات ونظام صلاحيات متقدم.

---

## 🎯 المصطلحات الموحدة

| المصطلح | التعريف | الاستخدام |
|---------|---------|----------|
| **Tenant** | الشركة/المنظمة المشتركة في النظام | `tenants` table |
| **Organization** | مرادف لـ Tenant (للعرض في UI) | واجهة المستخدم |
| **Workspace** | **لا نستخدمه** (تجنب الخلط) | - |
| **User** | المستخدم الفردي | `users` table |
| **Membership** | علاقة المستخدم بالـ Tenant | `memberships` table |
| **Owner** | مالك الـ Tenant (واحد فقط) | role في membership |

---

## 👥 نظام الأدوار والصلاحيات (RBAC)

### الأدوار المعتمدة

```typescript
type UserRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'SALES';
```

| الدور | الوصف | القيود |
|-------|-------|--------|
| **OWNER** | مالك المنظمة | واحد فقط لكل Tenant، لا يمكن حذفه |
| **ADMIN** | مدير كامل الصلاحيات | يمكن إدارة كل شيء عدا Billing |
| **MANAGER** | مدير فريق | يرى بيانات فريقه فقط |
| **SALES** | مندوب مبيعات | يرى بياناته فقط |

### مصفوفة الصلاحيات (Permission Matrix)

```
┌─────────────────────────┬───────┬───────┬─────────┬───────┐
│ Permission              │ OWNER │ ADMIN │ MANAGER │ SALES │
├─────────────────────────┼───────┼───────┼─────────┼───────┤
│ LEADS                   │       │       │         │       │
├─────────────────────────┼───────┼───────┼─────────┼───────┤
│ leads:read              │ all   │ all   │ team    │ own   │
│ leads:create            │ ✓     │ ✓     │ ✓       │ ✓     │
│ leads:update            │ all   │ all   │ team    │ own   │
│ leads:delete            │ ✓     │ ✓     │ ✗       │ ✗     │
│ leads:export            │ ✓     │ ✓     │ ✓       │ ✗     │
│ leads:import            │ ✓     │ ✓     │ ✓       │ ✗     │
│ leads:bulk_actions      │ ✓     │ ✓     │ ✓       │ ✗     │
├─────────────────────────┼───────┼───────┼─────────┼───────┤
│ LISTS                   │       │       │         │       │
├─────────────────────────┼───────┼───────┼─────────┼───────┤
│ lists:read              │ all   │ all   │ team    │ own   │
│ lists:create            │ ✓     │ ✓     │ ✓       │ ✓     │
│ lists:update            │ all   │ all   │ own     │ own   │
│ lists:delete            │ ✓     │ ✓     │ own     │ own   │
├─────────────────────────┼───────┼───────┼─────────┼───────┤
│ WHATSAPP                │       │       │         │       │
├─────────────────────────┼───────┼───────┼─────────┼───────┤
│ whatsapp:send           │ ✓     │ ✓     │ ✓       │ ✓     │
│ whatsapp:bulk_send      │ ✓     │ ✓     │ ✓       │ ✗     │
│ whatsapp:templates      │ ✓     │ ✓     │ ✓       │ read  │
│ whatsapp:view_logs      │ all   │ all   │ team    │ own   │
├─────────────────────────┼───────┼───────┼─────────┼───────┤
│ TEAM                    │       │       │         │       │
├─────────────────────────┼───────┼───────┼─────────┼───────┤
│ team:read               │ ✓     │ ✓     │ team    │ ✗     │
│ team:invite             │ ✓     │ ✓     │ ✗       │ ✗     │
│ team:remove             │ ✓     │ ✓     │ ✗       │ ✗     │
│ team:change_role        │ ✓     │ ✓     │ ✗       │ ✗     │
├─────────────────────────┼───────┼───────┼─────────┼───────┤
│ INTEGRATIONS            │       │       │         │       │
├─────────────────────────┼───────┼───────┼─────────┼───────┤
│ integrations:read       │ ✓     │ ✓     │ ✗       │ ✗     │
│ integrations:manage     │ ✓     │ ✓     │ ✗       │ ✗     │
│ api_keys:read           │ ✓     │ ✓     │ ✗       │ ✗     │
│ api_keys:manage         │ ✓     │ ✓     │ ✗       │ ✗     │
├─────────────────────────┼───────┼───────┼─────────┼───────┤
│ AUDIT & SETTINGS        │       │       │         │       │
├─────────────────────────┼───────┼───────┼─────────┼───────┤
│ audit:read              │ ✓     │ ✓     │ ✗       │ ✗     │
│ org:settings            │ ✓     │ ✓     │ ✗       │ ✗     │
│ org:delete              │ ✓     │ ✗     │ ✗       │ ✗     │
├─────────────────────────┼───────┼───────┼─────────┼───────┤
│ BILLING                 │       │       │         │       │
├─────────────────────────┼───────┼───────┼─────────┼───────┤
│ billing:read            │ ✓     │ read  │ ✗       │ ✗     │
│ billing:manage          │ ✓     │ ✗     │ ✗       │ ✗     │
└─────────────────────────┴───────┴───────┴─────────┴───────┘

Legend:
- ✓ / all = full access to all records
- ✗ = no access
- team = access to team members' records only
- own = access to own records only
- read = read-only access
```

### تنفيذ الصلاحيات

```typescript
// Permission check function
function checkPermission(
  user: User,
  membership: Membership,
  permission: string,
  resourceOwnerId?: string,
  resourceTeamId?: string
): boolean {
  const role = membership.role;
  const permissionDef = PERMISSION_MATRIX[permission][role];
  
  if (permissionDef === true || permissionDef === 'all') {
    return true;
  }
  
  if (permissionDef === false || permissionDef === undefined) {
    return false;
  }
  
  if (permissionDef === 'own') {
    return resourceOwnerId === user.id;
  }
  
  if (permissionDef === 'team') {
    // Check if resource owner is in user's team
    return isInSameTeam(user.id, resourceOwnerId, membership.tenantId);
  }
  
  return false;
}
```

---

## 🚀 تدفق Onboarding (SaaS)

### 1. تسجيل منظمة جديدة (Signup)

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐  │
│  │ Signup  │───►│ Verify  │───►│Onboard  │───►│Dashboard│  │
│  │  Form   │    │ Email   │    │ (opt)   │    │         │  │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**الخطوات:**

```
1. /signup
   │
   ├── إدخال البيانات:
   │   ├── اسم المنظمة (Organization Name) *
   │   ├── الاسم الكامل *
   │   ├── البريد الإلكتروني *
   │   ├── كلمة المرور *
   │   └── رقم الجوال (اختياري)
   │
   ├── اختيار الباقة (اختياري):
   │   ├── Free (افتراضي)
   │   ├── Starter
   │   ├── Pro
   │   └── Enterprise (تواصل معنا)
   │
   └── الموافقة على الشروط

2. إنشاء الكيانات:
   │
   ├── Tenant (organization)
   │   ├── id: uuid
   │   ├── name: "اسم المنظمة"
   │   ├── slug: "organization-slug"
   │   └── status: PENDING_VERIFICATION
   │
   ├── User
   │   ├── id: uuid
   │   ├── email: "email@example.com"
   │   ├── password_hash: "..."
   │   └── email_verified: false
   │
   ├── Membership
   │   ├── user_id: user.id
   │   ├── tenant_id: tenant.id
   │   └── role: OWNER
   │
   └── Subscription
       ├── tenant_id: tenant.id
       ├── plan_id: FREE
       └── status: ACTIVE

3. /verify-email?token=xxx
   │
   ├── التحقق من Token
   ├── user.email_verified = true
   ├── tenant.status = ACTIVE
   └── Redirect to /onboarding or /app/dashboard

4. /onboarding (اختياري)
   │
   ├── Step 1: ربط WhatsApp
   │   └── [تخطي] أو [ربط الآن]
   │
   ├── Step 2: دعوة أعضاء الفريق
   │   └── [تخطي] أو [دعوة]
   │
   ├── Step 3: استيراد عملاء
   │   └── [تخطي] أو [استيراد]
   │
   └── [بدء العمل] → /app/dashboard
```

### 2. قبول دعوة (Accept Invite)

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐  │
│  │ Email   │───►│ Accept  │───►│ Login/  │───►│Dashboard│  │
│  │ Link    │    │ Invite  │    │ Signup  │    │         │  │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**الخطوات:**

```
1. المستخدم يستلم بريد الدعوة
   │
   └── رابط: /accept-invite?token=xxx

2. /accept-invite?token=xxx
   │
   ├── التحقق من Token:
   │   ├── موجود؟
   │   ├── غير منتهي الصلاحية؟
   │   └── غير مستخدم؟
   │
   ├── إذا Token غير صالح:
   │   └── عرض رسالة خطأ + رابط للتواصل
   │
   └── إذا Token صالح:
       │
       ├── عرض معلومات الدعوة:
       │   ├── اسم المنظمة
       │   ├── الدور المعين
       │   └── من قام بالدعوة
       │
       └── [قبول الدعوة]

3. بعد قبول الدعوة:
   │
   ├── إذا المستخدم مسجل (email موجود):
   │   ├── إنشاء Membership جديد
   │   ├── تحديث Invite.status = ACCEPTED
   │   └── Redirect to login (إذا غير مسجل دخول)
   │
   └── إذا المستخدم جديد:
       ├── عرض نموذج إكمال التسجيل:
       │   ├── الاسم الكامل *
       │   ├── كلمة المرور *
       │   └── (البريد مملوء مسبقاً)
       │
       ├── إنشاء User
       ├── إنشاء Membership
       ├── تحديث Invite.status = ACCEPTED
       └── Redirect to /app/dashboard
```

### 3. تبديل المنظمة (Workspace Switcher)

```
المستخدم قد ينتمي لعدة منظمات:
├── منظمة شخصية
├── شركة 1
└── شركة 2

Workspace Switcher في AppShell:
┌─────────────────────────┐
│ 🏢 شركة التقنية        │ ← المنظمة الحالية
├─────────────────────────┤
│ 🏢 شركة أخرى           │
│ 🏢 منظمتي الشخصية      │
├─────────────────────────┤
│ ➕ إنشاء منظمة جديدة    │
└─────────────────────────┘
```

**التنفيذ:**

```typescript
// JWT Token structure
interface JWTPayload {
  sub: string;              // user id
  email: string;
  currentTenantId: string;  // active tenant
  tenants: {
    id: string;
    name: string;
    role: UserRole;
  }[];
  iat: number;
  exp: number;
}

// Switch Tenant API
POST /api/auth/switch-tenant
{
  "tenantId": "new-tenant-id"
}

Response:
{
  "token": "new-jwt-token",
  "tenant": {
    "id": "...",
    "name": "...",
    "role": "..."
  }
}
```

---

## 🔒 عزل البيانات (Data Isolation)

### استراتيجية العزل

```
Strategy: Shared Database with Tenant ID Column

┌─────────────────────────────────────────────────────────────┐
│                     PostgreSQL Database                      │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    tenants table                     │   │
│  │  id | name | slug | status | created_at             │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                 │
│           ┌───────────────┼───────────────┐                │
│           ▼               ▼               ▼                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   leads     │  │   lists     │  │   jobs      │        │
│  │ tenant_id   │  │ tenant_id   │  │ tenant_id   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### جداول Tenant-Scoped

كل الجداول التالية تحتوي على `tenant_id`:

```
Domain Tables:
├── leads
├── lists
├── list_members
├── evidence
├── reports
├── activities
├── jobs
├── job_logs
├── whatsapp_messages
├── whatsapp_templates
├── integration_connections
├── api_keys
└── audit_logs

Non-Tenant Tables (Platform-wide):
├── users (global, linked via memberships)
├── tenants
├── memberships
├── invites
├── plans
├── feature_flags
└── platform_settings
```

### Query Scoping

```typescript
// Middleware: Inject tenant context
async function tenantMiddleware(req, res, next) {
  const tenantId = req.user.currentTenantId;
  
  if (!tenantId) {
    return res.status(401).json({ error: 'No tenant context' });
  }
  
  // Verify user has access to this tenant
  const membership = await db.memberships.findFirst({
    where: { userId: req.user.id, tenantId }
  });
  
  if (!membership) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  req.tenantId = tenantId;
  req.membership = membership;
  next();
}

// Repository pattern with tenant scoping
class LeadRepository {
  constructor(private tenantId: string) {}
  
  async findAll(filters: LeadFilters) {
    return db.leads.findMany({
      where: {
        tenantId: this.tenantId,  // Always scoped
        ...filters
      }
    });
  }
  
  async create(data: CreateLeadDto) {
    return db.leads.create({
      data: {
        ...data,
        tenantId: this.tenantId  // Always set
      }
    });
  }
}
```

### Row Level Security (RLS) - طبقة حماية إضافية

```sql
-- ═══════════════════════════════════════════════════════════════
-- RLS Policies for ALL tenant-scoped tables
-- ═══════════════════════════════════════════════════════════════

-- Helper function to get current tenant
CREATE OR REPLACE FUNCTION current_tenant_id() 
RETURNS UUID AS $$
  SELECT current_setting('app.current_tenant_id', true)::uuid;
$$ LANGUAGE SQL STABLE;

-- Helper function to get current user
CREATE OR REPLACE FUNCTION current_user_id() 
RETURNS UUID AS $$
  SELECT current_setting('app.current_user_id', true)::uuid;
$$ LANGUAGE SQL STABLE;

-- ═══════════════════════════════════════════════════════════════
-- LEADS table
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_leads ON leads
  FOR ALL
  USING (tenant_id = current_tenant_id());

-- ═══════════════════════════════════════════════════════════════
-- LISTS table
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_lists ON lists
  FOR ALL
  USING (tenant_id = current_tenant_id());

-- ═══════════════════════════════════════════════════════════════
-- EVIDENCE table
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_evidence ON evidence
  FOR ALL
  USING (tenant_id = current_tenant_id());

-- ═══════════════════════════════════════════════════════════════
-- JOBS table
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_jobs ON jobs
  FOR ALL
  USING (tenant_id = current_tenant_id());

-- ═══════════════════════════════════════════════════════════════
-- AUDIT_LOGS table (read-only for users)
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_audit ON audit_logs
  FOR SELECT
  USING (tenant_id = current_tenant_id());

-- Prevent user deletion/update of audit logs
CREATE POLICY no_modify_audit ON audit_logs
  FOR UPDATE
  USING (false);

CREATE POLICY no_delete_audit ON audit_logs
  FOR DELETE
  USING (false);

-- ═══════════════════════════════════════════════════════════════
-- Apply to all other tenant-scoped tables
-- ═══════════════════════════════════════════════════════════════
-- Repeat pattern for: reports, activities, whatsapp_messages, 
-- whatsapp_templates, integration_connections, api_keys

-- ═══════════════════════════════════════════════════════════════
-- Set tenant context at connection level (in NestJS middleware)
-- ═══════════════════════════════════════════════════════════════
-- SET app.current_tenant_id = 'tenant-uuid';
-- SET app.current_user_id = 'user-uuid';
```

### NestJS Middleware for RLS

```typescript
// tenant-context.middleware.ts
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(private readonly dataSource: DataSource) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const tenantId = req.user?.currentTenantId;
    const userId = req.user?.id;

    if (tenantId && userId) {
      await this.dataSource.query(
        `SET app.current_tenant_id = $1; SET app.current_user_id = $2;`,
        [tenantId, userId]
      );
    }

    next();
  }
}
```

---

## 💳 نظام الاشتراكات والفوترة (Billing)

### الباقات (Plans)

```typescript
interface Plan {
  id: string;
  name: string;
  nameAr: string;
  price: number;           // monthly in SAR
  yearlyPrice: number;     // yearly in SAR (discounted)
  
  // Limits
  seatsLimit: number;      // max team members
  leadsLimit: number;      // max leads in CRM
  searchesLimit: number;   // searches per month
  messagesLimit: number;   // WhatsApp messages per month
  
  // Features
  features: string[];      // feature flags enabled
}

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    nameAr: 'مجاني',
    price: 0,
    yearlyPrice: 0,
    seatsLimit: 1,
    leadsLimit: 100,
    searchesLimit: 10,
    messagesLimit: 50,
    features: ['basic_search', 'manual_leads', 'basic_reports']
  },
  {
    id: 'starter',
    name: 'Starter',
    nameAr: 'المبتدئ',
    price: 199,
    yearlyPrice: 1990,
    seatsLimit: 3,
    leadsLimit: 1000,
    searchesLimit: 100,
    messagesLimit: 500,
    features: ['...free', 'whatsapp', 'lists', 'csv_import', 'templates']
  },
  {
    id: 'pro',
    name: 'Pro',
    nameAr: 'الاحترافي',
    price: 499,
    yearlyPrice: 4990,
    seatsLimit: 10,
    leadsLimit: 10000,
    searchesLimit: 500,
    messagesLimit: 5000,
    features: ['...starter', 'ai_reports', 'bulk_whatsapp', 'export', 'integrations']
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    nameAr: 'المؤسسات',
    price: -1,  // Custom pricing
    yearlyPrice: -1,
    seatsLimit: -1,  // Unlimited
    leadsLimit: -1,
    searchesLimit: -1,
    messagesLimit: -1,
    features: ['...pro', 'api_access', 'sso', 'audit_logs', 'dedicated_support', 'custom_integrations']
  }
];
```

### كيانات الفوترة

```typescript
interface Subscription {
  id: string;
  tenantId: string;
  planId: string;
  status: 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'TRIALING';
  billingCycle: 'MONTHLY' | 'YEARLY';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  trialEndsAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface UsageCounter {
  id: string;
  tenantId: string;
  metric: 'seats' | 'leads' | 'searches' | 'messages';
  value: number;
  period: string;  // '2026-01' for monthly metrics
  updatedAt: Date;
}

interface Invoice {
  id: string;
  tenantId: string;
  subscriptionId: string;
  amount: number;
  currency: 'SAR';
  status: 'DRAFT' | 'OPEN' | 'PAID' | 'VOID' | 'UNCOLLECTIBLE';
  dueDate: Date;
  paidAt?: Date;
  invoiceUrl?: string;
  createdAt: Date;
}

interface PaymentMethod {
  id: string;
  tenantId: string;
  type: 'CARD' | 'BANK_TRANSFER' | 'MADA';
  last4?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  createdAt: Date;
}
```

### Usage Enforcement

```typescript
// Middleware: Check usage limits
async function usageLimitMiddleware(metric: string) {
  return async (req, res, next) => {
    const { tenantId } = req;
    
    const subscription = await getSubscription(tenantId);
    const plan = getPlan(subscription.planId);
    const usage = await getUsage(tenantId, metric);
    
    const limit = plan[`${metric}Limit`];
    
    if (limit !== -1 && usage.value >= limit) {
      return res.status(402).json({
        error: 'USAGE_LIMIT_EXCEEDED',
        message: `لقد وصلت للحد الأقصى من ${metric}`,
        currentUsage: usage.value,
        limit: limit,
        upgradeUrl: '/app/billing/upgrade'
      });
    }
    
    next();
  };
}

// Usage: Apply to routes
router.post('/api/leads', 
  usageLimitMiddleware('leads'),
  createLeadHandler
);

router.post('/api/search',
  usageLimitMiddleware('searches'),
  searchHandler
);
```

---

## 🚩 نظام Feature Flags

### الهيكل

```typescript
// Global Feature Flag (platform-wide)
interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number;  // 0-100
  createdAt: Date;
  updatedAt: Date;
}

// Tenant Feature Override
interface TenantFeature {
  id: string;
  tenantId: string;
  featureKey: string;
  enabled: boolean;
  expiresAt?: Date;  // For trials
  createdAt: Date;
}

// Feature check function
async function hasFeature(tenantId: string, featureKey: string): Promise<boolean> {
  // 1. Check tenant override
  const override = await db.tenantFeatures.findFirst({
    where: { tenantId, featureKey }
  });
  
  if (override) {
    if (override.expiresAt && override.expiresAt < new Date()) {
      return false;  // Trial expired
    }
    return override.enabled;
  }
  
  // 2. Check plan features
  const subscription = await getSubscription(tenantId);
  const plan = getPlan(subscription.planId);
  
  if (plan.features.includes(featureKey)) {
    return true;
  }
  
  // 3. Check global flag with rollout
  const flag = await db.featureFlags.findFirst({
    where: { key: featureKey }
  });
  
  if (!flag || !flag.enabled) {
    return false;
  }
  
  if (flag.rolloutPercentage === 100) {
    return true;
  }
  
  // Deterministic rollout based on tenant ID
  const hash = hashTenantId(tenantId);
  return (hash % 100) < flag.rolloutPercentage;
}
```

### Feature Keys

```typescript
const FEATURE_KEYS = {
  // Search & Prospecting
  BASIC_SEARCH: 'basic_search',
  ADVANCED_SEARCH: 'advanced_search',
  AI_SUGGESTIONS: 'ai_suggestions',
  
  // Leads & CRM
  MANUAL_LEADS: 'manual_leads',
  CSV_IMPORT: 'csv_import',
  CSV_EXPORT: 'csv_export',
  BULK_ACTIONS: 'bulk_actions',
  
  // Lists
  LISTS: 'lists',
  SMART_LISTS: 'smart_lists',
  
  // Reports & AI
  BASIC_REPORTS: 'basic_reports',
  AI_REPORTS: 'ai_reports',
  LEAD_SCORING: 'lead_scoring',
  
  // WhatsApp
  WHATSAPP: 'whatsapp',
  BULK_WHATSAPP: 'bulk_whatsapp',
  TEMPLATES: 'templates',
  AI_MESSAGES: 'ai_messages',
  
  // Integrations
  INTEGRATIONS: 'integrations',
  API_ACCESS: 'api_access',
  WEBHOOKS: 'webhooks',
  
  // Security & Compliance
  AUDIT_LOGS: 'audit_logs',
  SSO: 'sso',
  TWO_FACTOR: 'two_factor',
  
  // Support
  BASIC_SUPPORT: 'basic_support',
  PRIORITY_SUPPORT: 'priority_support',
  DEDICATED_SUPPORT: 'dedicated_support'
};
```

---

## 👑 Platform Admin (SuperAdmin)

### الوصف

SuperAdmin هو مستوى إداري على مستوى المنصة (ليس Tenant). يُستخدم لإدارة المنصة ككل.

### صلاحيات SuperAdmin

```typescript
const SUPERADMIN_PERMISSIONS = [
  // Tenant Management
  'platform:tenants:read',
  'platform:tenants:create',
  'platform:tenants:update',
  'platform:tenants:delete',
  'platform:tenants:impersonate',
  
  // User Management
  'platform:users:read',
  'platform:users:update',
  'platform:users:ban',
  
  // Billing
  'platform:subscriptions:read',
  'platform:subscriptions:update',
  'platform:invoices:read',
  
  // Feature Flags
  'platform:features:read',
  'platform:features:update',
  
  // System
  'platform:settings:read',
  'platform:settings:update',
  'platform:logs:read',
  'platform:metrics:read'
];
```

### واجهة SuperAdmin

```
/admin (منفصلة عن /app)
├── /admin/dashboard     → إحصائيات المنصة
├── /admin/tenants       → إدارة المنظمات
├── /admin/users         → إدارة المستخدمين
├── /admin/subscriptions → إدارة الاشتراكات
├── /admin/features      → إدارة Feature Flags
├── /admin/logs          → سجلات النظام
└── /admin/settings      → إعدادات المنصة
```

> **ملاحظة:** واجهة SuperAdmin خارج نطاق MVP. تُوثق هنا للمرجعية.

---

## 📊 ملخص الكيانات الجديدة

| الكيان | الوصف | Tenant-Scoped |
|--------|-------|---------------|
| `tenants` | المنظمات | ✗ (هو الـ Tenant) |
| `users` | المستخدمين | ✗ (global) |
| `memberships` | علاقة User-Tenant | ✗ |
| `invites` | دعوات الانضمام | ✓ |
| `plans` | الباقات | ✗ (global) |
| `subscriptions` | اشتراكات المنظمات | ✓ |
| `usage_counters` | عدادات الاستخدام | ✓ |
| `invoices` | الفواتير | ✓ |
| `payment_methods` | طرق الدفع | ✓ |
| `feature_flags` | Feature Flags | ✗ (global) |
| `tenant_features` | تجاوزات الميزات | ✓ |

---

## 🔗 روابط الوثائق

- **السابق:** [08-CONFLICTS_AND_GAPS.md](./08-CONFLICTS_AND_GAPS.md)
- **التالي:** [02-DATA-MODEL.md](./02-DATA-MODEL.md) (محدّث)

---

> **ملاحظة:** هذا التصميم يُشكل الأساس لتحويل النظام إلى SaaS. التنفيذ يبدأ في Sprint 0.
