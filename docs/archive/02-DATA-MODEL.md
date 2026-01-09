# 📊 نموذج البيانات - ليدززز (Leedz)

> **الإصدار:** 2.1.0  
> **تاريخ التحديث:** يناير 2026  
> **الحالة:** Backend-ready مع SaaS Multi-Tenant

---

## 🗄️ نظرة عامة على البيانات

النظام يستخدم **PostgreSQL** كقاعدة بيانات رئيسية مع **NestJS** كـ Backend.

### Multi-Tenancy Strategy

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    MULTI-TENANCY: Shared DB + Tenant ID                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     PostgreSQL Database                          │   │
│  │                                                                   │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │   │
│  │  │  Tenant A   │  │  Tenant B   │  │  Tenant C   │              │   │
│  │  │  leads      │  │  leads      │  │  leads      │              │   │
│  │  │  lists      │  │  lists      │  │  lists      │              │   │
│  │  │  evidence   │  │  evidence   │  │  evidence   │              │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘              │   │
│  │                                                                   │   │
│  │  All tables have tenant_id column + RLS policies                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Tenant Scoping Policy

```sql
-- كل جدول تشغيلي يحتوي على tenant_id
-- RLS (Row Level Security) يضمن العزل

-- Example RLS policy
CREATE POLICY tenant_isolation ON leads
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

---

## 🏢 كيانات SaaS Multi-Tenant

### Tenant (المنظمة)

```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### User (المستخدم)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  avatar_url TEXT,
  phone VARCHAR(20),
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Membership (العضوية)

```sql
CREATE TABLE memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('OWNER', 'ADMIN', 'MANAGER', 'SALES')),
  status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
  manager_id UUID REFERENCES users(id),  -- For MANAGER scope
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, tenant_id)
);
```

### Invite (الدعوة)

```sql
CREATE TABLE invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  message TEXT,
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED')),
  invited_by UUID REFERENCES users(id),
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Plan (الباقة)

```sql
CREATE TABLE plans (
  id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  name_ar VARCHAR(100) NOT NULL,
  price_monthly DECIMAL(10,2) NOT NULL,
  price_yearly DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Subscription (الاشتراك)

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id VARCHAR(20) REFERENCES plans(id),
  status VARCHAR(20) DEFAULT 'ACTIVE',
  billing_cycle VARCHAR(20) DEFAULT 'MONTHLY',
  current_period_start TIMESTAMP NOT NULL,
  current_period_end TIMESTAMP NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  trial_end TIMESTAMP,
  external_id VARCHAR(255),  -- Stripe ID
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Audit Log (سجل الرقابة)

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  event_type VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_event ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
```

---

---

## 📋 الكيانات التشغيلية (Domain Entities)

> **ملاحظة:** جميع الكيانات التشغيلية تحتوي على `tenant_id` للعزل

### 1. العميل المحتمل (Lead)

```sql
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_name VARCHAR(255) NOT NULL,
  industry VARCHAR(100),
  city VARCHAR(100),
  phone VARCHAR(50),
  email VARCHAR(255),
  website VARCHAR(255),
  status VARCHAR(20) DEFAULT 'NEW' CHECK (status IN ('NEW', 'PROSPECTED', 'CONTACTED', 'QUALIFIED', 'LOST')),
  score INTEGER,
  tags TEXT[],
  list_id UUID REFERENCES lists(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES users(id),
  created_by UUID REFERENCES users(id),
  google_place_id VARCHAR(255),
  source VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_leads_tenant ON leads(tenant_id);
CREATE INDEX idx_leads_status ON leads(tenant_id, status);
CREATE INDEX idx_leads_list ON leads(list_id);
CREATE INDEX idx_leads_assigned ON leads(assigned_to);
```

```typescript
type LeadStatus = 'NEW' | 'PROSPECTED' | 'CONTACTED' | 'QUALIFIED' | 'LOST';
```

**العلاقات:**
- `Lead` → `LeadList` (Many-to-One): عميل ينتمي لقائمة واحدة أو لا ينتمي لأي قائمة
- `Lead` → `Evidence` (One-to-Many): عميل له عدة أدلة
- `Lead` → `Report` (One-to-One): عميل له تقرير واحد
- `Lead` → `Activity` (One-to-Many): عميل له عدة أنشطة

---

### 2. القائمة (List)

```sql
CREATE TABLE lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_shared BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_lists_tenant ON lists(tenant_id);
```

**العلاقات:**
- `List` → `Lead` (One-to-Many): قائمة تحتوي عدة عملاء

---

### 3. الدليل الرقمي (Evidence)

```sql
CREATE TABLE evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id),
  title VARCHAR(255) NOT NULL,
  source VARCHAR(100) NOT NULL,
  url TEXT,
  snippet TEXT NOT NULL,
  type VARCHAR(20) CHECK (type IN ('WEBSITE', 'SOCIAL', 'NEWS', 'REVIEWS', 'MAPS', 'CONTACT')),
  confidence VARCHAR(10) CHECK (confidence IN ('HIGH', 'MEDIUM', 'LOW')),
  hash VARCHAR(64) NOT NULL,  -- SHA-256 for deduplication
  size_bytes INTEGER,
  raw_data JSONB,
  collected_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_evidence_tenant ON evidence(tenant_id);
CREATE INDEX idx_evidence_lead ON evidence(lead_id);
CREATE INDEX idx_evidence_hash ON evidence(hash);
```

```typescript
type EvidenceType = 'WEBSITE' | 'SOCIAL' | 'NEWS' | 'REVIEWS' | 'MAPS' | 'CONTACT';
```

**العلاقات:**
- `Evidence` → `Lead` (Many-to-One): عدة أدلة تنتمي لعميل واحد
- `Evidence` → `Job` (Many-to-One): أدلة تم جمعها من Job

---

### 4. التقرير الذكي (Report)

```sql
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id),
  summary TEXT,
  sections JSONB NOT NULL DEFAULT '[]',
  generated_by VARCHAR(50),  -- 'AI' or 'MANUAL'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(lead_id)  -- One report per lead
);

CREATE INDEX idx_reports_tenant ON reports(tenant_id);
CREATE INDEX idx_reports_lead ON reports(lead_id);
```

**العلاقات:**
- `Report` → `Lead` (One-to-One): تقرير واحد لكل عميل

---

### 5. المهمة/العملية (Job)

```sql
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL CHECK (type IN ('SEARCH', 'SURVEY', 'REVEAL', 'REPORT', 'WHATSAPP', 'IMPORT', 'EXPORT', 'BULK_STATUS', 'BULK_ASSIGN')),
  status VARCHAR(30) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'AWAITING_AGENT', 'AGENT_RUNNING', 'NEEDS_USER_ACTION', 'BLOCKED', 'SUCCESS', 'FAILED', 'PARTIAL_SUCCESS', 'CANCELLED')),
  priority VARCHAR(10) DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  message TEXT,
  context JSONB,  -- leadId, listId, searchQuery, etc.
  plan JSONB,  -- Job steps for Extension Runner
  result JSONB,
  error JSONB,
  created_by UUID REFERENCES users(id),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_jobs_tenant ON jobs(tenant_id);
CREATE INDEX idx_jobs_status ON jobs(tenant_id, status);
CREATE INDEX idx_jobs_type ON jobs(tenant_id, type);
CREATE INDEX idx_jobs_created_by ON jobs(created_by);
```

```typescript
type JobType = 'SEARCH' | 'SURVEY' | 'REVEAL' | 'REPORT' | 'WHATSAPP' | 'IMPORT' | 'EXPORT' | 'BULK_STATUS' | 'BULK_ASSIGN';

type JobStatus = 'PENDING' | 'AWAITING_AGENT' | 'AGENT_RUNNING' | 'NEEDS_USER_ACTION' | 'BLOCKED' | 'SUCCESS' | 'FAILED' | 'PARTIAL_SUCCESS' | 'CANCELLED';
```

---

### 6. سجل المهمة (Job Log)

```sql
CREATE TABLE job_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  step_id INTEGER,
  level VARCHAR(10) CHECK (level IN ('DEBUG', 'INFO', 'WARN', 'ERROR')),
  message TEXT NOT NULL,
  data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_job_logs_job ON job_logs(job_id);
```

---

### 7. قالب الرسالة (WhatsApp Template)

```sql
CREATE TABLE whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  variables TEXT[],  -- ['name', 'industry', 'city']
  is_default BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_whatsapp_templates_tenant ON whatsapp_templates(tenant_id);
```

---

### 8. سجل الرسائل (WhatsApp Message)

```sql
CREATE TABLE whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  job_id UUID REFERENCES jobs(id),
  template_id UUID REFERENCES whatsapp_templates(id),
  phone VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED')),
  external_id VARCHAR(255),  -- WhatsApp API message ID
  error_message TEXT,
  sent_by UUID REFERENCES users(id),
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_whatsapp_messages_tenant ON whatsapp_messages(tenant_id);
CREATE INDEX idx_whatsapp_messages_lead ON whatsapp_messages(lead_id);
CREATE INDEX idx_whatsapp_messages_status ON whatsapp_messages(status);
```

---

### 9. مفتاح API (API Key)

```sql
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  label VARCHAR(100) NOT NULL,
  key_hash VARCHAR(255) NOT NULL,  -- Hashed, never stored plain
  key_prefix VARCHAR(10) NOT NULL,  -- First 8 chars for display
  permissions TEXT[],
  last_used_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_api_keys_tenant ON api_keys(tenant_id);
CREATE UNIQUE INDEX idx_api_keys_hash ON api_keys(key_hash);
```

---

### 10. عداد الاستخدام (Usage Counter)

```sql
CREATE TABLE usage_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  counter_key VARCHAR(50) NOT NULL,
  counter_value INTEGER DEFAULT 0,
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, counter_key, period_start)
);

CREATE INDEX idx_usage_counters_tenant ON usage_counters(tenant_id);
```

---

### 11. تفضيلات الإشعارات (Notification Preferences)

```sql
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  search_completions BOOLEAN DEFAULT TRUE,
  sales_reports BOOLEAN DEFAULT TRUE,
  whatsapp_status BOOLEAN DEFAULT TRUE,
  team_activity BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔗 مخطط العلاقات (ERD)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SaaS Multi-Tenant ERD                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────┐                                                        │
│  │   Tenant    │◄────────────────────────────────────────┐              │
│  │             │                                          │              │
│  └──────┬──────┘                                          │              │
│         │                                                  │              │
│         │ 1:N                                              │              │
│         ▼                                                  │              │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐│              │
│  │ Membership  │◄────►│    User     │      │   Invite    ││              │
│  │             │      │             │      │             ││              │
│  └─────────────┘      └─────────────┘      └─────────────┘│              │
│                                                            │              │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐│              │
│  │Subscription │      │    Plan     │      │ AuditLog    ││              │
│  │             │─────►│             │      │             ││              │
│  └─────────────┘      └─────────────┘      └─────────────┘│              │
│                                                            │              │
├────────────────────────────────────────────────────────────┤              │
│                    Domain Entities (tenant_id)             │              │
├────────────────────────────────────────────────────────────┤              │
│                                                            │              │
│  ┌─────────────┐       ┌─────────────┐                    │              │
│  │    List     │───────│    Lead     │                    │              │
│  │             │ 1   * │             │                    │              │
│  └─────────────┘       └──────┬──────┘                    │              │
│                               │                            │              │
│                ┌──────────────┼──────────────┐            │              │
│                │              │              │            │              │
│                ▼              ▼              ▼            │              │
│         ┌──────────┐   ┌──────────┐   ┌──────────┐       │              │
│         │ Evidence │   │  Report  │   │   Job    │       │              │
│         │          │   │          │   │          │       │              │
│         └──────────┘   └──────────┘   └────┬─────┘       │              │
│                                             │             │              │
│                                             ▼             │              │
│                                      ┌──────────┐        │              │
│                                      │ Job Log  │        │              │
│                                      └──────────┘        │              │
│                                                            │              │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐     │              │
│  │  WA Template│   │ WA Message  │   │   API Key   │     │              │
│  │             │   │             │   │             │     │              │
│  └─────────────┘   └─────────────┘   └─────────────┘     │              │
│                                                            │              │
└────────────────────────────────────────────────────────────┘              │
```

---

## 📦 هيكل الـ Store (Zustand)

```typescript
interface AppState {
  // ═══════════════════════════════════════════
  // البيانات الأساسية (Core Data)
  // ═══════════════════════════════════════════
  
  jobs: Job[];                              // المهام النشطة
  leads: Lead[];                            // نتائج البحث (مؤقتة)
  savedLeads: Lead[];                       // العملاء المحفوظين (CRM)
  lists: LeadList[];                        // القوائم
  evidence: Record<string, Evidence[]>;     // الأدلة (مفهرسة بـ leadId)
  reports: Record<string, Report>;          // التقارير (مفهرسة بـ leadId)
  activities: Record<string, Activity[]>;   // الأنشطة (مفهرسة بـ leadId)
  auditLogs: AuditLog[];                    // سجلات الرقابة
  templates: WhatsAppTemplate[];            // قوالب الرسائل
  apiKeys: ApiKey[];                        // مفاتيح API
  
  // ═══════════════════════════════════════════
  // حالة النظام (System State)
  // ═══════════════════════════════════════════
  
  activeJobId: string | null;               // المهمة النشطة حالياً
  connectedPhone: string;                   // رقم الواتساب المتصل
  notificationPreferences: NotificationPreferences;
  team: TeamMember[];                       // أعضاء الفريق
  language: 'ar' | 'en';                    // اللغة الحالية

  // ═══════════════════════════════════════════
  // الإجراءات (Actions)
  // ═══════════════════════════════════════════
  
  // إدارة المهام
  addJob: (job: Job) => void;
  updateJob: (id: string, updates: Partial<Job>) => void;
  setActiveJob: (id: string | null) => void;
  
  // إدارة العملاء
  setLeads: (leads: Lead[]) => void;
  saveLead: (lead: Lead) => void;
  bulkSaveLeads: (leads: Lead[]) => void;
  updateLeadStatus: (leadId: string, status: Lead['status']) => void;
  removeLead: (id: string) => void;
  
  // إدارة الأدلة والتقارير
  addEvidence: (leadId: string, item: Evidence) => void;
  setReport: (leadId: string, report: Report) => void;
  addActivity: (leadId: string, activity: Activity) => void;
  addAuditLog: (log: AuditLog) => void;
  
  // إدارة مفاتيح API
  addApiKey: (label: string) => void;
  deleteApiKey: (id: string) => void;
  
  // إدارة القوائم
  addList: (list: LeadList) => void;
  deleteList: (id: string) => void;
  assignLeadsToList: (leadIds: string[], listId: string) => void;
  removeLeadsFromList: (leadIds: string[]) => void;
  
  // إدارة القوالب
  addTemplate: (template: WhatsAppTemplate) => void;
  updateTemplate: (id: string, name: string, content: string) => void;
  deleteTemplate: (id: string) => void;
  
  // الإعدادات والفريق
  setConnectedPhone: (phone: string) => void;
  toggleNotificationPreference: (key: keyof NotificationPreferences) => void;
  addTeamMember: (member: TeamMember) => void;
  removeTeamMember: (id: string) => void;
  toggleLanguage: () => void;
}
```

---

## 🔄 تدفق البيانات

### 1. تدفق البحث عن عملاء

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   البحث     │───►│  addJob()   │───►│   jobs[]    │
│  (Form)     │    │             │    │             │
└─────────────┘    └─────────────┘    └──────┬──────┘
                                             │
                                             ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  عرض       │◄───│ setLeads()  │◄───│ updateJob() │
│  النتائج    │    │             │    │             │
└─────────────┘    └─────────────┘    └─────────────┘
```

### 2. تدفق حفظ العميل

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  اختيار     │───►│ saveLead()  │───►│ savedLeads[]│
│  العملاء    │    │             │    │             │
└─────────────┘    └─────────────┘    └─────────────┘
                          │
                          ▼
                   ┌─────────────┐
                   │assignToList │
                   │  (optional) │
                   └─────────────┘
```

### 3. تدفق الفحص الآلي (Survey)

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  تشغيل     │───►│  addJob()   │───►│   jobs[]    │
│  الفحص     │    │ (SURVEY)    │    │             │
└─────────────┘    └─────────────┘    └──────┬──────┘
                                             │
      ┌──────────────────────────────────────┤
      │                                      │
      ▼                                      ▼
┌─────────────┐                       ┌─────────────┐
│addEvidence()│                       │ setReport() │
│             │                       │             │
└─────────────┘                       └─────────────┘
      │                                      │
      ▼                                      ▼
┌─────────────┐                       ┌─────────────┐
│ evidence[]  │                       │  reports{}  │
└─────────────┘                       └─────────────┘
```

---

## 📊 البيانات التجريبية (Mock Data)

### عملاء محفوظين افتراضيين

```typescript
savedLeads: [
  { 
    id: 'CRM-1', 
    companyName: 'أرامكو السعودية', 
    industry: 'طاقة', 
    city: 'الظهران', 
    status: 'QUALIFIED', 
    evidenceCount: 5, 
    hasReport: true, 
    tags: ['VIP', 'Enterprise'], 
    listId: '1' 
  },
  { 
    id: 'CRM-2', 
    companyName: 'بنك الراجحي', 
    industry: 'مالية', 
    city: 'الرياض', 
    status: 'CONTACTED', 
    evidenceCount: 2, 
    hasReport: false, 
    tags: ['Banking'], 
    listId: '1' 
  },
  { 
    id: 'CRM-3', 
    companyName: 'مطاعم الرومانسية', 
    industry: 'أغذية', 
    city: 'جدة', 
    status: 'NEW', 
    evidenceCount: 1, 
    hasReport: true, 
    listId: '2' 
  }
]
```

### قوائم افتراضية

```typescript
lists: [
  { id: '1', name: 'عملاء الرياض - تكنولوجيا', count: 42, updatedAt: 'منذ يومين' },
  { id: '2', name: 'مطاعم جدة المستهدفة', count: 15, updatedAt: 'منذ 5 أيام' }
]
```

### أعضاء الفريق الافتراضيين

```typescript
team: [
  { id: 'T1', name: 'أحمد محمد', email: 'ahmed@leadz.sa', role: 'ADMIN', status: 'ONLINE', joinedAt: '2023-01-01' },
  { id: 'T2', name: 'سارة خالد', email: 'sara@leadz.sa', role: 'SALES', status: 'ONLINE', joinedAt: '2023-05-12' }
]
```

---

## 🗃️ مقترح قاعدة البيانات (للإنتاج)

### جداول PostgreSQL المقترحة

```sql
-- المستخدمين
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'SALES',
  status VARCHAR(20) DEFAULT 'OFFLINE',
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- القوائم
CREATE TABLE lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- العملاء المحتملين
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name VARCHAR(255) NOT NULL,
  industry VARCHAR(100),
  city VARCHAR(100),
  phone VARCHAR(50),
  website TEXT,
  status VARCHAR(20) DEFAULT 'NEW',
  tags TEXT[],
  list_id UUID REFERENCES lists(id),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- الأدلة الرقمية
CREATE TABLE evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  source VARCHAR(255),
  url TEXT,
  snippet TEXT,
  type VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);

-- التقارير
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID UNIQUE REFERENCES leads(id) ON DELETE CASCADE,
  summary TEXT,
  sections JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- الأنشطة
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  description TEXT,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- قوالب الرسائل
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- سجلات الرقابة
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action VARCHAR(255) NOT NULL,
  user_id UUID REFERENCES users(id),
  target VARCHAR(255),
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- مفاتيح API
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label VARCHAR(255) NOT NULL,
  key_hash VARCHAR(255) NOT NULL,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP
);
```

---

## 🔐 Security Appendix

### 1. CORS Configuration

```typescript
// NestJS CORS config
const corsOptions = {
  origin: [
    'https://app.leedz.sa',           // Production web
    'https://staging.leedz.sa',       // Staging
    'http://localhost:3000',          // Local dev
    'chrome-extension://<EXTENSION_ID>' // Chrome Extension
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID']
};
```

### 2. RBAC Enforcement (Server-side)

```typescript
// Guard decorator
@UseGuards(AuthGuard, RbacGuard)
@RequirePermission('leads:read')
@Get('leads')
async getLeads(@CurrentUser() user, @CurrentTenant() tenant) {
  // Permission already verified by guard
  return this.leadsService.findAll(tenant.id, user.dataScope);
}

// RBAC Guard implementation
@Injectable()
export class RbacGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const permission = this.reflector.get<string>('permission', context.getHandler());
    const { user, membership } = context.switchToHttp().getRequest();
    return checkPermission(user, membership, permission);
  }
}
```

### 3. Rate Limiting

```typescript
// Rate limits per plan
const RATE_LIMITS = {
  FREE:       { requests: 100,  window: '1m' },
  STARTER:    { requests: 500,  window: '1m' },
  PRO:        { requests: 2000, window: '1m' },
  ENTERPRISE: { requests: 10000, window: '1m' }
};

// Apply per-tenant rate limiting
@Throttle({ default: { limit: 100, ttl: 60000 } })
@Controller('api')
export class ApiController {}
```

### 4. Input Sanitization

```typescript
// Sanitize all text inputs
function sanitizeInput(input: string): string {
  return input
    .replace(/<[^>]*>/g, '')           // Strip HTML tags
    .replace(/javascript:/gi, '')       // Remove JS protocol
    .replace(/on\w+=/gi, '')            // Remove event handlers
    .trim()
    .slice(0, MAX_INPUT_LENGTH);
}

// Evidence sanitization (from Extension)
function sanitizeEvidence(evidence: RawEvidence): Evidence {
  return {
    ...evidence,
    snippet: sanitizeInput(evidence.snippet).slice(0, 10000),
    rawData: evidence.rawData ? JSON.parse(
      JSON.stringify(evidence.rawData).slice(0, 50000)
    ) : null
  };
}
```

### 5. Evidence PII Redaction

```typescript
// PII patterns to redact
const PII_PATTERNS = [
  { pattern: /\b\d{10}\b/g, replacement: '[PHONE]' },           // Saudi phone
  { pattern: /\b05\d{8}\b/g, replacement: '[MOBILE]' },         // Saudi mobile
  { pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, replacement: '[EMAIL]' },
  { pattern: /\b\d{10,12}\b/g, replacement: '[ID]' },           // National ID
  { pattern: /\b(?:SA)?\d{2}[A-Z0-9]{22}\b/gi, replacement: '[IBAN]' }
];

function redactPII(text: string, options: { keepPartial?: boolean } = {}): string {
  let result = text;
  for (const { pattern, replacement } of PII_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}
```

### 6. Audit Coverage

| Action | Audit Event | Data Logged |
|--------|-------------|-------------|
| Login | `AUTH_LOGIN` | userId, ip, userAgent |
| Logout | `AUTH_LOGOUT` | userId, sessionId |
| Signup | `AUTH_SIGNUP` | userId, tenantId |
| Switch Tenant | `AUTH_TENANT_SWITCH` | userId, fromTenant, toTenant |
| Create Lead | `LEAD_CREATED` | leadId, createdBy |
| Update Lead | `LEAD_UPDATED` | leadId, changes |
| Delete Lead | `LEAD_DELETED` | leadId, deletedBy |
| Send WhatsApp | `WHATSAPP_SENT` | messageId, leadId, phone |
| Job Created | `JOB_CREATED` | jobId, type, createdBy |
| Job Completed | `JOB_COMPLETED` | jobId, status, duration |
| Invite Sent | `INVITE_SENT` | inviteId, email, role |
| Invite Accepted | `INVITE_ACCEPTED` | inviteId, userId |
| Role Changed | `ROLE_CHANGED` | userId, oldRole, newRole |
| API Key Created | `API_KEY_CREATED` | keyId, createdBy |
| Subscription Changed | `SUBSCRIPTION_CHANGED` | oldPlan, newPlan |

### 7. Secrets Management

```
❌ Never in git:
- .env files with real secrets
- API keys
- Database passwords
- JWT secrets
- Stripe keys

✅ Use:
- Environment variables
- Secret managers (AWS Secrets Manager, Vault)
- .env.example with placeholders only
```

### 8. Security Checklist (DoD)

```
Backend Security DoD:
├── [ ] All endpoints require authentication (except /auth/*)
├── [ ] RBAC enforced on all protected routes
├── [ ] Tenant isolation verified (no cross-tenant data access)
├── [ ] Rate limiting active
├── [ ] Input sanitization on all user inputs
├── [ ] SQL injection prevention (parameterized queries)
├── [ ] XSS prevention (output encoding)
├── [ ] CORS properly configured
├── [ ] Audit logging complete
├── [ ] Secrets not in code/git
├── [ ] HTTPS enforced
└── [ ] Security headers set (HSTS, CSP, etc.)

Extension Security DoD:
├── [ ] No <all_urls> permission
├── [ ] Explicit domain allowlist
├── [ ] User tabs never touched
├── [ ] Evidence sanitized before upload
├── [ ] PII redacted
├── [ ] No cookies/localStorage access
├── [ ] CSP compliant
└── [ ] Chrome Web Store review passed
```

---

> **الوثيقة التالية:** [03-SCREENS-ANALYSIS.md](./03-SCREENS-ANALYSIS.md) - تحليل تفصيلي للشاشات
