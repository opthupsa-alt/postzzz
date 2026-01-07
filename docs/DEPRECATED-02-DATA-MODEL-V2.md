# 📊 نموذج البيانات - Analysis Pack v2 (Backend-Ready)

> **الإصدار:** 2.0.0  
> **تاريخ التحديث:** يناير 2026  
> **الحالة:** جاهز للتطوير Backend

---

## 📋 ملخص التغييرات من v1

| التغيير | الوصف |
|---------|-------|
| ✅ Multi-tenancy | إضافة `tenant_id` لجميع جداول Domain |
| ✅ SaaS Entities | إضافة tenants, memberships, invites, subscriptions |
| ✅ RBAC | 4 أدوار: OWNER, ADMIN, MANAGER, SALES |
| ✅ Job System | توسيع JobTypes + إضافة job_logs |
| ✅ Billing | إضافة plans, subscriptions, usage_counters |
| ✅ Feature Flags | إضافة feature_flags, tenant_features |
| ✅ Audit | تحسين audit_logs schema |
| ✅ Integrations | إضافة integration_connections |

---

## 🏗️ نظرة عامة على البنية

```
┌─────────────────────────────────────────────────────────────┐
│                    Platform Layer                            │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────────┐ │
│  │ users   │  │ tenants │  │ plans   │  │ feature_flags   │ │
│  └─────────┘  └─────────┘  └─────────┘  └─────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                    Tenant Layer                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ memberships │  │   invites   │  │   subscriptions     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                    Domain Layer (Tenant-Scoped)              │
│  ┌───────┐ ┌───────┐ ┌──────────┐ ┌─────────┐ ┌──────────┐ │
│  │ leads │ │ lists │ │ evidence │ │ reports │ │   jobs   │ │
│  └───────┘ └───────┘ └──────────┘ └─────────┘ └──────────┘ │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────┐ │
│  │ activities │ │ whatsapp_* │ │ audit_logs │ │ api_keys │ │
│  └────────────┘ └────────────┘ └────────────┘ └──────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Platform Layer (Non-Tenant)

### 1. المستخدمين (users)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  phone VARCHAR(50),
  email_verified BOOLEAN DEFAULT FALSE,
  email_verified_at TIMESTAMP,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
```

```typescript
interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  avatarUrl?: string;
  phone?: string;
  emailVerified: boolean;
  emailVerifiedAt?: Date;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

---

### 2. المنظمات (tenants)

```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  logo_url TEXT,
  status VARCHAR(20) DEFAULT 'ACTIVE',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_status ON tenants(status);
```

```typescript
interface Tenant {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  status: 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED' | 'DELETED';
  settings: {
    timezone?: string;
    language?: 'ar' | 'en';
    whatsappPhoneId?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

---

### 3. العضويات (memberships)

```sql
CREATE TABLE memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'SALES',
  status VARCHAR(20) DEFAULT 'ACTIVE',
  manager_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, tenant_id)
);

CREATE INDEX idx_memberships_user ON memberships(user_id);
CREATE INDEX idx_memberships_tenant ON memberships(tenant_id);
CREATE INDEX idx_memberships_role ON memberships(tenant_id, role);
```

```typescript
interface Membership {
  id: string;
  userId: string;
  tenantId: string;
  role: 'OWNER' | 'ADMIN' | 'MANAGER' | 'SALES';
  status: 'ACTIVE' | 'SUSPENDED';
  managerId?: string;  // For MANAGER role hierarchy
  createdAt: Date;
  updatedAt: Date;
}
```

---

### 4. الدعوات (invites)

```sql
CREATE TABLE invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'SALES',
  token VARCHAR(255) UNIQUE NOT NULL,
  invited_by UUID NOT NULL REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'PENDING',
  expires_at TIMESTAMP NOT NULL,
  accepted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_invites_token ON invites(token);
CREATE INDEX idx_invites_tenant ON invites(tenant_id);
CREATE INDEX idx_invites_email ON invites(email);
```

```typescript
interface Invite {
  id: string;
  tenantId: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'SALES';
  token: string;
  invitedBy: string;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';
  expiresAt: Date;
  acceptedAt?: Date;
  createdAt: Date;
}
```

---

### 5. الباقات (plans)

```sql
CREATE TABLE plans (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  name_ar VARCHAR(100) NOT NULL,
  description TEXT,
  price_monthly INTEGER NOT NULL,  -- in halalas (SAR * 100)
  price_yearly INTEGER NOT NULL,
  seats_limit INTEGER NOT NULL,
  leads_limit INTEGER NOT NULL,
  searches_limit INTEGER NOT NULL,
  messages_limit INTEGER NOT NULL,
  features JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

```typescript
interface Plan {
  id: string;  // 'free', 'starter', 'pro', 'enterprise'
  name: string;
  nameAr: string;
  description?: string;
  priceMonthly: number;
  priceYearly: number;
  seatsLimit: number;      // -1 = unlimited
  leadsLimit: number;
  searchesLimit: number;
  messagesLimit: number;
  features: string[];
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}
```

---

### 6. Feature Flags (feature_flags)

```sql
CREATE TABLE feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT FALSE,
  rollout_percentage INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_feature_flags_key ON feature_flags(key);
```

```typescript
interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description?: string;
  enabled: boolean;
  rolloutPercentage: number;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 🏢 Tenant Layer (Tenant-Scoped)

### 7. الاشتراكات (subscriptions)

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID UNIQUE NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id VARCHAR(50) NOT NULL REFERENCES plans(id),
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  billing_cycle VARCHAR(20) DEFAULT 'MONTHLY',
  current_period_start TIMESTAMP NOT NULL,
  current_period_end TIMESTAMP NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  trial_ends_at TIMESTAMP,
  stripe_subscription_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_tenant ON subscriptions(tenant_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
```

```typescript
interface Subscription {
  id: string;
  tenantId: string;
  planId: string;
  status: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'UNPAID';
  billingCycle: 'MONTHLY' | 'YEARLY';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  trialEndsAt?: Date;
  stripeSubscriptionId?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

---

### 8. عدادات الاستخدام (usage_counters)

```sql
CREATE TABLE usage_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  metric VARCHAR(50) NOT NULL,
  value INTEGER DEFAULT 0,
  period VARCHAR(10) NOT NULL,  -- '2026-01' for monthly
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(tenant_id, metric, period)
);

CREATE INDEX idx_usage_tenant_period ON usage_counters(tenant_id, period);
```

```typescript
interface UsageCounter {
  id: string;
  tenantId: string;
  metric: 'seats' | 'leads' | 'searches' | 'messages';
  value: number;
  period: string;
  updatedAt: Date;
}
```

---

### 9. تجاوزات الميزات (tenant_features)

```sql
CREATE TABLE tenant_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  feature_key VARCHAR(100) NOT NULL,
  enabled BOOLEAN NOT NULL,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(tenant_id, feature_key)
);

CREATE INDEX idx_tenant_features ON tenant_features(tenant_id);
```

```typescript
interface TenantFeature {
  id: string;
  tenantId: string;
  featureKey: string;
  enabled: boolean;
  expiresAt?: Date;
  createdAt: Date;
}
```

---

## 📊 Domain Layer (Tenant-Scoped)

### 10. العملاء المحتملين (leads)

```sql
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Basic Info
  company_name VARCHAR(255) NOT NULL,
  industry VARCHAR(100),
  city VARCHAR(100),
  phone VARCHAR(50),
  email VARCHAR(255),
  website TEXT,
  
  -- Status & Classification
  status VARCHAR(20) DEFAULT 'NEW',
  score INTEGER,
  tags TEXT[] DEFAULT '{}',
  
  -- Enrichment Data
  enrichment_data JSONB DEFAULT '{}',
  
  -- Relationships
  list_id UUID REFERENCES lists(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_contacted_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_leads_tenant ON leads(tenant_id);
CREATE INDEX idx_leads_tenant_status ON leads(tenant_id, status);
CREATE INDEX idx_leads_tenant_created ON leads(tenant_id, created_at DESC);
CREATE INDEX idx_leads_assigned ON leads(tenant_id, assigned_to);
CREATE INDEX idx_leads_list ON leads(list_id);
CREATE INDEX idx_leads_search ON leads USING gin(to_tsvector('arabic', company_name || ' ' || COALESCE(industry, '')));

-- RLS Policy
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON leads
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

```typescript
interface Lead {
  id: string;
  tenantId: string;
  
  // Basic Info
  companyName: string;
  industry?: string;
  city?: string;
  phone?: string;
  email?: string;
  website?: string;
  
  // Status & Classification
  status: LeadStatus;
  score?: number;
  tags: string[];
  
  // Enrichment Data (from Survey)
  enrichmentData: {
    foundedYear?: number;
    employeeCount?: string;
    revenue?: string;
    technologies?: string[];
    socialProfiles?: {
      linkedin?: string;
      twitter?: string;
    };
    decisionMakers?: {
      name: string;
      title: string;
      email?: string;
      phone?: string;
    }[];
  };
  
  // Relationships
  listId?: string;
  assignedTo?: string;
  createdBy: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastContactedAt?: Date;
}

type LeadStatus = 'NEW' | 'PROSPECTED' | 'CONTACTED' | 'QUALIFIED' | 'LOST';
```

---

### 11. القوائم (lists)

```sql
CREATE TABLE lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(20),
  is_smart BOOLEAN DEFAULT FALSE,
  smart_filters JSONB,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_lists_tenant ON lists(tenant_id);
```

```typescript
interface List {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  color?: string;
  isSmart: boolean;
  smartFilters?: {
    status?: LeadStatus[];
    industry?: string[];
    city?: string[];
    hasPhone?: boolean;
    hasWebsite?: boolean;
  };
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Computed
  leadsCount?: number;
}
```

---

### 12. الأدلة الرقمية (evidence)

```sql
CREATE TABLE evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  source VARCHAR(255),
  url TEXT,
  snippet TEXT,
  raw_data JSONB,
  confidence VARCHAR(20) DEFAULT 'MEDIUM',
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_evidence_tenant ON evidence(tenant_id);
CREATE INDEX idx_evidence_lead ON evidence(lead_id);
CREATE INDEX idx_evidence_type ON evidence(tenant_id, type);
```

```typescript
interface Evidence {
  id: string;
  tenantId: string;
  leadId: string;
  
  type: EvidenceType;
  title: string;
  source?: string;
  url?: string;
  snippet?: string;
  rawData?: object;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  
  createdAt: Date;
}

type EvidenceType = 
  | 'WEBSITE'      // الموقع الرسمي
  | 'SOCIAL'       // LinkedIn, Twitter, etc.
  | 'NEWS'         // مقالات إخبارية
  | 'REVIEWS'      // Google Maps Reviews
  | 'GOVERNMENT'   // سجلات حكومية
  | 'FINANCIAL'    // بيانات مالية
  | 'CUSTOM';      // مصدر مخصص
```

---

### 13. التقارير (reports)

```sql
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id UUID UNIQUE NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  
  summary TEXT,
  sections JSONB NOT NULL DEFAULT '[]',
  score INTEGER,
  
  generated_by VARCHAR(50) DEFAULT 'AI',
  model_version VARCHAR(50),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_reports_tenant ON reports(tenant_id);
CREATE INDEX idx_reports_lead ON reports(lead_id);
```

```typescript
interface Report {
  id: string;
  tenantId: string;
  leadId: string;
  
  summary?: string;
  sections: ReportSection[];
  score?: number;
  
  generatedBy: 'AI' | 'MANUAL';
  modelVersion?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

interface ReportSection {
  title: string;
  content: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  evidenceIds: string[];
}
```

---

### 14. المهام (jobs)

```sql
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  type VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING',
  progress INTEGER DEFAULT 0,
  message TEXT,
  
  entity_type VARCHAR(50),
  entity_id UUID,
  
  input JSONB,
  result JSONB,
  error JSONB,
  
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE INDEX idx_jobs_tenant ON jobs(tenant_id);
CREATE INDEX idx_jobs_tenant_status ON jobs(tenant_id, status);
CREATE INDEX idx_jobs_entity ON jobs(entity_type, entity_id);
CREATE INDEX idx_jobs_created ON jobs(tenant_id, created_at DESC);
```

```typescript
interface Job {
  id: string;
  tenantId: string;
  
  type: JobType;
  status: JobStatus;
  progress: number;
  message?: string;
  
  entityType?: 'lead' | 'list' | 'tenant';
  entityId?: string;
  
  input?: object;
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
}

type JobType = 
  | 'SEARCH'        // بحث Google Maps
  | 'SURVEY'        // فحص آلي للعميل
  | 'WHATSAPP'      // إرسال رسالة واتساب
  | 'WHATSAPP_BULK' // إرسال رسائل جماعية
  | 'IMPORT'        // استيراد من ملف
  | 'EXPORT'        // تصدير لملف
  | 'REVEAL'        // كشف بيانات التواصل
  | 'REPORT'        // توليد تقرير AI
  | 'SYNC';         // مزامنة مع تكامل خارجي

type JobStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
```

---

### 15. سجلات المهام (job_logs)

```sql
CREATE TABLE job_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  
  level VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_job_logs_job ON job_logs(job_id);
```

```typescript
interface JobLog {
  id: string;
  jobId: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
  data?: object;
  createdAt: Date;
}
```

---

### 16. الأنشطة (activities)

```sql
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  
  type VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB,
  
  user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_activities_tenant ON activities(tenant_id);
CREATE INDEX idx_activities_lead ON activities(lead_id);
CREATE INDEX idx_activities_created ON activities(lead_id, created_at DESC);
```

```typescript
interface Activity {
  id: string;
  tenantId: string;
  leadId: string;
  
  type: ActivityType;
  description: string;
  metadata?: object;
  
  userId: string;
  createdAt: Date;
}

type ActivityType = 
  | 'CREATED'        // تم إنشاء العميل
  | 'SURVEY'         // تم الفحص الآلي
  | 'WHATSAPP'       // تم إرسال رسالة
  | 'STATUS_CHANGE'  // تم تغيير الحالة
  | 'LIST_ADD'       // تم الإضافة لقائمة
  | 'LIST_REMOVE'    // تم الإزالة من قائمة
  | 'NOTE'           // ملاحظة يدوية
  | 'CALL'           // مكالمة هاتفية
  | 'MEETING'        // اجتماع
  | 'ASSIGNED';      // تم التعيين لمستخدم
```

---

### 17. رسائل واتساب (whatsapp_messages)

```sql
CREATE TABLE whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  
  phone VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  template_id UUID REFERENCES whatsapp_templates(id),
  
  status VARCHAR(20) DEFAULT 'PENDING',
  external_id VARCHAR(255),
  error_message TEXT,
  
  sent_by UUID NOT NULL REFERENCES users(id),
  sent_at TIMESTAMP DEFAULT NOW(),
  delivered_at TIMESTAMP,
  read_at TIMESTAMP,
  
  idempotency_key VARCHAR(255) UNIQUE
);

CREATE INDEX idx_whatsapp_tenant ON whatsapp_messages(tenant_id);
CREATE INDEX idx_whatsapp_lead ON whatsapp_messages(lead_id);
CREATE INDEX idx_whatsapp_status ON whatsapp_messages(tenant_id, status);
CREATE INDEX idx_whatsapp_sent ON whatsapp_messages(tenant_id, sent_at DESC);
```

```typescript
interface WhatsAppMessage {
  id: string;
  tenantId: string;
  leadId?: string;
  
  phone: string;
  message: string;
  templateId?: string;
  
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  externalId?: string;
  errorMessage?: string;
  
  sentBy: string;
  sentAt: Date;
  deliveredAt?: Date;
  readAt?: Date;
  
  idempotencyKey?: string;
}
```

---

### 18. قوالب واتساب (whatsapp_templates)

```sql
CREATE TABLE whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  
  is_approved BOOLEAN DEFAULT FALSE,
  external_id VARCHAR(255),
  
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_templates_tenant ON whatsapp_templates(tenant_id);
```

```typescript
interface WhatsAppTemplate {
  id: string;
  tenantId: string;
  
  name: string;
  content: string;
  variables: string[];  // ['name', 'industry', 'city']
  
  isApproved: boolean;
  externalId?: string;
  
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
```

---

### 19. سجلات الرقابة (audit_logs)

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  event_type VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  action VARCHAR(255) NOT NULL,
  
  details JSONB DEFAULT '{}',
  
  user_id UUID REFERENCES users(id),
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_audit_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_tenant_created ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX idx_audit_event_type ON audit_logs(tenant_id, event_type);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id);

-- Prevent deletion/updates
CREATE RULE audit_no_delete AS ON DELETE TO audit_logs DO INSTEAD NOTHING;
CREATE RULE audit_no_update AS ON UPDATE TO audit_logs DO INSTEAD NOTHING;
```

```typescript
interface AuditLog {
  id: string;
  tenantId: string;
  
  eventType: AuditEventType;
  entityType?: string;
  entityId?: string;
  action: string;
  
  details: {
    before?: object;
    after?: object;
    metadata?: object;
  };
  
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  
  createdAt: Date;
}

type AuditEventType =
  // Auth
  | 'AUTH_LOGIN' | 'AUTH_LOGOUT' | 'AUTH_FAILED_LOGIN'
  | 'AUTH_PASSWORD_CHANGE' | 'AUTH_2FA_ENABLE' | 'AUTH_2FA_DISABLE'
  // Team
  | 'TEAM_INVITE_SENT' | 'TEAM_INVITE_ACCEPTED' | 'TEAM_MEMBER_REMOVED'
  | 'TEAM_ROLE_CHANGED'
  // Data
  | 'LEAD_CREATED' | 'LEAD_UPDATED' | 'LEAD_DELETED' | 'LEAD_BULK_DELETE'
  | 'LEAD_EXPORTED' | 'LEAD_IMPORTED'
  // WhatsApp
  | 'WHATSAPP_MESSAGE_SENT' | 'WHATSAPP_BULK_SENT'
  // API
  | 'API_KEY_CREATED' | 'API_KEY_REVOKED'
  // Integration
  | 'INTEGRATION_CONNECTED' | 'INTEGRATION_DISCONNECTED' | 'INTEGRATION_SYNCED'
  // Billing
  | 'SUBSCRIPTION_CREATED' | 'SUBSCRIPTION_UPGRADED' | 'SUBSCRIPTION_DOWNGRADED'
  | 'SUBSCRIPTION_CANCELLED' | 'PAYMENT_SUCCEEDED' | 'PAYMENT_FAILED'
  // Settings
  | 'SETTINGS_UPDATED' | 'ORG_SETTINGS_UPDATED';
```

---

### 20. مفاتيح API (api_keys)

```sql
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  label VARCHAR(255) NOT NULL,
  key_prefix VARCHAR(20) NOT NULL,
  key_hash VARCHAR(255) NOT NULL,
  
  scopes TEXT[] DEFAULT '{}',
  
  last_used_at TIMESTAMP,
  expires_at TIMESTAMP,
  revoked_at TIMESTAMP,
  
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_api_keys_tenant ON api_keys(tenant_id);
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);
```

```typescript
interface ApiKey {
  id: string;
  tenantId: string;
  
  label: string;
  keyPrefix: string;  // 'lz_live_' or 'lz_test_'
  keyHash: string;
  
  scopes: string[];
  
  lastUsedAt?: Date;
  expiresAt?: Date;
  revokedAt?: Date;
  
  createdBy: string;
  createdAt: Date;
}
```

---

### 21. اتصالات التكاملات (integration_connections)

```sql
CREATE TABLE integration_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  type VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'CONNECTED',
  
  credentials BYTEA,  -- Encrypted
  config JSONB DEFAULT '{}',
  
  last_sync_at TIMESTAMP,
  last_error TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(tenant_id, type)
);

CREATE INDEX idx_integrations_tenant ON integration_connections(tenant_id);
```

```typescript
interface IntegrationConnection {
  id: string;
  tenantId: string;
  
  type: 'WHATSAPP' | 'SALESFORCE' | 'HUBSPOT' | 'SLACK' | 'NOTION' | 'GOOGLE_MAPS';
  status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR' | 'PENDING';
  
  credentials: object;  // Encrypted at rest
  config: object;
  
  lastSyncAt?: Date;
  lastError?: string;
  
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 🔗 مخطط العلاقات (ERD)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           PLATFORM LAYER                                 │
│                                                                          │
│  ┌─────────┐         ┌─────────┐         ┌─────────┐                   │
│  │  users  │◄───────►│members  │◄───────►│ tenants │                   │
│  └─────────┘         └─────────┘         └────┬────┘                   │
│       │                                       │                         │
│       │              ┌─────────┐              │                         │
│       └─────────────►│ invites │◄─────────────┘                         │
│                      └─────────┘                                        │
│                                                                          │
│  ┌─────────┐         ┌─────────┐         ┌─────────────────┐           │
│  │  plans  │◄───────►│subscript│◄───────►│ usage_counters  │           │
│  └─────────┘         └─────────┘         └─────────────────┘           │
│                                                                          │
│  ┌──────────────┐    ┌─────────────────┐                               │
│  │feature_flags │    │ tenant_features │                               │
│  └──────────────┘    └─────────────────┘                               │
├─────────────────────────────────────────────────────────────────────────┤
│                           DOMAIN LAYER                                   │
│                                                                          │
│  ┌─────────┐         ┌─────────┐                                       │
│  │  lists  │◄───────►│  leads  │                                       │
│  └─────────┘         └────┬────┘                                       │
│                           │                                             │
│       ┌───────────────────┼───────────────────┐                        │
│       │                   │                   │                        │
│       ▼                   ▼                   ▼                        │
│  ┌──────────┐       ┌──────────┐       ┌────────────┐                 │
│  │ evidence │       │ reports  │       │ activities │                 │
│  └──────────┘       └──────────┘       └────────────┘                 │
│                                                                          │
│  ┌─────────┐         ┌──────────┐                                      │
│  │  jobs   │◄───────►│ job_logs │                                      │
│  └─────────┘         └──────────┘                                      │
│                                                                          │
│  ┌───────────────┐   ┌────────────────────┐                            │
│  │ whatsapp_msgs │   │ whatsapp_templates │                            │
│  └───────────────┘   └────────────────────┘                            │
│                                                                          │
│  ┌────────────┐      ┌─────────────────────────┐                       │
│  │ audit_logs │      │ integration_connections │                       │
│  └────────────┘      └─────────────────────────┘                       │
│                                                                          │
│  ┌──────────┐                                                           │
│  │ api_keys │                                                           │
│  └──────────┘                                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Enums Summary

```typescript
// Lead Status
type LeadStatus = 'NEW' | 'PROSPECTED' | 'CONTACTED' | 'QUALIFIED' | 'LOST';

// User Roles
type UserRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'SALES';

// Job Types
type JobType = 'SEARCH' | 'SURVEY' | 'WHATSAPP' | 'WHATSAPP_BULK' | 'IMPORT' | 'EXPORT' | 'REVEAL' | 'REPORT' | 'SYNC';

// Job Status
type JobStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';

// Evidence Types
type EvidenceType = 'WEBSITE' | 'SOCIAL' | 'NEWS' | 'REVIEWS' | 'GOVERNMENT' | 'FINANCIAL' | 'CUSTOM';

// Activity Types
type ActivityType = 'CREATED' | 'SURVEY' | 'WHATSAPP' | 'STATUS_CHANGE' | 'LIST_ADD' | 'LIST_REMOVE' | 'NOTE' | 'CALL' | 'MEETING' | 'ASSIGNED';

// Subscription Status
type SubscriptionStatus = 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'UNPAID';

// Tenant Status
type TenantStatus = 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED' | 'DELETED';

// Integration Types
type IntegrationType = 'WHATSAPP' | 'SALESFORCE' | 'HUBSPOT' | 'SLACK' | 'NOTION' | 'GOOGLE_MAPS';
```

---

## 🔒 Security Considerations

1. **Password Hashing:** Argon2id with salt
2. **API Keys:** SHA-256 hash, only prefix stored
3. **Integration Credentials:** AES-256-GCM encryption at rest
4. **Audit Logs:** Immutable (no UPDATE/DELETE)
5. **RLS:** Enabled on all tenant-scoped tables
6. **Indexes:** Optimized for tenant-scoped queries

---

## 📈 Retention Policies

| Table | Retention | Action |
|-------|-----------|--------|
| audit_logs | 2 years | Archive to cold storage |
| job_logs | 30 days | Delete |
| jobs (completed) | 90 days | Delete |
| whatsapp_messages | 1 year | Archive |
| evidence | Indefinite | - |
| reports | Indefinite | - |

---

> **الوثيقة التالية:** [06-API-REQUIREMENTS.md](./06-API-REQUIREMENTS.md) (محدّث)
