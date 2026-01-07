# 🗺️ Extension API Mapping - Analysis Pack v2

> **الإصدار:** 2.0.0  
> **تاريخ الإنشاء:** يناير 2026  
> **الحالة:** تصميم نهائي - جاهز للتنفيذ

---

## 📋 ملخص تنفيذي

هذا المستند يُعرّف جدول Mapping مفصل لكل عنصر UI في الـ Extension Side Panel مع الـ API endpoints والصلاحيات والـ Jobs والـ Audit events.

---

## 🎯 Side Panel Structure

```
┌────────────────────────────────────────┐
│ ⚡ ليدززز EXTENSION     [⚙️] [🔄]      │  ← Header
├────────────────────────────────────────┤
│ 🔗 [Entity Type Badge]                 │  ← Context Detection
│ [Entity Name / Title]                  │
├────────────────────────────────────────┤
│      [Avatar/Logo]                     │
│  [Entity Name]                         │  ← Entity Card
│  [Subtitle • Industry]                 │
│                                        │
│ [💾 Save to CRM] [💬 WhatsApp]         │  ← Primary Actions
├────────────────────────────────────────┤
│ [Overview│Contacts│Evidence│Activity]  │  ← Tab Navigation
├────────────────────────────────────────┤
│                                        │
│   [Tab Content Area]                   │  ← Dynamic Content
│                                        │
├────────────────────────────────────────┤
│ [⚙️ Settings] [📊 Dashboard]           │  ← Footer Actions
└────────────────────────────────────────┘
```

---

## 📊 Complete UI → API Mapping

### Header Actions

| UI Element | Action | Endpoint | Method | Permission | JobType | AuditEvent | Success State | Error State |
|------------|--------|----------|--------|------------|---------|------------|---------------|-------------|
| Settings Icon (⚙️) | Open settings | - | - | - | - | - | Navigate to settings view | - |
| Refresh Icon (🔄) | Refresh current context | `GET /agent/config` | GET | Auth | - | - | Config updated | Toast: "فشل التحديث" |
| Tenant Switcher | Switch tenant | `POST /auth/switch-tenant` | POST | Auth | - | `AUTH_TENANT_SWITCH` | New token, reload | Toast: "فشل التبديل" |

---

### Context Detection (Resolve)

| UI Element | Action | Endpoint | Method | Permission | JobType | AuditEvent | Success State | Error State |
|------------|--------|----------|--------|------------|---------|------------|---------------|-------------|
| Auto-detect on page load | Resolve current page entity | `POST /extension/resolve` | POST | Auth | - | - | Show entity card | "لم يتم التعرف على الصفحة" |
| Entity Type Badge | Display only | - | - | - | - | - | Show badge (LinkedIn/Website/Maps) | - |
| Entity Name | Display only | - | - | - | - | - | Show resolved name | "غير معروف" |

**Resolve Request/Response:**

```typescript
// POST /extension/resolve
// Request
{
  "url": "https://www.linkedin.com/company/example",
  "pageTitle": "Example Company | LinkedIn",
  "pageContent": "..." // Sanitized text snippet
}

// Response
{
  "success": true,
  "data": {
    "entityType": "LINKEDIN_COMPANY" | "LINKEDIN_PROFILE" | "GOOGLE_MAPS" | "WEBSITE",
    "resolved": {
      "name": "Example Company",
      "industry": "Technology",
      "location": "Riyadh, Saudi Arabia",
      "website": "https://example.com",
      "linkedinUrl": "https://linkedin.com/company/example"
    },
    "existingLead": {  // If already in CRM
      "id": "uuid",
      "status": "PROSPECTED"
    } | null
  }
}
```

---

### Primary Actions (Entity Card)

| UI Element | Action | Endpoint | Method | Permission | JobType | AuditEvent | Success State | Error State |
|------------|--------|----------|--------|------------|---------|------------|---------------|-------------|
| **Save to CRM** | Create new lead | `POST /leads` | POST | `leads:create` | - | `LEAD_CREATED` | Toast: "تم الحفظ" + show lead ID | Toast: "فشل الحفظ" |
| **Save to CRM** (existing) | View existing | - | - | `leads:read` | - | - | Navigate to lead detail | - |
| **WhatsApp** | Open WhatsApp modal | - | - | `whatsapp:send` | - | - | Show modal | Feature disabled toast |
| **Add to List** | Add lead to list | `POST /lists/:id/leads` | POST | `lists:update` | - | `LEAD_LIST_ADD` | Toast: "تمت الإضافة" | Toast: "فشلت الإضافة" |
| **Tag** | Add tag to lead | `PATCH /leads/:id` | PATCH | `leads:update` | - | `LEAD_UPDATED` | Tag added | Toast: "فشل التحديث" |

**Save to CRM Request:**

```typescript
// POST /leads
{
  "companyName": "Example Company",
  "industry": "Technology",
  "city": "Riyadh",
  "website": "https://example.com",
  "source": "EXTENSION",
  "sourceUrl": "https://linkedin.com/company/example",
  "enrichmentData": {
    "linkedinUrl": "...",
    "resolvedAt": "2026-01-07T00:00:00Z"
  }
}
```

---

### Tab: Overview

| UI Element | Action | Endpoint | Method | Permission | JobType | AuditEvent | Success State | Error State |
|------------|--------|----------|--------|------------|---------|------------|---------------|-------------|
| AI Insight Card | Display AI summary | `GET /leads/:id/report` | GET | `leads:read` | - | - | Show summary | "لا يوجد تقرير" |
| **Deep Survey** button | Start survey job | `POST /leads/:id/survey` | POST | `leads:update` | `SURVEY` | `LEAD_SURVEYED` | Progress indicator | Toast: "فشل البدء" |
| Context Details | Display resolved data | - | - | - | - | - | Show details | - |
| **Generate Report** | Generate AI report | `POST /leads/:id/report/generate` | POST | `leads:update` | `REPORT` | `REPORT_GENERATED` | Progress → Report | Toast: "فشل التوليد" |

**Survey Job Flow:**

```typescript
// POST /leads/:id/survey
// Response
{
  "success": true,
  "data": {
    "jobId": "uuid",
    "status": "PENDING"
  }
}

// WebSocket updates
{ "type": "PROGRESS", "payload": { "jobId": "...", "progress": 25, "message": "جاري فحص الموقع..." } }
{ "type": "PROGRESS", "payload": { "jobId": "...", "progress": 50, "message": "جاري جمع الأدلة..." } }
{ "type": "PROGRESS", "payload": { "jobId": "...", "progress": 75, "message": "جاري التحليل..." } }
{ "type": "JOB_COMPLETE", "payload": { "jobId": "...", "status": "SUCCESS" } }
```

---

### Tab: Contacts (Reveal)

| UI Element | Action | Endpoint | Method | Permission | JobType | AuditEvent | Success State | Error State |
|------------|--------|----------|--------|------------|---------|------------|---------------|-------------|
| **Reveal Data** button | Reveal contact info | `POST /extension/reveal` | POST | `leads:update` + Feature Flag | `REVEAL` | `LEAD_REVEALED` | Show phone/email | Toast: "فشل الكشف" |
| Phone display | Copy to clipboard | - | - | - | - | - | Toast: "تم النسخ" | - |
| Email display | Copy to clipboard | - | - | - | - | - | Toast: "تم النسخ" | - |
| **Call** button | Open phone dialer | - | - | - | - | `LEAD_CALLED` | Open tel: link | - |
| **Email** button | Open email client | - | - | - | - | `LEAD_EMAILED` | Open mailto: link | - |

**Reveal Request:**

```typescript
// POST /extension/reveal
{
  "leadId": "uuid",
  "sourceUrl": "https://linkedin.com/in/example",
  "entityType": "LINKEDIN_PROFILE"
}

// Response
{
  "success": true,
  "data": {
    "phone": "+966501234567",
    "email": "contact@example.com",
    "confidence": "HIGH",
    "source": "website_crawl"
  }
}
```

**Feature Flag Check:**

```typescript
// Reveal button only shown if:
// 1. feature_reveal === true
// 2. User has leads:update permission
// 3. Lead is saved in CRM (has leadId)
```

---

### Tab: Evidence

| UI Element | Action | Endpoint | Method | Permission | JobType | AuditEvent | Success State | Error State |
|------------|--------|----------|--------|------------|---------|------------|---------------|-------------|
| Evidence list | Display evidence | `GET /leads/:id/evidence` | GET | `leads:read` | - | - | Show list | "لا توجد أدلة" |
| **Refresh Evidence** | Re-run survey | `POST /leads/:id/survey` | POST | `leads:update` | `SURVEY` | `LEAD_SURVEYED` | Progress indicator | Toast: "فشل التحديث" |
| Evidence item | Expand details | - | - | - | - | - | Show full snippet | - |
| Source link | Open source URL | - | - | - | - | - | Open in new tab | - |
| Confidence badge | Display only | - | - | - | - | - | HIGH/MEDIUM/LOW | - |

**Evidence Response:**

```typescript
// GET /leads/:id/evidence
{
  "success": true,
  "data": {
    "evidence": [
      {
        "id": "uuid",
        "type": "WEBSITE",
        "title": "صفحة من نحن",
        "source": "example.com",
        "url": "https://example.com/about",
        "snippet": "شركة متخصصة في...",
        "confidence": "HIGH",
        "createdAt": "2026-01-07T00:00:00Z"
      }
    ]
  }
}
```

---

### Tab: Activity

| UI Element | Action | Endpoint | Method | Permission | JobType | AuditEvent | Success State | Error State |
|------------|--------|----------|--------|------------|---------|------------|---------------|-------------|
| Activity timeline | Display activities | `GET /leads/:id/activities` | GET | `leads:read` | - | - | Show timeline | "لا يوجد نشاط" |
| **Add Note** button | Add manual note | `POST /leads/:id/activities` | POST | `leads:update` | - | `ACTIVITY_CREATED` | Note added | Toast: "فشلت الإضافة" |
| Activity item | Display only | - | - | - | - | - | Show activity | - |

**Add Note Request:**

```typescript
// POST /leads/:id/activities
{
  "type": "NOTE",
  "description": "ملاحظة من المستخدم..."
}
```

---

### WhatsApp Modal

| UI Element | Action | Endpoint | Method | Permission | JobType | AuditEvent | Success State | Error State |
|------------|--------|----------|--------|------------|---------|------------|---------------|-------------|
| Template selector | Load templates | `GET /whatsapp/templates` | GET | `whatsapp:templates` | - | - | Show templates | "لا توجد قوالب" |
| Template apply | Fill message | - | - | - | - | - | Message filled | - |
| **AI Write** button | Generate message | `POST /ai/generate-message` | POST | Auth | - | - | Message generated | Toast: "فشل التوليد" |
| Message textarea | Edit message | - | - | - | - | - | - | - |
| **Send** button | Send WhatsApp | `POST /whatsapp/send` | POST | `whatsapp:send` | `WHATSAPP` | `WHATSAPP_MESSAGE_SENT` | Toast: "تم الإرسال" | Toast: "فشل الإرسال" |

**Send WhatsApp Request:**

```typescript
// POST /whatsapp/send
// Headers: X-Idempotency-Key: uuid
{
  "leadId": "uuid",
  "phone": "+966501234567",
  "message": "مرحباً...",
  "templateId": "uuid" // optional
}

// Response
{
  "success": true,
  "data": {
    "jobId": "uuid",
    "messageId": "uuid",
    "status": "PENDING"
  }
}
```

---

### Footer Actions

| UI Element | Action | Endpoint | Method | Permission | JobType | AuditEvent | Success State | Error State |
|------------|--------|----------|--------|------------|---------|------------|---------------|-------------|
| **Settings** | Open settings view | - | - | - | - | - | Show settings | - |
| **Dashboard** | Open web dashboard | - | - | - | - | - | Open in new tab | - |
| **Logout** | Logout | `POST /auth/logout` | POST | Auth | - | `AUTH_LOGOUT` | Clear state, show login | - |

---

### Settings View

| UI Element | Action | Endpoint | Method | Permission | JobType | AuditEvent | Success State | Error State |
|------------|--------|----------|--------|------------|---------|------------|---------------|-------------|
| Tenant selector | Switch tenant | `POST /auth/switch-tenant` | POST | Auth | - | `AUTH_TENANT_SWITCH` | Reload extension | Toast: "فشل التبديل" |
| Language toggle | Change language | - | - | - | - | - | UI language changed | - |
| Notification toggle | Toggle notifications | - | - | - | - | - | Setting saved | - |
| **Clear Cache** | Clear local data | - | - | - | - | - | Toast: "تم المسح" | - |
| Version info | Display only | - | - | - | - | - | Show version | - |

---

### Login View

| UI Element | Action | Endpoint | Method | Permission | JobType | AuditEvent | Success State | Error State |
|------------|--------|----------|--------|------------|---------|------------|---------------|-------------|
| Email input | Input | - | - | - | - | - | - | - |
| Password input | Input | - | - | - | - | - | - | - |
| **Login** button | Login | `POST /auth/login` | POST | Public | - | `AUTH_LOGIN` | Navigate to main | Toast: "فشل الدخول" |
| **Forgot Password** | Open web page | - | - | - | - | - | Open in new tab | - |

---

## 📊 Summary Tables

### Endpoints Used by Extension

| Endpoint | Method | Used For |
|----------|--------|----------|
| `POST /auth/login` | POST | Login |
| `POST /auth/logout` | POST | Logout |
| `POST /auth/switch-tenant` | POST | Tenant switch |
| `POST /auth/refresh` | POST | Token refresh |
| `GET /agent/config` | GET | Get config + flags |
| `POST /agent/heartbeat` | POST | Connection keepalive |
| `POST /extension/resolve` | POST | Resolve page entity |
| `POST /extension/reveal` | POST | Reveal contact data |
| `POST /extension/save` | POST | Quick save to CRM |
| `GET /leads/:id` | GET | Get lead details |
| `POST /leads` | POST | Create lead |
| `PATCH /leads/:id` | PATCH | Update lead |
| `GET /leads/:id/evidence` | GET | Get evidence |
| `GET /leads/:id/activities` | GET | Get activities |
| `POST /leads/:id/activities` | POST | Add activity |
| `POST /leads/:id/survey` | POST | Start survey job |
| `GET /leads/:id/report` | GET | Get report |
| `POST /leads/:id/report/generate` | POST | Generate report |
| `POST /lists/:id/leads` | POST | Add to list |
| `GET /whatsapp/templates` | GET | Get templates |
| `POST /whatsapp/send` | POST | Send message |
| `POST /ai/generate-message` | POST | AI write message |

### Job Types Used

| JobType | Trigger | Progress Updates | Timeout |
|---------|---------|------------------|---------|
| `SURVEY` | Deep Survey button | Yes (WebSocket) | 5 min |
| `REVEAL` | Reveal Data button | Yes (WebSocket) | 30 sec |
| `REPORT` | Generate Report button | Yes (WebSocket) | 2 min |
| `WHATSAPP` | Send WhatsApp button | Yes (WebSocket) | 30 sec |

### Audit Events

| Event | Trigger | Data Logged |
|-------|---------|-------------|
| `AUTH_LOGIN` | Login | userId, ip, userAgent |
| `AUTH_LOGOUT` | Logout | userId |
| `AUTH_TENANT_SWITCH` | Tenant switch | userId, fromTenant, toTenant |
| `LEAD_CREATED` | Save to CRM | leadId, source: EXTENSION |
| `LEAD_UPDATED` | Tag/Update | leadId, changes |
| `LEAD_SURVEYED` | Survey complete | leadId, evidenceCount |
| `LEAD_REVEALED` | Reveal complete | leadId, dataRevealed |
| `LEAD_LIST_ADD` | Add to list | leadId, listId |
| `LEAD_CALLED` | Call button | leadId, phone |
| `LEAD_EMAILED` | Email button | leadId, email |
| `WHATSAPP_MESSAGE_SENT` | WhatsApp send | leadId, messageId |
| `REPORT_GENERATED` | Report complete | leadId, reportId |
| `ACTIVITY_CREATED` | Add note | leadId, activityType |

### Permission Matrix for Extension

| Action | OWNER | ADMIN | MANAGER | SALES |
|--------|-------|-------|---------|-------|
| Resolve | ✓ | ✓ | ✓ | ✓ |
| Save to CRM | ✓ | ✓ | ✓ | ✓ |
| Survey | ✓ | ✓ | ✓ | ✓ |
| Reveal | ✓ | ✓ | ✓ | ✓* |
| WhatsApp Send | ✓ | ✓ | ✓ | ✓ |
| Add to List | ✓ | ✓ | ✓ | ✓ |
| Generate Report | ✓ | ✓ | ✓ | ✓ |
| Add Note | ✓ | ✓ | ✓ | ✓ |
| View Evidence | ✓ | ✓ | ✓ | ✓ |
| View Activities | ✓ | ✓ | ✓ | ✓ |

*SALES can only access own leads

### Feature Flags Impact

| Feature Flag | UI Elements Affected |
|--------------|---------------------|
| `feature_reveal` | Reveal Data button |
| `feature_whatsapp` | WhatsApp button, WhatsApp modal |
| `feature_ai_report` | Generate Report button, AI Write button |
| `connector_google_maps` | Survey (Maps connector) |
| `connector_website_crawl` | Survey (Website connector) |
| `connector_social_public` | Survey (LinkedIn connector) |

---

## 🔄 State Transitions

### Lead State in Extension

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    LEAD STATE IN EXTENSION                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐                                                       │
│  │   UNKNOWN    │  ← Page not resolved                                  │
│  └──────┬───────┘                                                       │
│         │ resolve                                                        │
│         ▼                                                                │
│  ┌──────────────┐                                                       │
│  │   RESOLVED   │  ← Entity detected, not in CRM                        │
│  └──────┬───────┘                                                       │
│         │ save                                                           │
│         ▼                                                                │
│  ┌──────────────┐                                                       │
│  │    SAVED     │  ← Lead created in CRM                                │
│  └──────┬───────┘                                                       │
│         │ survey                                                         │
│         ▼                                                                │
│  ┌──────────────┐                                                       │
│  │  SURVEYING   │  ← Survey job running                                 │
│  └──────┬───────┘                                                       │
│         │ complete                                                       │
│         ▼                                                                │
│  ┌──────────────┐                                                       │
│  │  PROSPECTED  │  ← Evidence collected                                 │
│  └──────────────┘                                                       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### UI State Based on Lead State

| Lead State | Save Button | Survey Button | Reveal Button | WhatsApp Button |
|------------|-------------|---------------|---------------|-----------------|
| UNKNOWN | Disabled | Disabled | Disabled | Disabled |
| RESOLVED | "Save to CRM" | Disabled | Disabled | Disabled |
| SAVED | "View in CRM" | "Deep Survey" | "Reveal" | Enabled |
| SURVEYING | "View in CRM" | "Surveying..." (disabled) | Disabled | Enabled |
| PROSPECTED | "View in CRM" | "Re-survey" | "Reveal" | Enabled |

---

## ❓ Open Questions

| # | Question | Verification Method |
|---|----------|---------------------|
| 1 | هل نعرض Activities من الويب أم فقط من الـ Extension؟ | Product decision |
| 2 | هل نسمح بـ Bulk actions في الـ Extension؟ | UX review |
| 3 | ما الحد الأقصى لعدد Evidence المعروضة؟ | Performance testing |
| 4 | هل نحتاج Export في الـ Extension؟ | Product decision |
| 5 | كيف نتعامل مع Offline mode؟ | Technical design |

---

> **الوثيقة السابقة:** [12-UI_VENDORIZING_PLAN.md](./12-UI_VENDORIZING_PLAN.md)  
> **الوثيقة التالية:** [01-SYSTEM-OVERVIEW.md](./01-SYSTEM-OVERVIEW.md) (محدّث)
