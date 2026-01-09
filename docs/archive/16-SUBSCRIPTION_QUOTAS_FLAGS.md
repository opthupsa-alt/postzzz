# 💳 الاشتراكات والحدود والميزات - Analysis Pack v2.1

> **الإصدار:** 2.1.0  
> **تاريخ الإنشاء:** يناير 2026  
> **الغرض:** تعريف نظام الباقات والحدود وأعلام الميزات

---

## 📋 ملخص تنفيذي

هذا المستند يُعرّف نظام الاشتراكات (Plans) والحدود (Quotas) وأعلام الميزات (Feature Flags) لنظام ليدززز SaaS.

---

## 📦 الباقات المتاحة

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SUBSCRIPTION PLANS                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐            │
│  │   FREE   │  │ STARTER  │  │   PRO    │  │  ENTERPRISE  │            │
│  │          │  │          │  │          │  │              │            │
│  │  مجاني   │  │  أساسي   │  │ احترافي  │  │   مؤسسي     │            │
│  │          │  │          │  │          │  │              │            │
│  │  0 ر.س   │  │ 99 ر.س   │  │ 299 ر.س  │  │   مخصص      │            │
│  │  /شهر    │  │  /شهر    │  │  /شهر    │  │              │            │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘            │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### تفاصيل الباقات

| الباقة | السعر الشهري | السعر السنوي | الوصف |
|--------|-------------|--------------|-------|
| **FREE** | 0 ر.س | 0 ر.س | للتجربة والمشاريع الصغيرة |
| **STARTER** | 99 ر.س | 990 ر.س (شهرين مجاناً) | للفرق الصغيرة |
| **PRO** | 299 ر.س | 2,990 ر.س (شهرين مجاناً) | للفرق المتوسطة |
| **ENTERPRISE** | مخصص | مخصص | للمؤسسات الكبيرة |

---

## 📊 جدول الحدود (Quotas)

### حدود المستخدمين

| الحد | FREE | STARTER | PRO | ENTERPRISE |
|------|:----:|:-------:|:---:|:----------:|
| **المستخدمين (Seats)** | 1 | 5 | 20 | غير محدود |
| **الأدوار المتاحة** | OWNER فقط | الكل | الكل | الكل + مخصص |

### حدود العملاء (Leads)

| الحد | FREE | STARTER | PRO | ENTERPRISE |
|------|:----:|:-------:|:---:|:----------:|
| **إجمالي العملاء** | 100 | 1,000 | 10,000 | غير محدود |
| **استيراد/شهر** | 50 | 500 | 5,000 | غير محدود |
| **تصدير/شهر** | 50 | 500 | 5,000 | غير محدود |

### حدود البحث (Search)

| الحد | FREE | STARTER | PRO | ENTERPRISE |
|------|:----:|:-------:|:---:|:----------:|
| **عمليات بحث/شهر** | 10 | 100 | 1,000 | غير محدود |
| **نتائج/بحث** | 20 | 50 | 100 | 200 |
| **بحث متزامن** | 1 | 2 | 5 | 10 |

### حدود الأدلة (Evidence)

| الحد | FREE | STARTER | PRO | ENTERPRISE |
|------|:----:|:-------:|:---:|:----------:|
| **أدلة/عميل** | 10 | 50 | 100 | غير محدود |
| **Survey/شهر** | 20 | 200 | 2,000 | غير محدود |
| **حجم التخزين** | 100MB | 1GB | 10GB | غير محدود |

### حدود التقارير (Reports)

| الحد | FREE | STARTER | PRO | ENTERPRISE |
|------|:----:|:-------:|:---:|:----------:|
| **تقارير AI/شهر** | 5 | 50 | 500 | غير محدود |
| **تصدير PDF/شهر** | 5 | 50 | 500 | غير محدود |

### حدود WhatsApp

| الحد | FREE | STARTER | PRO | ENTERPRISE |
|------|:----:|:-------:|:---:|:----------:|
| **رسائل/شهر** | 50 | 500 | 5,000 | غير محدود |
| **رسائل جماعية/يوم** | ✗ | 50 | 500 | غير محدود |
| **قوالب مخصصة** | 1 | 5 | 20 | غير محدود |

### حدود Jobs

| الحد | FREE | STARTER | PRO | ENTERPRISE |
|------|:----:|:-------:|:---:|:----------:|
| **Jobs متزامنة** | 1 | 3 | 10 | 50 |
| **Jobs/ساعة** | 10 | 50 | 200 | غير محدود |
| **Retry attempts** | 1 | 2 | 3 | 5 |

### حدود Extension

| الحد | FREE | STARTER | PRO | ENTERPRISE |
|------|:----:|:-------:|:---:|:----------:|
| **Reveal/شهر** | 10 | 100 | 1,000 | غير محدود |
| **Connectors** | google_maps فقط | الكل | الكل | الكل + مخصص |

---

## 🚩 أعلام الميزات (Feature Flags)

### الميزات حسب الباقة

| Feature Flag | FREE | STARTER | PRO | ENTERPRISE |
|--------------|:----:|:-------:|:---:|:----------:|
| `feature_search` | ✓ | ✓ | ✓ | ✓ |
| `feature_survey` | ✓ | ✓ | ✓ | ✓ |
| `feature_evidence` | ✓ | ✓ | ✓ | ✓ |
| `feature_reports` | ✗ | ✓ | ✓ | ✓ |
| `feature_ai_reports` | ✗ | ✗ | ✓ | ✓ |
| `feature_whatsapp` | ✗ | ✓ | ✓ | ✓ |
| `feature_whatsapp_bulk` | ✗ | ✗ | ✓ | ✓ |
| `feature_reveal` | ✗ | ✓ | ✓ | ✓ |
| `feature_export` | ✗ | ✓ | ✓ | ✓ |
| `feature_import` | ✓ | ✓ | ✓ | ✓ |
| `feature_lists` | ✓ | ✓ | ✓ | ✓ |
| `feature_team` | ✗ | ✓ | ✓ | ✓ |
| `feature_integrations` | ✗ | ✗ | ✓ | ✓ |
| `feature_api_keys` | ✗ | ✗ | ✓ | ✓ |
| `feature_audit_logs` | ✗ | ✗ | ✓ | ✓ |
| `feature_custom_roles` | ✗ | ✗ | ✗ | ✓ |
| `feature_sso` | ✗ | ✗ | ✗ | ✓ |
| `feature_dedicated_support` | ✗ | ✗ | ✗ | ✓ |

### Connectors حسب الباقة

| Connector Flag | FREE | STARTER | PRO | ENTERPRISE |
|----------------|:----:|:-------:|:---:|:----------:|
| `connector_google_maps` | ✓ | ✓ | ✓ | ✓ |
| `connector_web_search` | ✗ | ✓ | ✓ | ✓ |
| `connector_website_crawl` | ✗ | ✓ | ✓ | ✓ |
| `connector_social_public` | ✗ | ✗ | ✓ | ✓ |
| `connector_custom` | ✗ | ✗ | ✗ | ✓ |

---

## 🗄️ Database Schema

### Plans Table

```sql
CREATE TABLE plans (
  id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  name_ar VARCHAR(100) NOT NULL,
  description TEXT,
  description_ar TEXT,
  price_monthly DECIMAL(10,2) NOT NULL,
  price_yearly DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'SAR',
  is_active BOOLEAN DEFAULT TRUE,
  is_public BOOLEAN DEFAULT TRUE,  -- Show in pricing page
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO plans (id, name, name_ar, price_monthly, price_yearly) VALUES
  ('FREE', 'Free', 'مجاني', 0, 0),
  ('STARTER', 'Starter', 'أساسي', 99, 990),
  ('PRO', 'Pro', 'احترافي', 299, 2990),
  ('ENTERPRISE', 'Enterprise', 'مؤسسي', 0, 0);  -- Custom pricing
```

### Plan Quotas Table

```sql
CREATE TABLE plan_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id VARCHAR(20) REFERENCES plans(id),
  quota_key VARCHAR(50) NOT NULL,
  quota_value INTEGER NOT NULL,  -- -1 = unlimited
  period VARCHAR(20) DEFAULT 'MONTHLY',  -- MONTHLY, DAILY, TOTAL
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(plan_id, quota_key)
);

-- Example quotas for STARTER plan
INSERT INTO plan_quotas (plan_id, quota_key, quota_value, period) VALUES
  ('STARTER', 'seats', 5, 'TOTAL'),
  ('STARTER', 'leads_total', 1000, 'TOTAL'),
  ('STARTER', 'leads_import', 500, 'MONTHLY'),
  ('STARTER', 'leads_export', 500, 'MONTHLY'),
  ('STARTER', 'searches', 100, 'MONTHLY'),
  ('STARTER', 'search_results', 50, 'TOTAL'),
  ('STARTER', 'concurrent_jobs', 3, 'TOTAL'),
  ('STARTER', 'jobs_per_hour', 50, 'HOURLY'),
  ('STARTER', 'evidence_per_lead', 50, 'TOTAL'),
  ('STARTER', 'surveys', 200, 'MONTHLY'),
  ('STARTER', 'storage_mb', 1024, 'TOTAL'),
  ('STARTER', 'ai_reports', 50, 'MONTHLY'),
  ('STARTER', 'whatsapp_messages', 500, 'MONTHLY'),
  ('STARTER', 'whatsapp_bulk_daily', 50, 'DAILY'),
  ('STARTER', 'whatsapp_templates', 5, 'TOTAL'),
  ('STARTER', 'reveals', 100, 'MONTHLY');
```

### Plan Features Table

```sql
CREATE TABLE plan_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id VARCHAR(20) REFERENCES plans(id),
  feature_key VARCHAR(50) NOT NULL,
  is_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(plan_id, feature_key)
);

-- Example features for STARTER plan
INSERT INTO plan_features (plan_id, feature_key, is_enabled) VALUES
  ('STARTER', 'feature_search', TRUE),
  ('STARTER', 'feature_survey', TRUE),
  ('STARTER', 'feature_evidence', TRUE),
  ('STARTER', 'feature_reports', TRUE),
  ('STARTER', 'feature_ai_reports', FALSE),
  ('STARTER', 'feature_whatsapp', TRUE),
  ('STARTER', 'feature_whatsapp_bulk', FALSE),
  ('STARTER', 'feature_reveal', TRUE),
  ('STARTER', 'feature_export', TRUE),
  ('STARTER', 'feature_import', TRUE),
  ('STARTER', 'feature_lists', TRUE),
  ('STARTER', 'feature_team', TRUE),
  ('STARTER', 'feature_integrations', FALSE),
  ('STARTER', 'feature_api_keys', FALSE),
  ('STARTER', 'feature_audit_logs', FALSE),
  ('STARTER', 'connector_google_maps', TRUE),
  ('STARTER', 'connector_web_search', TRUE),
  ('STARTER', 'connector_website_crawl', TRUE),
  ('STARTER', 'connector_social_public', FALSE);
```

### Subscriptions Table

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id VARCHAR(20) REFERENCES plans(id),
  status VARCHAR(20) DEFAULT 'ACTIVE',
  billing_cycle VARCHAR(20) DEFAULT 'MONTHLY',  -- MONTHLY, YEARLY
  current_period_start TIMESTAMP NOT NULL,
  current_period_end TIMESTAMP NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMP,
  trial_start TIMESTAMP,
  trial_end TIMESTAMP,
  external_id VARCHAR(255),  -- Stripe/Payment provider ID
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id)
);

CREATE TYPE subscription_status AS ENUM (
  'TRIALING',
  'ACTIVE',
  'PAST_DUE',
  'CANCELED',
  'UNPAID',
  'PAUSED'
);
```

### Usage Counters Table

```sql
CREATE TABLE usage_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  counter_key VARCHAR(50) NOT NULL,
  counter_value INTEGER DEFAULT 0,
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, counter_key, period_start)
);

CREATE INDEX idx_usage_counters_tenant ON usage_counters(tenant_id);
CREATE INDEX idx_usage_counters_period ON usage_counters(period_start, period_end);
```

### Tenant Feature Overrides Table

```sql
-- For custom Enterprise features or temporary overrides
CREATE TABLE tenant_feature_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  feature_key VARCHAR(50) NOT NULL,
  is_enabled BOOLEAN NOT NULL,
  reason TEXT,  -- Why override was applied
  expires_at TIMESTAMP,  -- Optional expiration
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, feature_key)
);
```

---

## 🔍 Quota Check Implementation

```typescript
interface QuotaCheck {
  tenantId: string;
  quotaKey: string;
  increment?: number;  // How much to add (default 1)
}

interface QuotaResult {
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
  resetsAt?: Date;
}

async function checkQuota(check: QuotaCheck): Promise<QuotaResult> {
  const subscription = await getSubscription(check.tenantId);
  const planQuota = await getPlanQuota(subscription.planId, check.quotaKey);
  
  if (planQuota.quotaValue === -1) {
    // Unlimited
    return {
      allowed: true,
      current: 0,
      limit: -1,
      remaining: -1
    };
  }
  
  const period = getPeriodBounds(planQuota.period);
  const currentUsage = await getCurrentUsage(
    check.tenantId,
    check.quotaKey,
    period.start,
    period.end
  );
  
  const increment = check.increment ?? 1;
  const newValue = currentUsage + increment;
  const allowed = newValue <= planQuota.quotaValue;
  
  return {
    allowed,
    current: currentUsage,
    limit: planQuota.quotaValue,
    remaining: Math.max(0, planQuota.quotaValue - currentUsage),
    resetsAt: period.end
  };
}

async function incrementUsage(
  tenantId: string,
  quotaKey: string,
  amount: number = 1
): Promise<void> {
  const period = getPeriodBounds('MONTHLY');
  
  await db.query(`
    INSERT INTO usage_counters (tenant_id, counter_key, counter_value, period_start, period_end)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (tenant_id, counter_key, period_start)
    DO UPDATE SET counter_value = usage_counters.counter_value + $3, updated_at = NOW()
  `, [tenantId, quotaKey, amount, period.start, period.end]);
}
```

---

## 🚩 Feature Flag Check Implementation

```typescript
async function isFeatureEnabled(
  tenantId: string,
  featureKey: string
): Promise<boolean> {
  // 1. Check tenant-specific override first
  const override = await getTenantFeatureOverride(tenantId, featureKey);
  if (override) {
    // Check if override expired
    if (override.expiresAt && override.expiresAt < new Date()) {
      await deleteOverride(override.id);
    } else {
      return override.isEnabled;
    }
  }
  
  // 2. Check plan features
  const subscription = await getSubscription(tenantId);
  const planFeature = await getPlanFeature(subscription.planId, featureKey);
  
  return planFeature?.isEnabled ?? false;
}

// Middleware for feature-gated endpoints
function requireFeature(featureKey: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = req.tenantId;
    const enabled = await isFeatureEnabled(tenantId, featureKey);
    
    if (!enabled) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FEATURE_NOT_AVAILABLE',
          message: 'هذه الميزة غير متاحة في باقتك الحالية',
          feature: featureKey,
          upgradeUrl: '/app/billing/upgrade'
        }
      });
    }
    
    next();
  };
}
```

---

## 📊 Usage Dashboard Data

```typescript
interface UsageDashboard {
  plan: {
    id: string;
    name: string;
    nameAr: string;
  };
  subscription: {
    status: string;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;
  };
  usage: {
    seats: { used: number; limit: number };
    leads: { used: number; limit: number };
    searches: { used: number; limit: number; resetsAt: Date };
    surveys: { used: number; limit: number; resetsAt: Date };
    aiReports: { used: number; limit: number; resetsAt: Date };
    whatsappMessages: { used: number; limit: number; resetsAt: Date };
    reveals: { used: number; limit: number; resetsAt: Date };
    storage: { usedMb: number; limitMb: number };
  };
  features: {
    [key: string]: boolean;
  };
}

// API Endpoint
// GET /api/billing/usage
async function getUsageDashboard(tenantId: string): Promise<UsageDashboard> {
  // ... implementation
}
```

---

## 🔄 Upgrade/Downgrade Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      UPGRADE/DOWNGRADE FLOW                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  UPGRADE (Immediate)                                                     │
│  ───────────────────                                                     │
│  1. User selects new plan                                               │
│  2. Calculate prorated amount                                           │
│  3. Charge difference                                                   │
│  4. Update subscription immediately                                     │
│  5. New features available instantly                                    │
│  6. New quotas apply immediately                                        │
│                                                                          │
│  DOWNGRADE (End of Period)                                              │
│  ─────────────────────────                                              │
│  1. User selects new plan                                               │
│  2. Mark subscription for downgrade at period end                       │
│  3. Show warning if current usage exceeds new limits                    │
│  4. At period end:                                                      │
│     - Switch to new plan                                                │
│     - Features restricted                                               │
│     - Data NOT deleted (just read-only if over limit)                   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Downgrade Warnings

```typescript
interface DowngradeWarning {
  quotaKey: string;
  currentUsage: number;
  newLimit: number;
  action: 'READ_ONLY' | 'OLDEST_ARCHIVED' | 'MANUAL_DELETE';
  message: string;
}

async function getDowngradeWarnings(
  tenantId: string,
  newPlanId: string
): Promise<DowngradeWarning[]> {
  const warnings: DowngradeWarning[] = [];
  
  // Check leads
  const leadsCount = await getLeadsCount(tenantId);
  const newLeadsLimit = await getPlanQuota(newPlanId, 'leads_total');
  if (leadsCount > newLeadsLimit.quotaValue) {
    warnings.push({
      quotaKey: 'leads_total',
      currentUsage: leadsCount,
      newLimit: newLeadsLimit.quotaValue,
      action: 'READ_ONLY',
      message: `لديك ${leadsCount} عميل، الباقة الجديدة تسمح بـ ${newLeadsLimit.quotaValue} فقط. لن تتمكن من إضافة عملاء جدد.`
    });
  }
  
  // Check seats
  const activeMembers = await getActiveMembersCount(tenantId);
  const newSeatsLimit = await getPlanQuota(newPlanId, 'seats');
  if (activeMembers > newSeatsLimit.quotaValue) {
    warnings.push({
      quotaKey: 'seats',
      currentUsage: activeMembers,
      newLimit: newSeatsLimit.quotaValue,
      action: 'MANUAL_DELETE',
      message: `لديك ${activeMembers} عضو نشط، الباقة الجديدة تسمح بـ ${newSeatsLimit.quotaValue} فقط. يجب إزالة بعض الأعضاء قبل التخفيض.`
    });
  }
  
  return warnings;
}
```

---

## 🎁 Trial Period

```typescript
const TRIAL_DAYS = 14;
const TRIAL_PLAN = 'PRO';  // Trial gives PRO features

async function startTrial(tenantId: string): Promise<void> {
  const now = new Date();
  const trialEnd = addDays(now, TRIAL_DAYS);
  
  await db.query(`
    INSERT INTO subscriptions (tenant_id, plan_id, status, trial_start, trial_end, current_period_start, current_period_end)
    VALUES ($1, $2, 'TRIALING', $3, $4, $3, $4)
  `, [tenantId, TRIAL_PLAN, now, trialEnd]);
}

async function checkTrialExpiry(): Promise<void> {
  // Cron job: runs daily
  const expiredTrials = await db.query(`
    SELECT * FROM subscriptions
    WHERE status = 'TRIALING' AND trial_end < NOW()
  `);
  
  for (const sub of expiredTrials) {
    // Downgrade to FREE
    await updateSubscription(sub.id, {
      planId: 'FREE',
      status: 'ACTIVE',
      currentPeriodStart: new Date(),
      currentPeriodEnd: addMonths(new Date(), 1)
    });
    
    // Notify user
    await sendTrialExpiredEmail(sub.tenantId);
  }
}
```

---

## 📈 Billing Events (Audit)

| Event | Trigger | Data Logged |
|-------|---------|-------------|
| `SUBSCRIPTION_CREATED` | New subscription | planId, billingCycle |
| `SUBSCRIPTION_UPGRADED` | Plan upgrade | oldPlan, newPlan, proratedAmount |
| `SUBSCRIPTION_DOWNGRADED` | Plan downgrade scheduled | oldPlan, newPlan, effectiveDate |
| `SUBSCRIPTION_CANCELED` | Cancellation | reason, effectiveDate |
| `SUBSCRIPTION_RENEWED` | Auto-renewal | planId, amount |
| `PAYMENT_SUCCEEDED` | Payment processed | amount, invoiceId |
| `PAYMENT_FAILED` | Payment failed | reason, retryDate |
| `TRIAL_STARTED` | Trial begins | trialEnd |
| `TRIAL_ENDED` | Trial expires | convertedToPlan |
| `QUOTA_EXCEEDED` | Limit reached | quotaKey, limit |
| `FEATURE_ACCESSED` | Feature used | featureKey |

---

## ❓ Open Questions

| # | السؤال | طريقة التحقق |
|---|--------|--------------|
| 1 | هل نحتاج باقة سنوية بخصم أكبر؟ | Business decision |
| 2 | ما مدة Trial المناسبة؟ | A/B testing |
| 3 | هل نسمح بـ Add-ons (شراء حدود إضافية)؟ | Product decision |
| 4 | كيف نتعامل مع الفواتير المتأخرة؟ | Legal/Finance review |

---

> **الوثيقة السابقة:** [15-MULTITENANCY_RBAC_MATRIX.md](./15-MULTITENANCY_RBAC_MATRIX.md)  
> **الوثيقة التالية:** [02-DATA-MODEL.md](./02-DATA-MODEL.md) (محدّث)
