# 01_DATA_MODEL_CURRENT.md - نموذج البيانات الحالي

> **Generated**: 2026-01-12  
> **Source**: `api/prisma/schema.prisma`  
> **Purpose**: Phase 0 - فهم المشروع من الكود

---

## 1. ERD Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Tenant    │────<│ Membership  │>────│    User     │
└──────┬──────┘     └─────────────┘     └──────┬──────┘
       │                                        │
       ├──────────────────┬────────────────────┤
       │                  │                    │
       ▼                  ▼                    ▼
┌─────────────┐    ┌─────────────┐     ┌─────────────┐
│    Job      │    │    Lead     │     │   Report    │
└──────┬──────┘    └──────┬──────┘     └─────────────┘
       │                  │
       ▼                  ▼
┌─────────────┐    ┌─────────────┐
│  Evidence   │    │  LeadList   │>────┐
│  JobLog     │    └─────────────┘     │
└─────────────┘                        ▼
                                ┌─────────────┐
                                │    List     │
                                └─────────────┘
```

---

## 2. Core Tables

### Tenant (المستأجر/الشركة)
**Path**: `api/prisma/schema.prisma:17-41`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | String | Company name |
| slug | String | Unique URL slug |
| planId | String? | Subscription plan |
| status | TenantStatus | ACTIVE, SUSPENDED, PENDING_VERIFICATION |

**Relations**: memberships, users, jobs, leads, lists, reports, subscription, auditLogs

---

### User (المستخدم)
**Path**: `api/prisma/schema.prisma:43-69`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| email | String | Unique email |
| passwordHash | String | Bcrypt hash |
| name | String | Display name |
| isSuperAdmin | Boolean | Platform admin |
| isActive | Boolean | Account status |
| defaultTenantId | String? | Default tenant |

**Relations**: memberships, jobs, leads, lists, reports, extensionSettings

---

### Membership (العضوية)
**Path**: `api/prisma/schema.prisma:71-83`

| Column | Type | Description |
|--------|------|-------------|
| userId | UUID | FK to User |
| tenantId | UUID | FK to Tenant |
| role | Role | OWNER, ADMIN, MANAGER, SALES |

**Purpose**: Many-to-many between User and Tenant with role

---

## 3. Search/Jobs Tables (سيتم تعطيلها)

### Job (المهمة)
**Path**: `api/prisma/schema.prisma:104-130`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenantId | UUID | FK to Tenant |
| type | String | Job type (SEARCH_SINGLE, SEARCH_BULK, etc.) |
| status | JobStatus | PENDING, RUNNING, COMPLETED, FAILED, CANCELLED |
| progress | Int | 0-100 |
| input | Json | Job parameters |
| output | Json | Job results |
| assignedAgentId | String? | Extension agent ID |

**Relations**: evidence, jobLogs, leads

---

### Evidence (الأدلة)
**Path**: `api/prisma/schema.prisma:145-163`

| Column | Type | Description |
|--------|------|-------------|
| jobId | UUID | FK to Job |
| type | String | Evidence type |
| title | String | Title |
| snippet | String | Content snippet |
| confidence | String | Confidence level |
| hash | String | Dedup hash |

---

### SearchHistory (تاريخ البحث)
**Path**: `api/prisma/schema.prisma:590-631`

| Column | Type | Description |
|--------|------|-------------|
| query | String | Search query |
| city | String? | City filter |
| searchType | SearchType | SINGLE, BULK |
| resultsCount | Int | Results found |
| savedCount | Int | Leads saved |
| results | Json | Full results |

---

## 4. Leads Tables

### Lead (العميل المحتمل)
**Path**: `api/prisma/schema.prisma:218-246`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenantId | UUID | FK to Tenant |
| companyName | String | Company name |
| industry | String? | Industry |
| city | String? | City |
| phone | String? | Phone |
| email | String? | Email |
| website | String? | Website |
| status | LeadStatus | NEW, CONTACTED, QUALIFIED, PROPOSAL, NEGOTIATION, WON, LOST |
| source | String? | Lead source |
| jobId | String? | FK to Job (if from search) |

---

### List (القائمة)
**Path**: `api/prisma/schema.prisma:248-264`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenantId | UUID | FK to Tenant |
| name | String | List name |
| description | String? | Description |
| color | String? | UI color |

---

## 5. Reports & AI Tables

### Report (التقرير)
**Path**: `api/prisma/schema.prisma:295-339`

| Column | Type | Description |
|--------|------|-------------|
| type | ReportType | LEAD_ANALYSIS, COMPANY_PROFILE, AI_EBI_SURVEY, etc. |
| status | ReportStatus | PENDING, GENERATING, COMPLETED, FAILED |
| content | Json | Report content |
| aiProvider | String? | OPENAI, GEMINI |
| aiModel | String? | Model used |

---

### AISettings (إعدادات الذكاء الاصطناعي)
**Path**: `api/prisma/schema.prisma:509-540`

| Column | Type | Description |
|--------|------|-------------|
| provider | AIProvider | OPENAI, GEMINI, ANTHROPIC |
| modelName | String | Model name |
| apiKey | String? | Encrypted API key |
| systemPrompt | Text | System prompt |

---

## 6. Subscription Tables

### Plan (الخطة)
**Path**: `api/prisma/schema.prisma:343-371`

| Column | Type | Description |
|--------|------|-------------|
| name | String | Plan name |
| price | Decimal | Monthly price |
| seatsLimit | Int | Max users |
| leadsLimit | Int | Max leads |
| searchesLimit | Int | Max searches |

---

### Subscription (الاشتراك)
**Path**: `api/prisma/schema.prisma:386-405`

| Column | Type | Description |
|--------|------|-------------|
| tenantId | UUID | FK to Tenant (unique) |
| planId | UUID | FK to Plan |
| status | SubscriptionStatus | ACTIVE, PAST_DUE, CANCELLED, TRIALING, EXPIRED |

---

## 7. Platform Settings

### PlatformSettings (إعدادات المنصة)
**Path**: `api/prisma/schema.prisma:432-460`

| Column | Type | Description |
|--------|------|-------------|
| id | String | "default" (singleton) |
| platformUrl | String | Web app URL |
| apiUrl | String | API URL |
| searchMethod | SearchMethod | GOOGLE_MAPS_REAL, GOOGLE_MAPS_API |
| extensionAutoLogin | Boolean | Auto-login extension |

---

## 8. Enums

| Enum | Values | Path |
|------|--------|------|
| TenantStatus | ACTIVE, SUSPENDED, PENDING_VERIFICATION | :11-15 |
| Role | OWNER, ADMIN, MANAGER, SALES | :186-191 |
| JobStatus | PENDING, RUNNING, COMPLETED, FAILED, CANCELLED | :200-206 |
| LeadStatus | NEW, CONTACTED, QUALIFIED, PROPOSAL, NEGOTIATION, WON, LOST | :208-216 |
| ReportType | LEAD_ANALYSIS, COMPANY_PROFILE, MARKET_RESEARCH, COMPETITOR_ANALYSIS, AI_EBI_SURVEY | :287-293 |
| SearchMethod | GOOGLE_MAPS_REAL, GOOGLE_MAPS_API | :462-465 |
| AIProvider | OPENAI, GEMINI, ANTHROPIC, CUSTOM | :502-507 |

---

## 9. Tables Related to Search (للتعطيل)

| Table | Purpose | Action |
|-------|---------|--------|
| Job | Search jobs | Keep, add feature flag |
| Evidence | Search evidence | Keep, no new data |
| JobLog | Search logs | Keep, no new data |
| SearchHistory | Search history | Keep, no new data |
