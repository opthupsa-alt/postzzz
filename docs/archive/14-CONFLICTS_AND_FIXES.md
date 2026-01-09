# 🔧 تقرير التضاربات والإصلاحات - Analysis Pack v2.1

> **الإصدار:** 2.1.0  
> **تاريخ الإنشاء:** يناير 2026  
> **الغرض:** تدقيق شامل لجميع التضاربات بين الملفات مع الإصلاحات المطلوبة

---

## 📋 ملخص تنفيذي

تم اكتشاف **24 تضارباً/نقصاً** في الوثائق الحالية بعد مراجعة شاملة. هذا التقرير يوثق كل منها مع:
- الملف والقسم المتأثر
- اقتباس قصير من المشكلة
- سبب التضارب
- التعديل المطلوب بالتحديد

---

## 🚨 جدول التضاربات

| ID | الفئة | الوصف | الخطورة | الحالة |
|----|-------|-------|---------|--------|
| CF-01 | Runner | NEEDS_USER_ACTION=LOGIN vs social_public.noLogin=true | 🔴 عالية | يحتاج إصلاح |
| CF-02 | Runner | غياب Execution Window المنفصل | 🔴 عالية | يحتاج إصلاح |
| CF-03 | Data Model | تكرار ملفات Data Model (v1 و v2) | 🟠 متوسطة | يحتاج توحيد |
| CF-04 | API | غياب POST /auth/signup في API Requirements | 🔴 عالية | يحتاج إضافة |
| CF-05 | Screens | غياب شاشات SaaS (Signup/Onboarding/Billing) | 🔴 عالية | يحتاج إضافة |
| CF-06 | User Flows | غياب تدفقات SaaS (Signup/Switch Tenant) | 🔴 عالية | يحتاج إضافة |
| CF-07 | Runner | غياب MV3 Lifecycle/Reconnect strategy | 🟠 متوسطة | يحتاج إضافة |
| CF-08 | Runner | غياب Offline Queue specs | 🟠 متوسطة | يحتاج إضافة |
| CF-09 | Evidence | غياب PII Redaction rules | 🟠 متوسطة | يحتاج إضافة |
| CF-10 | UI Vendoring | غياب CI check للتزامن | 🟡 منخفضة | يحتاج إضافة |
| CF-11 | OpenAPI | نقص endpoints SaaS (signup/tenants/invites) | 🔴 عالية | يحتاج إضافة |
| CF-12 | Roadmap | تكرار ملفات Roadmap (v1 و v2) | 🟠 متوسطة | يحتاج توحيد |
| CF-13 | RBAC | غياب ملف مستقل لـ Permission Matrix | 🟠 متوسطة | يحتاج إنشاء |
| CF-14 | Quotas | غياب ملف Subscription/Quotas/Flags | 🟠 متوسطة | يحتاج إنشاء |
| CF-15 | Runner | استخدام <all_urls> ضمني | 🔴 عالية | يحتاج تصحيح |
| CF-16 | API | غياب X-Tenant-ID header في بعض endpoints | 🟠 متوسطة | يحتاج توحيد |
| CF-17 | Evidence | غياب hash/timestamp في Evidence schema | 🟡 منخفضة | يحتاج إضافة |
| CF-18 | Glossary | مصطلحات قديمة (2 roles فقط) | 🟠 متوسطة | يحتاج تحديث |
| CF-19 | Screens | شاشة Company بدون Entity في Data Model | 🟡 منخفضة | موثق سابقاً |
| CF-20 | Runner | غياب size limits للـ Evidence | 🟠 متوسطة | يحتاج إضافة |
| CF-21 | API Mapping | نقص في Audit Events للـ Extension | 🟡 منخفضة | يحتاج مراجعة |
| CF-22 | DoD | غياب Definition of Done للـ Sprints | 🟠 متوسطة | يحتاج إضافة |
| CF-23 | Runner | غياب IndexedDB specs للـ Offline | 🟡 منخفضة | يحتاج إضافة |
| CF-24 | Security | غياب Extension-specific threats | 🟠 متوسطة | يحتاج إضافة |

---

## 📝 التفاصيل والإصلاحات

---

### CF-01: NEEDS_USER_ACTION=LOGIN vs social_public.noLogin=true 🔴

**الملف المتأثر:**
- `11-EXTENSION_RUNNER_SPEC.md` (سطر 267): `actionType: 'CAPTCHA' | 'LOGIN' | 'VERIFICATION' | 'BLOCKED'`
- `11-EXTENSION_RUNNER_SPEC.md` (سطر 607): `noLogin: true; // Never use user's session`

**الاقتباس:**
```typescript
// Line 267
actionType: 'CAPTCHA' | 'LOGIN' | 'VERIFICATION' | 'BLOCKED';

// Line 607
constraints: {
  publicOnly: true;  // Never access private data
  noLogin: true;     // Never use user's session
};
```

**لماذا تضارب:**
- الـ `NeedsUserActionMessage` يسمح بـ `LOGIN` كـ actionType
- لكن `social_public` connector يحدد `noLogin: true`
- هذا يعني أن الـ Runner قد يطلب LOGIN لمصدر ممنوع فيه LOGIN

**التعديل المطلوب:**
```typescript
// في 11-EXTENSION_RUNNER_SPEC.md

// 1. تعديل NeedsUserActionMessage
interface NeedsUserActionMessage {
  type: 'NEEDS_USER_ACTION';
  payload: {
    jobId: string;
    stepId: number;
    // LOGIN مسموح فقط للـ connectors التي تسمح به
    actionType: 'CAPTCHA' | 'CONSENT' | 'VERIFICATION' | 'BLOCKED';
    message: string;
    tabId?: number;
  };
}

// 2. إضافة failure code جديد
failureModes: [
  'LOGIN_REQUIRED_UNSUPPORTED',  // جديد: المصدر يتطلب login لكنه ممنوع
  // ...
];

// 3. إضافة قاعدة واضحة
/**
 * LOGIN Handling Rules:
 * - إذا كان Connector.constraints.noLogin = true:
 *   - لا ترسل NEEDS_USER_ACTION مع actionType=LOGIN
 *   - أرسل JOB_COMPLETE مع status=FAILED و error.code=LOGIN_REQUIRED_UNSUPPORTED
 *   - اكتب Evidence بـ "غير متاح - يتطلب تسجيل دخول"
 * - إذا كان Connector.constraints.noLogin = false أو غير محدد:
 *   - يمكن إرسال NEEDS_USER_ACTION مع actionType=LOGIN
 */
```

**الأثر:**
- تعديل `11-EXTENSION_RUNNER_SPEC.md`
- تعديل `13-EXTENSION_API_MAPPING.md` لإضافة error state

---

### CF-02: غياب Execution Window المنفصل 🔴

**الملف المتأثر:**
- `11-EXTENSION_RUNNER_SPEC.md` (سطر 101): يذكر "Opens dedicated tab" لكن لا يوضح Execution Window

**الاقتباس:**
```
│     ├──► Opens dedicated tab (NOT user's tabs)
```

**لماذا تضارب:**
- المتطلب يقول: "التنفيذ في Execution Window منفصل (minimized غالبًا)"
- لكن الوثيقة تذكر "dedicated tab" فقط بدون تفاصيل Window

**التعديل المطلوب:**
```typescript
// إضافة قسم جديد في 11-EXTENSION_RUNNER_SPEC.md

## 🪟 Execution Window Architecture

### المفهوم
```
┌─────────────────────────────────────────────────────────────────────────┐
│                    EXECUTION WINDOW ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ USER'S BROWSER (Normal Browsing)                                 │   │
│  │                                                                   │   │
│  │  [Tab 1: Gmail] [Tab 2: LinkedIn] [Tab 3: ...]                  │   │
│  │                                                                   │   │
│  │  ❌ Runner NEVER touches these tabs                              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ EXECUTION WINDOW (Separate, Minimized)                           │   │
│  │                                                                   │   │
│  │  [Job Tab 1] [Job Tab 2] [Job Tab 3]                            │   │
│  │                                                                   │   │
│  │  ✅ All job execution happens here                               │   │
│  │  ✅ User can continue browsing normally                          │   │
│  │  ✅ Window is minimized by default                               │   │
│  │  ✅ User can maximize to see/debug                               │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Implementation
```typescript
interface ExecutionWindowManager {
  windowId: number | null;
  
  async ensureWindow(): Promise<number> {
    if (this.windowId) {
      // Check if window still exists
      try {
        await chrome.windows.get(this.windowId);
        return this.windowId;
      } catch {
        this.windowId = null;
      }
    }
    
    // Create new execution window
    const window = await chrome.windows.create({
      type: 'normal',
      state: 'minimized',  // Start minimized
      focused: false,
      width: 1200,
      height: 800
    });
    
    this.windowId = window.id!;
    return this.windowId;
  }
  
  async createJobTab(url: string): Promise<chrome.tabs.Tab> {
    const windowId = await this.ensureWindow();
    return chrome.tabs.create({
      windowId,
      url,
      active: false  // Don't steal focus
    });
  }
  
  async closeJobTab(tabId: number): Promise<void> {
    await chrome.tabs.remove(tabId);
  }
  
  async cleanup(): Promise<void> {
    if (this.windowId) {
      await chrome.windows.remove(this.windowId);
      this.windowId = null;
    }
  }
}
```
```

**الأثر:**
- تعديل `11-EXTENSION_RUNNER_SPEC.md`

---

### CF-03: تكرار ملفات Data Model (v1 و v2) 🟠

**الملفات المتأثرة:**
- `02-DATA-MODEL.md` (v1 - 583 سطر)
- `02-DATA-MODEL-V2.md` (v2 - 1168 سطر)

**لماذا تضارب:**
- وجود ملفين بنفس الغرض يسبب ارتباك
- v1 لا يحتوي Multi-tenancy
- v2 يحتوي Multi-tenancy لكن قد لا يكون مكتمل

**التعديل المطلوب:**
```
1. دمج المحتوى في ملف واحد: 02-DATA-MODEL.md
2. إضافة قسم "Legacy Schema (v1)" في الأسفل للمرجعية
3. حذف 02-DATA-MODEL-V2.md
4. تحديث README.md للإشارة للملف الموحد
```

**الأثر:**
- تعديل `02-DATA-MODEL.md` (دمج)
- حذف `02-DATA-MODEL-V2.md`
- تعديل `README.md`

---

### CF-04: غياب POST /auth/signup في API Requirements 🔴

**الملف المتأثر:**
- `06-API-REQUIREMENTS.md`: لا يحتوي endpoint للتسجيل

**لماذا تضارب:**
- SaaS يتطلب تدفق Signup لإنشاء Tenant + Owner
- الـ API Requirements يبدأ من Login فقط

**التعديل المطلوب:**
```yaml
# إضافة في 06-API-REQUIREMENTS.md

### POST /api/auth/signup
إنشاء حساب جديد مع Tenant

**Request:**
```json
{
  "email": "owner@company.com",
  "password": "SecurePass123!",
  "name": "أحمد محمد",
  "companyName": "شركة التقنية",
  "companySlug": "tech-company",  // optional, auto-generated if not provided
  "phone": "+966501234567"  // optional
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "owner@company.com",
      "name": "أحمد محمد"
    },
    "tenant": {
      "id": "uuid",
      "name": "شركة التقنية",
      "slug": "tech-company"
    },
    "token": "jwt-token",
    "refreshToken": "refresh-token"
  }
}
```

**Errors:**
- 400: VALIDATION_ERROR (email format, password strength)
- 409: EMAIL_ALREADY_EXISTS
- 409: SLUG_ALREADY_EXISTS

**Audit:** AUTH_SIGNUP
```

**الأثر:**
- تعديل `06-API-REQUIREMENTS.md`
- تعديل `openapi.yaml`

---

### CF-05: غياب شاشات SaaS (Signup/Onboarding/Billing) 🔴

**الملف المتأثر:**
- `03-SCREENS-ANALYSIS.md`: 17 شاشة فقط، لا تشمل SaaS screens

**الاقتباس:**
```markdown
| # | الشاشة | الملف | المسار | الصلاحية |
|---|--------|-------|--------|----------|
| 1 | تسجيل الدخول | `LoginPage.tsx` | `/login` | عام |
...
| 17 | إضافة المتصفح | `ExtensionSidePanel.tsx` | `/extension-preview` | عام |
```

**لماذا تضارب:**
- SaaS يتطلب شاشات إضافية غير موجودة في التحليل

**التعديل المطلوب:**
```markdown
# إضافة في 03-SCREENS-ANALYSIS.md

| 18 | التسجيل | `SignupPage.tsx` | `/signup` | عام |
| 19 | التأهيل | `OnboardingPage.tsx` | `/onboarding` | مسجل جديد |
| 20 | تبديل المنظمة | `SwitchTenantPage.tsx` | `/switch-tenant` | مسجل |
| 21 | الاشتراك | `BillingPage.tsx` | `/app/billing` | OWNER |
| 22 | الحدود والاستخدام | `UsagePage.tsx` | `/app/usage` | ADMIN+ |
| 23 | إعدادات الأمان | `SecuritySettingsPage.tsx` | `/app/settings/security` | مسجل |
```

**الأثر:**
- تعديل `03-SCREENS-ANALYSIS.md`

---

### CF-06: غياب تدفقات SaaS (Signup/Switch Tenant) 🔴

**الملف المتأثر:**
- `04-USER-FLOWS.md`: 8 تدفقات فقط، لا تشمل SaaS flows

**لماذا تضارب:**
- SaaS يتطلب تدفقات إضافية

**التعديل المطلوب:**
```markdown
# إضافة في 04-USER-FLOWS.md

## 9️⃣ تدفق التسجيل (Signup Flow)
## 🔟 تدفق التأهيل (Onboarding Flow)
## 1️⃣1️⃣ تدفق تبديل المنظمة (Switch Tenant Flow)
## 1️⃣2️⃣ تدفق الدعوات (Invite Flow)
## 1️⃣3️⃣ تدفق الاشتراك (Billing Flow)
```

**الأثر:**
- تعديل `04-USER-FLOWS.md`

---

### CF-07: غياب MV3 Lifecycle/Reconnect strategy 🟠

**الملف المتأثر:**
- `11-EXTENSION_RUNNER_SPEC.md`: يذكر WebSocket لكن لا يوضح MV3 service worker lifecycle

**لماذا تضارب:**
- MV3 service workers تنام بعد 30 ثانية من عدم النشاط
- WebSocket connection قد تنقطع
- لا توجد استراتيجية reconnect موثقة

**التعديل المطلوب:**
```typescript
// إضافة قسم في 11-EXTENSION_RUNNER_SPEC.md

## 🔄 MV3 Lifecycle Management

### Service Worker Lifecycle
```
┌─────────────────────────────────────────────────────────────────────────┐
│                    MV3 SERVICE WORKER LIFECYCLE                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────┐     30s idle     ┌──────────┐                            │
│  │  ACTIVE  │─────────────────►│ SLEEPING │                            │
│  └────┬─────┘                  └────┬─────┘                            │
│       │                             │                                   │
│       │ event/alarm                 │ event/alarm                       │
│       │                             │                                   │
│       ▼                             ▼                                   │
│  ┌──────────────────────────────────────────────────────────────┐      │
│  │                    WAKE UP                                    │      │
│  │  1. Restore state from chrome.storage                        │      │
│  │  2. Reconnect WebSocket                                      │      │
│  │  3. Resume pending jobs                                      │      │
│  └──────────────────────────────────────────────────────────────┘      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Keep-Alive Strategy
```typescript
// Use chrome.alarms to prevent sleeping during active jobs
chrome.alarms.create('keepAlive', { periodInMinutes: 0.4 }); // 24 seconds

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'keepAlive') {
    // Check for active jobs
    if (hasActiveJobs()) {
      // Send heartbeat to keep connection alive
      sendHeartbeat();
    } else {
      // No active jobs, allow sleep
      chrome.alarms.clear('keepAlive');
    }
  }
});
```

### WebSocket Reconnect Strategy
```typescript
class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1s, exponential backoff
  
  async connect(): Promise<void> {
    // ... connection logic
  }
  
  private scheduleReconnect(): void {
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts),
      30000 // Max 30 seconds
    );
    
    setTimeout(() => this.connect(), delay);
    this.reconnectAttempts++;
  }
  
  private onClose(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.scheduleReconnect();
    } else {
      // Notify user, pause jobs
      this.notifyConnectionLost();
    }
  }
}
```
```

**الأثر:**
- تعديل `11-EXTENSION_RUNNER_SPEC.md`

---

### CF-08: غياب Offline Queue specs 🟠

**الملف المتأثر:**
- `11-EXTENSION_RUNNER_SPEC.md` (سطر 64): يذكر "Offline Queue" لكن بدون تفاصيل

**الاقتباس:**
```
| **Offline Queue** | تخزين مؤقت عند انقطاع الاتصال |
```

**التعديل المطلوب:**
```typescript
// إضافة قسم في 11-EXTENSION_RUNNER_SPEC.md

## 📴 Offline Queue (IndexedDB)

### Schema
```typescript
interface OfflineQueueItem {
  id: string;
  type: 'EVIDENCE' | 'LOG' | 'PROGRESS' | 'JOB_COMPLETE';
  payload: object;
  createdAt: number;
  retryCount: number;
  maxRetries: number;
}

// IndexedDB Store
const DB_NAME = 'leedz-offline';
const STORE_NAME = 'queue';
const MAX_QUEUE_SIZE = 100;  // Max items
const MAX_ITEM_AGE = 24 * 60 * 60 * 1000;  // 24 hours
```

### Limits
| Limit | Value | Reason |
|-------|-------|--------|
| Max queue size | 100 items | Prevent storage bloat |
| Max item age | 24 hours | Stale data not useful |
| Max item size | 100KB | Prevent large payloads |
| Max retries | 3 | Avoid infinite loops |

### Sync Strategy
```typescript
async function syncOfflineQueue(): Promise<void> {
  const items = await getQueuedItems();
  
  for (const item of items) {
    try {
      await sendToBackend(item);
      await removeFromQueue(item.id);
    } catch (error) {
      if (item.retryCount >= item.maxRetries) {
        await removeFromQueue(item.id);
        console.error('Dropped item after max retries:', item.id);
      } else {
        await incrementRetryCount(item.id);
      }
    }
  }
}
```
```

**الأثر:**
- تعديل `11-EXTENSION_RUNNER_SPEC.md`

---

### CF-09: غياب PII Redaction rules 🟠

**الملف المتأثر:**
- `11-EXTENSION_RUNNER_SPEC.md`: يذكر sanitization لكن بدون قواعد PII

**التعديل المطلوب:**
```typescript
// إضافة قسم في 11-EXTENSION_RUNNER_SPEC.md

## 🔐 PII Redaction Rules

### What to Redact
| PII Type | Pattern | Replacement |
|----------|---------|-------------|
| Credit Card | `\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}` | `[CARD_REDACTED]` |
| SSN/National ID | `\d{10}` (Saudi) | `[ID_REDACTED]` |
| Password fields | `password=.*` | `[PASSWORD_REDACTED]` |
| API Keys | `(api[_-]?key|token)[:=]\s*\S+` | `[KEY_REDACTED]` |

### What NOT to Redact (Business Data)
- Phone numbers (business contact)
- Email addresses (business contact)
- Company names
- Employee names (public profiles)
- Addresses (business locations)

### Implementation
```typescript
function sanitizeEvidence(text: string): string {
  const patterns = [
    { regex: /\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}/g, replacement: '[CARD_REDACTED]' },
    { regex: /\b\d{10}\b/g, replacement: '[ID_REDACTED]' },
    { regex: /password[:=]\s*\S+/gi, replacement: '[PASSWORD_REDACTED]' },
    { regex: /(api[_-]?key|secret|token)[:=]\s*\S+/gi, replacement: '[KEY_REDACTED]' },
  ];
  
  let sanitized = text;
  for (const { regex, replacement } of patterns) {
    sanitized = sanitized.replace(regex, replacement);
  }
  
  return sanitized;
}
```
```

**الأثر:**
- تعديل `11-EXTENSION_RUNNER_SPEC.md`

---

### CF-10: غياب CI check للتزامن 🟡

**الملف المتأثر:**
- `12-UI_VENDORIZING_PLAN.md`: يذكر vendoring script لكن بدون CI check

**التعديل المطلوب:**
```yaml
# إضافة في 12-UI_VENDORIZING_PLAN.md

## 🔄 CI Sync Check

### GitHub Action
```yaml
# .github/workflows/extension-ui-sync.yml
name: Extension UI Sync Check

on:
  push:
    paths:
      - 'web/src/components/**'
      - 'web/src/pages/ExtensionSidePanel.tsx'
      - 'extension/src/ui/**'

jobs:
  check-sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run vendor script
        run: node scripts/vendor-ui.js --check-only
        
      - name: Fail if out of sync
        run: |
          if [ -f .ui-out-of-sync ]; then
            echo "❌ Extension UI is out of sync with Web UI"
            echo "Run: npm run vendor-ui"
            exit 1
          fi
```

### Check-only Mode
```javascript
// scripts/vendor-ui.js --check-only
if (process.argv.includes('--check-only')) {
  const diffs = compareFiles(WEB_FILES, EXTENSION_FILES);
  if (diffs.length > 0) {
    fs.writeFileSync('.ui-out-of-sync', diffs.join('\n'));
    process.exit(1);
  }
}
```
```

**الأثر:**
- تعديل `12-UI_VENDORIZING_PLAN.md`

---

### CF-11: نقص endpoints SaaS في OpenAPI 🔴

**الملف المتأثر:**
- `openapi.yaml`: لا يحتوي endpoints كاملة للـ SaaS

**التعديل المطلوب:**
```yaml
# إضافة في openapi.yaml

paths:
  /api/auth/signup:
    post:
      tags: [Auth]
      summary: Create new account with tenant
      # ...
      
  /api/tenants:
    get:
      tags: [Tenants]
      summary: List user's tenants
      # ...
    post:
      tags: [Tenants]
      summary: Create new tenant
      # ...
      
  /api/tenants/{id}/switch:
    post:
      tags: [Tenants]
      summary: Switch to tenant
      # ...
      
  /api/invites:
    get:
      tags: [Team]
      summary: List pending invites
      # ...
    post:
      tags: [Team]
      summary: Create invite
      # ...
      
  /api/invites/{token}/accept:
    post:
      tags: [Team]
      summary: Accept invite
      # ...
      
  /api/billing/plan:
    get:
      tags: [Billing]
      summary: Get current plan
      # ...
      
  /api/billing/usage:
    get:
      tags: [Billing]
      summary: Get usage stats
      # ...
```

**الأثر:**
- تعديل `openapi.yaml`

---

### CF-15: استخدام <all_urls> ضمني 🔴

**الملف المتأثر:**
- `11-EXTENSION_RUNNER_SPEC.md`: يذكر allowlist لكن manifest example قد يكون غير واضح

**التعديل المطلوب:**
```json
// تأكيد في 11-EXTENSION_RUNNER_SPEC.md

// ❌ NEVER use
"host_permissions": ["<all_urls>"]

// ✅ ALWAYS use explicit allowlist
"host_permissions": [
  "https://www.google.com/maps/*",
  "https://maps.google.com/*",
  "https://www.google.com/search*",
  "https://www.linkedin.com/company/*",
  "https://www.linkedin.com/in/*",
  "https://api.leadz.sa/*"
]

// ❌ NEVER add dynamically without review
// Any new domain requires:
// 1. Security review
// 2. Privacy impact assessment
// 3. Manifest update + Chrome Web Store review
```

**الأثر:**
- تعديل `11-EXTENSION_RUNNER_SPEC.md`

---

### CF-17: غياب hash/timestamp في Evidence schema 🟡

**الملف المتأثر:**
- `11-EXTENSION_RUNNER_SPEC.md` (سطر 252-260): EvidenceItem بدون hash

**الاقتباس:**
```typescript
interface EvidenceItem {
  type: EvidenceType;
  title: string;
  source: string;
  url?: string;
  snippet: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  rawData?: object;
}
```

**التعديل المطلوب:**
```typescript
interface EvidenceItem {
  type: EvidenceType;
  title: string;
  source: string;
  url?: string;
  snippet: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  rawData?: object;
  
  // إضافات جديدة
  hash: string;           // SHA-256 of snippet for deduplication
  collectedAt: string;    // ISO timestamp
  pageLoadTime?: number;  // ms, for debugging
  sizeBytes: number;      // For quota tracking
}
```

**الأثر:**
- تعديل `11-EXTENSION_RUNNER_SPEC.md`
- تعديل `02-DATA-MODEL.md` (evidence table)

---

### CF-20: غياب size limits للـ Evidence 🟠

**الملف المتأثر:**
- `11-EXTENSION_RUNNER_SPEC.md`: لا يحدد حدود حجم Evidence

**التعديل المطلوب:**
```typescript
// إضافة في 11-EXTENSION_RUNNER_SPEC.md

## 📏 Evidence Size Limits

| Limit | Value | Reason |
|-------|-------|--------|
| Max snippet length | 10,000 chars | Prevent huge text blocks |
| Max rawData size | 50KB | Prevent large JSON |
| Max evidence per job | 100 items | Prevent abuse |
| Max total per job | 5MB | Network/storage limits |

### Enforcement
```typescript
function validateEvidence(item: EvidenceItem): EvidenceItem {
  return {
    ...item,
    snippet: item.snippet.slice(0, 10000),
    rawData: truncateObject(item.rawData, 50 * 1024),
    sizeBytes: calculateSize(item)
  };
}
```
```

**الأثر:**
- تعديل `11-EXTENSION_RUNNER_SPEC.md`

---

### CF-22: غياب Definition of Done للـ Sprints 🟠

**الملف المتأثر:**
- `07-DEVELOPMENT-ROADMAP.md`: لا يحتوي DoD واضح

**التعديل المطلوب:**
```markdown
# إضافة في 07-DEVELOPMENT-ROADMAP.md

## ✅ Definition of Done (DoD)

### Sprint: SaaS Foundation
- [ ] All endpoints return tenant-scoped data
- [ ] RBAC enforced on all protected routes
- [ ] Signup flow creates tenant + owner
- [ ] Invite flow works end-to-end
- [ ] Switch tenant works for multi-tenant users
- [ ] Unit tests: 80% coverage on auth/tenant modules
- [ ] Integration tests: signup, login, invite, switch
- [ ] Security review: no tenant data leakage

### Sprint: Runner Core
- [ ] Extension connects to backend via WebSocket
- [ ] Job dispatch and ACK work
- [ ] Progress updates flow correctly
- [ ] Evidence upload works
- [ ] Execution Window opens minimized
- [ ] User tabs are never touched
- [ ] MV3 lifecycle handled (sleep/wake)
- [ ] Offline queue works for 100 items
- [ ] No <all_urls> in manifest
- [ ] Chrome Web Store review passed
```

**الأثر:**
- تعديل `07-DEVELOPMENT-ROADMAP.md`

---

## 📊 ملخص الإصلاحات المطلوبة

| الملف | عدد التعديلات | الأولوية |
|-------|---------------|----------|
| `11-EXTENSION_RUNNER_SPEC.md` | 8 | 🔴 عالية |
| `06-API-REQUIREMENTS.md` | 3 | 🔴 عالية |
| `openapi.yaml` | 2 | 🔴 عالية |
| `03-SCREENS-ANALYSIS.md` | 1 | 🔴 عالية |
| `04-USER-FLOWS.md` | 1 | 🔴 عالية |
| `02-DATA-MODEL.md` | 2 | 🟠 متوسطة |
| `07-DEVELOPMENT-ROADMAP.md` | 2 | 🟠 متوسطة |
| `12-UI_VENDORIZING_PLAN.md` | 1 | 🟡 منخفضة |
| `13-EXTENSION_API_MAPPING.md` | 1 | 🟡 منخفضة |
| `00-GLOSSARY.md` | 1 | 🟡 منخفضة |

---

## ❓ Open Questions

| # | السؤال | طريقة التحقق |
|---|--------|--------------|
| 1 | هل نسمح بـ LOGIN لأي connector؟ | Product decision |
| 2 | ما الحد الأقصى لحجم Offline Queue؟ | Performance testing |
| 3 | هل نحتاج redact للأرقام السعودية؟ | Legal review |
| 4 | ما مدة صلاحية Evidence القديم؟ | Product decision |

---

> **الوثيقة التالية:** [15-MULTITENANCY_RBAC_MATRIX.md](./15-MULTITENANCY_RBAC_MATRIX.md)
