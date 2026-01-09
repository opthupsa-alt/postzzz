# 🔌 مواصفات Extension Runner/Agent - Analysis Pack v2

> **الإصدار:** 2.0.0  
> **تاريخ الإنشاء:** يناير 2026  
> **الحالة:** تصميم نهائي - جاهز للتنفيذ

---

## 📋 ملخص تنفيذي

هذا المستند يُعرّف مواصفات **Extension Runner** (Chrome Extension MV3 Side Panel) الذي يعمل كـ **Execution Engine** للنظام، بينما يعمل الـ Backend كـ **Orchestrator**.

### القرار المعماري الثابت (غير قابل للتفاوض)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ARCHITECTURE DECISION                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────┐              ┌─────────────────────────────────┐   │
│  │                 │   Job Plan   │                                 │   │
│  │     BACKEND     │─────────────►│      EXTENSION RUNNER           │   │
│  │   Orchestrator  │              │      Execution Engine           │   │
│  │                 │◄─────────────│                                 │   │
│  │  - Job Planning │   Evidence   │  - Executes in Browser Tabs     │   │
│  │  - RBAC/Audit   │   Progress   │  - Collects Evidence            │   │
│  │  - Multi-tenant │   Logs       │  - Sends Progress/Logs          │   │
│  │  - Reports Gen  │              │  - Handles Captcha/Blocks       │   │
│  │  - Storage      │              │                                 │   │
│  └─────────────────┘              └─────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🏗️ Architecture: Extension Runner vs Backend Orchestrator

### Backend (Orchestrator) المسؤوليات

| المسؤولية | التفاصيل |
|-----------|----------|
| **Job Planning** | إنشاء Job Plan مع Steps محددة |
| **Job Dispatch** | إرسال Jobs للـ Extension عبر API/WebSocket |
| **Evidence Storage** | استقبال وتخزين Evidence من الـ Extension |
| **Report Generation** | توليد التقارير الذكية من Evidence |
| **RBAC Enforcement** | التحقق من الصلاحيات قبل dispatch |
| **Audit Logging** | تسجيل جميع الأحداث |
| **Multi-tenant Isolation** | عزل البيانات بين Tenants |
| **Rate Limiting** | التحكم في معدل الطلبات |
| **Feature Flags** | إرسال الميزات المتاحة للـ Extension |

### Extension Runner (Execution Engine) المسؤوليات

| المسؤولية | التفاصيل |
|-----------|----------|
| **Job Execution** | تنفيذ Steps داخل tabs مخصصة |
| **Evidence Collection** | جمع البيانات من المصادر |
| **Progress Reporting** | إرسال تحديثات التقدم للـ Backend |
| **Log Streaming** | إرسال logs تفصيلية |
| **User Action Handling** | طلب تدخل المستخدم (Captcha/Login) |
| **Connector Management** | تشغيل Connectors المختلفة |
| **Tenant Context** | الحفاظ على سياق الـ Tenant |
| **Offline Queue** | تخزين مؤقت عند انقطاع الاتصال |

---

## ⚙️ Execution Model

### Job Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           JOB EXECUTION FLOW                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. USER ACTION (Web UI)                                                │
│     │                                                                    │
│     ▼                                                                    │
│  2. BACKEND creates Job + Plan                                          │
│     │                                                                    │
│     │  Job Plan:                                                        │
│     │  {                                                                │
│     │    jobId: "uuid",                                                 │
│     │    type: "SEARCH",                                                │
│     │    steps: [                                                       │
│     │      { id: 1, connector: "google_maps", action: "search", ... }, │
│     │      { id: 2, connector: "google_maps", action: "extract", ... } │
│     │    ]                                                              │
│     │  }                                                                │
│     │                                                                    │
│     ▼                                                                    │
│  3. BACKEND dispatches to Extension (WebSocket/Pull)                    │
│     │                                                                    │
│     ▼                                                                    │
│  4. EXTENSION acknowledges (ACK)                                        │
│     │                                                                    │
│     ▼                                                                    │
│  5. EXTENSION executes Steps sequentially                               │
│     │                                                                    │
│     ├──► Opens dedicated tab (NOT user's tabs)                          │
│     ├──► Navigates to target URL                                        │
│     ├──► Extracts data (text only, sanitized)                          │
│     ├──► Sends Progress updates                                         │
│     ├──► Sends Logs                                                     │
│     └──► Sends Evidence batches                                         │
│     │                                                                    │
│     ▼                                                                    │
│  6. If BLOCKED/CAPTCHA → sends NeedsUserAction                         │
│     │                                                                    │
│     ▼                                                                    │
│  7. EXTENSION sends final status (SUCCESS/FAILED/PARTIAL)              │
│     │                                                                    │
│     ▼                                                                    │
│  8. BACKEND stores Evidence + generates Report                          │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Job Plan Structure

```typescript
interface JobPlan {
  jobId: string;
  tenantId: string;
  type: JobType;
  priority: 'LOW' | 'NORMAL' | 'HIGH';
  createdAt: string;
  expiresAt: string;  // Job expires if not started within this time
  
  context: {
    leadId?: string;
    listId?: string;
    searchQuery?: string;
    targetUrl?: string;
  };
  
  steps: JobStep[];
  
  config: {
    maxRetries: number;
    timeoutMs: number;
    throttleMs: number;  // Delay between steps
  };
}

interface JobStep {
  id: number;
  connector: ConnectorType;
  action: string;
  params: Record<string, any>;
  optional: boolean;  // If true, failure doesn't fail the job
  dependsOn?: number[];  // Step IDs that must complete first
}

type ConnectorType = 
  | 'google_maps'
  | 'web_search'
  | 'website_crawl'
  | 'social_public';
```

---

## 📡 Agent Protocol (Messages/Events)

### Communication Method Decision

| Option | Pros | Cons | **Decision** |
|--------|------|------|--------------|
| WebSocket | Real-time, bidirectional | Complex, connection management | ✅ **Selected** |
| SSE | Simple, server-push | One-way only | ❌ |
| Polling | Simple, stateless | Latency, inefficient | ❌ |

**Justification:** WebSocket provides real-time bidirectional communication needed for:
- Immediate job dispatch
- Live progress updates
- Instant user action requests
- Connection state awareness

### Message Types

```typescript
// ==================== Backend → Extension ====================

interface JobDispatchMessage {
  type: 'JOB_DISPATCH';
  payload: {
    jobPlan: JobPlan;
  };
}

interface JobCancelMessage {
  type: 'JOB_CANCEL';
  payload: {
    jobId: string;
    reason: string;
  };
}

interface ConfigUpdateMessage {
  type: 'CONFIG_UPDATE';
  payload: {
    allowlist: string[];
    featureFlags: Record<string, boolean>;
    connectorSettings: Record<string, ConnectorConfig>;
  };
}

// ==================== Extension → Backend ====================

interface JobAckMessage {
  type: 'JOB_ACK';
  payload: {
    jobId: string;
    accepted: boolean;
    reason?: string;  // If rejected
  };
}

interface ProgressMessage {
  type: 'PROGRESS';
  payload: {
    jobId: string;
    stepId: number;
    progress: number;  // 0-100
    message: string;
  };
}

interface LogMessage {
  type: 'LOG';
  payload: {
    jobId: string;
    stepId: number;
    level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
    message: string;
    data?: object;
    timestamp: string;
  };
}

interface EvidenceBatchMessage {
  type: 'EVIDENCE_BATCH';
  payload: {
    jobId: string;
    stepId: number;
    evidence: EvidenceItem[];
  };
}

interface EvidenceItem {
  type: EvidenceType;
  title: string;
  source: string;
  url?: string;
  snippet: string;  // Text only, sanitized, max 10,000 chars
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  rawData?: object;  // Structured data if available, max 50KB
  
  // Required metadata (CF-17 fix)
  hash: string;           // SHA-256 of snippet for deduplication
  collectedAt: string;    // ISO timestamp
  sizeBytes: number;      // For quota tracking
  pageLoadTimeMs?: number; // For debugging
}

/**
 * Evidence Size Limits (CF-20 fix):
 * ─────────────────────────────────
 * | Limit              | Value      | Reason                    |
 * |--------------------|------------|---------------------------|
 * | Max snippet length | 10,000 ch  | Prevent huge text blocks  |
 * | Max rawData size   | 50KB       | Prevent large JSON        |
 * | Max evidence/job   | 100 items  | Prevent abuse             |
 * | Max total/job      | 5MB        | Network/storage limits    |
 */

interface NeedsUserActionMessage {
  type: 'NEEDS_USER_ACTION';
  payload: {
    jobId: string;
    stepId: number;
    // LOGIN removed - use LOGIN_REQUIRED_UNSUPPORTED failure instead
    // CONSENT added for Google consent screens
    actionType: 'CAPTCHA' | 'CONSENT' | 'VERIFICATION' | 'BLOCKED';
    message: string;
    tabId?: number;  // Tab where action is needed
  };
}

/**
 * LOGIN Handling Rules (Non-Negotiable):
 * ─────────────────────────────────────
 * - إذا كان Connector.constraints.noLogin = true:
 *   - ❌ لا ترسل NEEDS_USER_ACTION مع actionType=LOGIN
 *   - ✅ أرسل JOB_COMPLETE مع status=FAILED و error.code=LOGIN_REQUIRED_UNSUPPORTED
 *   - ✅ اكتب Evidence بـ "غير متاح - يتطلب تسجيل دخول"
 * 
 * - Connectors مع noLogin=true:
 *   - social_public (LinkedIn public profiles only)
 * 
 * - CONSENT مسموح لـ:
 *   - Google consent screens (cookies, terms)
 *   - Age verification popups
 */

interface UserActionResolvedMessage {
  type: 'USER_ACTION_RESOLVED';
  payload: {
    jobId: string;
    stepId: number;
    success: boolean;
  };
}

interface JobCompleteMessage {
  type: 'JOB_COMPLETE';
  payload: {
    jobId: string;
    status: 'SUCCESS' | 'FAILED' | 'PARTIAL_SUCCESS' | 'CANCELLED';
    summary: {
      stepsCompleted: number;
      stepsTotal: number;
      evidenceCount: number;
      duration: number;  // ms
    };
    error?: {
      code: string;
      message: string;
      stepId?: number;
    };
  };
}

interface HeartbeatMessage {
  type: 'HEARTBEAT';
  payload: {
    extensionVersion: string;
    activeJobs: string[];
    status: 'IDLE' | 'BUSY' | 'PAUSED';
  };
}
```

---

## 🔄 Job State Machine

### States

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         JOB STATE MACHINE                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│                          ┌──────────┐                                   │
│                          │ PENDING  │                                   │
│                          └────┬─────┘                                   │
│                               │ dispatch                                │
│                               ▼                                         │
│                     ┌─────────────────┐                                │
│                     │ AWAITING_AGENT  │◄────────────────┐              │
│                     └────────┬────────┘                 │              │
│                              │ ack                      │ retry        │
│                              ▼                          │              │
│                     ┌─────────────────┐                 │              │
│              ┌──────│ AGENT_RUNNING   │─────────────────┤              │
│              │      └────────┬────────┘                 │              │
│              │               │                          │              │
│    needs_user_action         │                          │              │
│              │               │                          │              │
│              ▼               │                          │              │
│   ┌──────────────────┐       │                          │              │
│   │NEEDS_USER_ACTION │───────┤ resolved                 │              │
│   └──────────────────┘       │                          │              │
│              │               │                          │              │
│       timeout/cancel         │                          │              │
│              │               │                          │              │
│              ▼               │                          │              │
│      ┌───────────┐           │                          │              │
│      │  BLOCKED  │───────────┼──────────────────────────┘              │
│      └───────────┘           │                                         │
│                              │                                         │
│              ┌───────────────┼───────────────┐                        │
│              │               │               │                        │
│              ▼               ▼               ▼                        │
│      ┌───────────┐   ┌───────────┐   ┌─────────────────┐             │
│      │  SUCCESS  │   │  FAILED   │   │ PARTIAL_SUCCESS │             │
│      └───────────┘   └───────────┘   └─────────────────┘             │
│                              │                                         │
│                              ▼                                         │
│                      ┌───────────┐                                     │
│                      │ CANCELLED │                                     │
│                      └───────────┘                                     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### State Definitions

| State | Description | Transitions |
|-------|-------------|-------------|
| `PENDING` | Job created, waiting for dispatch | → AWAITING_AGENT |
| `AWAITING_AGENT` | Dispatched, waiting for Extension ACK | → AGENT_RUNNING, FAILED (timeout) |
| `AGENT_RUNNING` | Extension is executing steps | → SUCCESS, FAILED, PARTIAL_SUCCESS, NEEDS_USER_ACTION |
| `NEEDS_USER_ACTION` | Waiting for user to resolve (Captcha/Login) | → AGENT_RUNNING, BLOCKED (timeout) |
| `BLOCKED` | Cannot proceed, needs manual intervention | → CANCELLED, AGENT_RUNNING (retry) |
| `SUCCESS` | All steps completed successfully | Terminal |
| `FAILED` | Job failed | Terminal |
| `PARTIAL_SUCCESS` | Some steps succeeded, some failed | Terminal |
| `CANCELLED` | User or system cancelled | Terminal |

### Timeouts

| Transition | Timeout | Action |
|------------|---------|--------|
| AWAITING_AGENT → FAILED | 30s | No ACK received |
| NEEDS_USER_ACTION → BLOCKED | 5min | User didn't resolve |
| AGENT_RUNNING → FAILED | 10min | Job taking too long |

---

## 🔌 Connectors Framework

### Connector: google_maps

```typescript
interface GoogleMapsConnector {
  type: 'google_maps';
  
  actions: {
    search: {
      input: {
        query: string;      // e.g., "مطاعم"
        location: string;   // e.g., "الرياض"
        radius?: number;    // km
      };
      output: {
        results: GoogleMapsResult[];
        nextPageToken?: string;
      };
    };
    
    extract_details: {
      input: {
        placeId: string;
      };
      output: {
        name: string;
        address: string;
        phone?: string;
        website?: string;
        rating?: number;
        reviewCount?: number;
        hours?: string[];
        photos?: string[];  // URLs only, not downloaded
      };
    };
    
    extract_reviews: {
      input: {
        placeId: string;
        limit: number;
      };
      output: {
        reviews: {
          author: string;
          rating: number;
          text: string;
          date: string;
        }[];
      };
    };
  };
  
  failureModes: [
    'RATE_LIMITED',      // Too many requests
    'CAPTCHA_REQUIRED',  // Google showing captcha
    'NO_RESULTS',        // Search returned nothing
    'BLOCKED',           // IP blocked
    'TIMEOUT'            // Page didn't load
  ];
  
  throttling: {
    requestsPerMinute: 10;
    backoffMs: 5000;
    maxRetries: 3;
  };
}
```

### Connector: web_search

```typescript
interface WebSearchConnector {
  type: 'web_search';
  
  actions: {
    search: {
      input: {
        query: string;
        site?: string;  // site:linkedin.com
        limit: number;
      };
      output: {
        results: {
          title: string;
          url: string;
          snippet: string;
        }[];
      };
    };
  };
  
  failureModes: [
    'CAPTCHA_REQUIRED',
    'BLOCKED',
    'NO_RESULTS',
    'TIMEOUT'
  ];
  
  throttling: {
    requestsPerMinute: 5;
    backoffMs: 10000;
    maxRetries: 2;
  };
}
```

### Connector: website_crawl

```typescript
interface WebsiteCrawlConnector {
  type: 'website_crawl';
  
  actions: {
    fetch_page: {
      input: {
        url: string;
        selectors?: string[];  // CSS selectors to extract
      };
      output: {
        title: string;
        description?: string;
        content: string;  // Text only, sanitized
        links: string[];
        emails: string[];
        phones: string[];
      };
    };
    
    extract_contact: {
      input: {
        url: string;  // Usually /contact or /about
      };
      output: {
        emails: string[];
        phones: string[];
        addresses: string[];
        socialLinks: {
          platform: string;
          url: string;
        }[];
      };
    };
  };
  
  failureModes: [
    'BLOCKED',           // 403/401
    'NOT_FOUND',         // 404
    'TIMEOUT',           // Page didn't load
    'INVALID_SSL',       // Certificate error
    'ROBOTS_BLOCKED'     // robots.txt disallow
  ];
  
  throttling: {
    requestsPerMinute: 20;
    backoffMs: 2000;
    maxRetries: 2;
  };
  
  constraints: {
    maxPageSize: '5MB';
    maxDepth: 1;  // Light crawl only
    respectRobotsTxt: true;
  };
}
```

### Connector: social_public

```typescript
interface SocialPublicConnector {
  type: 'social_public';
  
  actions: {
    extract_profile: {
      input: {
        url: string;  // LinkedIn/Twitter public profile URL
      };
      output: {
        name: string;
        title?: string;
        company?: string;
        location?: string;
        bio?: string;
        connections?: string;  // "500+"
      };
    };
    
    extract_company: {
      input: {
        url: string;  // LinkedIn company page
      };
      output: {
        name: string;
        industry?: string;
        size?: string;
        website?: string;
        description?: string;
      };
    };
  };
  
  failureModes: [
    'LOGIN_REQUIRED_UNSUPPORTED',  // Need login but noLogin=true, fail gracefully
    'PROFILE_PRIVATE',   // Profile not public
    'RATE_LIMITED',
    'BLOCKED',
    'NOT_FOUND'
  ];
  
  throttling: {
    requestsPerMinute: 3;
    backoffMs: 20000;
    maxRetries: 1;
  };
  
  constraints: {
    publicOnly: true;  // Never access private data
    noLogin: true;     // Never use user's session
  };
}
```

---

## 🔒 Privacy & Isolation

### Core Principles

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      PRIVACY & ISOLATION RULES                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. ❌ NEVER touch user's existing tabs                                 │
│     → Runner opens its own dedicated tabs/window                        │
│                                                                          │
│  2. ❌ NEVER access user's cookies/sessions/tokens                      │
│     → All requests are fresh, no authentication reuse                   │
│                                                                          │
│  3. ❌ NEVER store sensitive data locally                               │
│     → Evidence sent to backend immediately, not cached                  │
│                                                                          │
│  4. ✅ Text-only evidence with sanitization                             │
│     → No images, no HTML, no scripts                                    │
│                                                                          │
│  5. ✅ Dedicated execution window                                       │
│     → Separate window for all job execution                             │
│                                                                          │
│  6. ✅ Clear separation from user browsing                              │
│     → User can continue browsing normally                               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Tab Isolation Implementation

```typescript
// Extension creates dedicated window for execution
async function createExecutionWindow(): Promise<chrome.windows.Window> {
  return chrome.windows.create({
    type: 'normal',
    state: 'minimized',  // Or 'normal' if user wants to see
    focused: false,
    url: 'about:blank'
  });
}

// All job tabs created in this window
async function createJobTab(windowId: number, url: string): Promise<chrome.tabs.Tab> {
  return chrome.tabs.create({
    windowId,
    url,
    active: false
  });
}

// Never query user's tabs
// ❌ chrome.tabs.query({ currentWindow: true })
// ✅ chrome.tabs.query({ windowId: executionWindowId })
```

### Evidence Sanitization

```typescript
function sanitizeEvidence(raw: string): string {
  // 1. Remove all HTML tags
  let text = raw.replace(/<[^>]*>/g, '');
  
  // 2. Remove scripts
  text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // 3. Decode HTML entities
  text = decodeHTMLEntities(text);
  
  // 4. Normalize whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  // 5. Limit length
  if (text.length > 10000) {
    text = text.substring(0, 10000) + '...';
  }
  
  // 6. Remove potential PII patterns (optional, configurable)
  // text = removePII(text);
  
  return text;
}
```

---

## 🛡️ Permissions & CSP

### Manifest V3 Permissions

```json
{
  "manifest_version": 3,
  "name": "Leedz Runner",
  "version": "1.0.0",
  
  "permissions": [
    "storage",           // For config/state
    "tabs",              // For creating execution tabs
    "windows",           // For execution window
    "scripting",         // For content script injection
    "alarms"             // For heartbeat/cleanup
  ],
  
  "host_permissions": [
    "https://www.google.com/maps/*",
    "https://maps.google.com/*",
    "https://www.google.com/search*",
    "https://www.linkedin.com/company/*",
    "https://www.linkedin.com/in/*",
    "https://api.leadz.sa/*"
  ],
  
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  },
  
  "side_panel": {
    "default_path": "sidepanel.html"
  },
  
  "background": {
    "service_worker": "background.js",
    "type": "module"
  }
}
```

### Domain Allowlist Strategy

```typescript
const DOMAIN_ALLOWLIST = {
  // Search & Maps
  'google_maps': [
    'https://www.google.com/maps/*',
    'https://maps.google.com/*'
  ],
  
  // Web Search
  'web_search': [
    'https://www.google.com/search*'
  ],
  
  // Social (Public only)
  'social_public': [
    'https://www.linkedin.com/company/*',
    'https://www.linkedin.com/in/*'
  ],
  
  // Website Crawl - Dynamic based on lead's website
  'website_crawl': [
    // Validated at runtime against blocklist
  ],
  
  // Backend API
  'api': [
    'https://api.leadz.sa/*',
    'https://api.staging.leadz.sa/*'  // Staging
  ]
};

// Blocklist for website_crawl
const DOMAIN_BLOCKLIST = [
  '*.gov.sa',      // Government sites
  '*.edu.sa',      // Educational
  'bank*',         // Banking
  '*login*',       // Login pages
  '*signin*',
  '*auth*'
];
```

### Why NOT `<all_urls>`

```
❌ <all_urls> is NOT used because:

1. Security Risk: Gives access to all websites including sensitive ones
2. Privacy Concern: Users don't trust extensions with broad permissions
3. Store Review: Chrome Web Store scrutinizes <all_urls> heavily
4. Not Needed: We only need specific domains for our connectors

✅ Instead, we use:
- Explicit host_permissions for known domains
- Runtime permission request for website_crawl targets
- Blocklist to prevent accessing sensitive domains
```

---

## 🏢 Tenant Context in Extension

### How Tenant is Determined

```typescript
// 1. User logs in via Side Panel → receives JWT
// 2. JWT contains tenantId
// 3. Extension stores current tenant context

interface ExtensionState {
  auth: {
    token: string;
    refreshToken: string;
    expiresAt: number;
  };
  
  tenant: {
    id: string;
    name: string;
    role: UserRole;
  };
  
  tenants: {  // All tenants user belongs to
    id: string;
    name: string;
    role: UserRole;
  }[];
  
  config: {
    featureFlags: Record<string, boolean>;
    connectorSettings: Record<string, ConnectorConfig>;
  };
}

// Stored in chrome.storage.local (encrypted at rest by Chrome)
```

### Cross-Tenant Prevention

```typescript
// Every API call includes tenant context
async function apiCall(endpoint: string, data: any) {
  const state = await getState();
  
  return fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${state.auth.token}`,
      'X-Tenant-ID': state.tenant.id,  // Explicit tenant header
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
}

// Backend validates:
// 1. Token is valid
// 2. Token's tenantId matches X-Tenant-ID header
// 3. User has permission for this action in this tenant
```

### Tenant Switching

```typescript
async function switchTenant(newTenantId: string) {
  // 1. Cancel all running jobs
  await cancelAllJobs();
  
  // 2. Clear local state
  await clearJobState();
  
  // 3. Request new token from backend
  const response = await fetch(`${API_BASE}/auth/switch-tenant`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${currentToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ tenantId: newTenantId })
  });
  
  // 4. Update local state with new token
  const { token, tenant } = await response.json();
  await updateState({ auth: { token }, tenant });
  
  // 5. Fetch new config (feature flags, etc.)
  await fetchConfig();
}
```

---

## 🚩 Feature Flags in Extension

### Flag Categories

```typescript
interface ExtensionFeatureFlags {
  // Connectors
  connector_google_maps: boolean;
  connector_web_search: boolean;
  connector_website_crawl: boolean;
  connector_social_public: boolean;
  
  // Features
  feature_reveal: boolean;       // Contact reveal
  feature_whatsapp: boolean;     // WhatsApp send
  feature_export: boolean;       // Export to CSV
  feature_bulk_actions: boolean; // Bulk operations
  feature_ai_report: boolean;    // AI report generation
  
  // UI
  ui_dark_mode: boolean;
  ui_compact_view: boolean;
}
```

### Flag Enforcement

```typescript
// Flags fetched from backend on:
// 1. Extension startup
// 2. Tenant switch
// 3. Periodic refresh (every 5 min)

async function fetchFeatureFlags(): Promise<ExtensionFeatureFlags> {
  const response = await apiCall('/agent/config', {});
  return response.featureFlags;
}

// UI respects flags
function SidePanelUI() {
  const flags = useFeatureFlags();
  
  return (
    <div>
      {flags.feature_reveal && <RevealButton />}
      {flags.feature_whatsapp && <WhatsAppButton />}
      {flags.feature_export && <ExportButton />}
    </div>
  );
}

// Job execution respects flags
async function executeJob(job: JobPlan) {
  const flags = await getFeatureFlags();
  
  for (const step of job.steps) {
    const connectorFlag = `connector_${step.connector}`;
    
    if (!flags[connectorFlag]) {
      await sendLog(job.jobId, step.id, 'WARN', 
        `Connector ${step.connector} disabled by feature flag`);
      continue;  // Skip this step
    }
    
    await executeStep(step);
  }
}
```

---

## 📊 Summary Tables

### Message Types Summary

| Direction | Type | Purpose |
|-----------|------|---------|
| B→E | JOB_DISPATCH | Send job plan to execute |
| B→E | JOB_CANCEL | Cancel running job |
| B→E | CONFIG_UPDATE | Update flags/settings |
| E→B | JOB_ACK | Acknowledge job receipt |
| E→B | PROGRESS | Report step progress |
| E→B | LOG | Send execution logs |
| E→B | EVIDENCE_BATCH | Send collected evidence |
| E→B | NEEDS_USER_ACTION | Request user intervention |
| E→B | USER_ACTION_RESOLVED | User resolved action |
| E→B | JOB_COMPLETE | Job finished |
| E→B | HEARTBEAT | Connection keepalive |

### Connector Summary

| Connector | Actions | Rate Limit | Retry |
|-----------|---------|------------|-------|
| google_maps | search, extract_details, extract_reviews | 10/min | 3 |
| web_search | search | 5/min | 2 |
| website_crawl | fetch_page, extract_contact | 20/min | 2 |
| social_public | extract_profile, extract_company | 3/min | 1 |

---

## 🪟 Execution Window Architecture (CF-02 fix)

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
│  │ EXECUTION WINDOW (Separate, Minimized by default)                │   │
│  │                                                                   │   │
│  │  [Job Tab 1] [Job Tab 2] [Job Tab 3]                            │   │
│  │                                                                   │   │
│  │  ✅ All job execution happens here                               │   │
│  │  ✅ User can continue browsing normally                          │   │
│  │  ✅ Window is minimized by default                               │   │
│  │  ✅ User can maximize to see/debug if needed                     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Implementation

```typescript
class ExecutionWindowManager {
  private windowId: number | null = null;
  
  async ensureWindow(): Promise<number> {
    if (this.windowId) {
      try {
        await chrome.windows.get(this.windowId);
        return this.windowId;
      } catch {
        this.windowId = null;
      }
    }
    
    const window = await chrome.windows.create({
      type: 'normal',
      state: 'minimized',  // Start minimized - user can maximize
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

---

## 🔄 MV3 Lifecycle Management (CF-07 fix)

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
function setupKeepAlive(): void {
  chrome.alarms.create('keepAlive', { periodInMinutes: 0.4 }); // 24 seconds
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'keepAlive') {
    const state = await getState();
    
    if (state.activeJobs.length > 0) {
      // Send heartbeat to keep connection alive
      await sendHeartbeat();
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
  private reconnectDelay = 1000;
  
  async connect(): Promise<void> {
    const state = await getState();
    
    this.ws = new WebSocket(`wss://api.leadz.sa/agent/ws`);
    
    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.authenticate(state.auth.token);
    };
    
    this.ws.onclose = () => this.handleClose();
    this.ws.onerror = () => this.handleClose();
  }
  
  private handleClose(): void {
    this.ws = null;
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = Math.min(
        this.reconnectDelay * Math.pow(2, this.reconnectAttempts),
        30000 // Max 30 seconds
      );
      
      setTimeout(() => this.connect(), delay);
      this.reconnectAttempts++;
    } else {
      this.notifyConnectionLost();
    }
  }
  
  private notifyConnectionLost(): void {
    // Show notification to user
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon.png',
      title: 'انقطع الاتصال',
      message: 'تعذر الاتصال بالخادم. سيتم إيقاف المهام مؤقتاً.'
    });
  }
}
```

---

## 📴 Offline Queue (IndexedDB) (CF-08 fix)

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

const DB_NAME = 'leedz-offline';
const STORE_NAME = 'queue';
```

### Limits

| Limit | Value | Reason |
|-------|-------|--------|
| Max queue size | 100 items | Prevent storage bloat |
| Max item age | 24 hours | Stale data not useful |
| Max item size | 100KB | Prevent large payloads |
| Max retries | 3 | Avoid infinite loops |

### Implementation

```typescript
class OfflineQueue {
  private db: IDBDatabase | null = null;
  
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      };
      
      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };
      
      request.onerror = () => reject(request.error);
    });
  }
  
  async enqueue(item: Omit<OfflineQueueItem, 'id' | 'createdAt' | 'retryCount'>): Promise<void> {
    const count = await this.getCount();
    if (count >= 100) {
      // Remove oldest item
      await this.removeOldest();
    }
    
    const queueItem: OfflineQueueItem = {
      ...item,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      retryCount: 0,
      maxRetries: 3
    };
    
    // ... store in IndexedDB
  }
  
  async sync(): Promise<void> {
    const items = await this.getAll();
    
    for (const item of items) {
      // Skip stale items (> 24 hours)
      if (Date.now() - item.createdAt > 24 * 60 * 60 * 1000) {
        await this.remove(item.id);
        continue;
      }
      
      try {
        await this.sendToBackend(item);
        await this.remove(item.id);
      } catch (error) {
        if (item.retryCount >= item.maxRetries) {
          await this.remove(item.id);
          console.error('Dropped item after max retries:', item.id);
        } else {
          await this.incrementRetry(item.id);
        }
      }
    }
  }
}
```

---

## 🔐 PII Redaction Rules (CF-09 fix)

### What to Redact

| PII Type | Pattern | Replacement |
|----------|---------|-------------|
| Credit Card | `\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}` | `[CARD_REDACTED]` |
| Saudi National ID | `\b[12]\d{9}\b` | `[ID_REDACTED]` |
| Password fields | `password[:=]\s*\S+` | `[PASSWORD_REDACTED]` |
| API Keys | `(api[_-]?key|secret|token)[:=]\s*\S+` | `[KEY_REDACTED]` |

### What NOT to Redact (Business Data)

- ✅ Phone numbers (business contact)
- ✅ Email addresses (business contact)
- ✅ Company names
- ✅ Employee names (public profiles)
- ✅ Addresses (business locations)

### Implementation

```typescript
function sanitizeEvidence(text: string): string {
  const patterns = [
    { regex: /\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}/g, replacement: '[CARD_REDACTED]' },
    { regex: /\b[12]\d{9}\b/g, replacement: '[ID_REDACTED]' },
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

---

## 🔄 MV3 Lifecycle Management

### Service Worker Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    MV3 SERVICE WORKER LIFECYCLE                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐              │
│  │ INSTALL │───►│ ACTIVE  │───►│  IDLE   │───►│TERMINATED│              │
│  └─────────┘    └────┬────┘    └────┬────┘    └────┬────┘              │
│                      │              │              │                     │
│                      │              │ 30s timeout  │                     │
│                      │              ▼              │                     │
│                      │         ┌─────────┐        │                     │
│                      │         │ SUSPEND │        │                     │
│                      │         └────┬────┘        │                     │
│                      │              │              │                     │
│                      │◄─────────────┴──────────────┘                    │
│                      │     Event triggers wake-up                       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Keep-Alive Strategy

```typescript
// Keep service worker alive during active jobs
class KeepAliveManager {
  private keepAliveInterval: number | null = null;
  private activeJobs: Set<string> = new Set();

  startKeepAlive(): void {
    if (this.keepAliveInterval) return;
    
    // Ping every 25 seconds (before 30s timeout)
    this.keepAliveInterval = setInterval(() => {
      // Minimal activity to prevent suspension
      chrome.storage.local.get(['keepAlive'], () => {
        chrome.storage.local.set({ keepAlive: Date.now() });
      });
    }, 25000);
  }

  stopKeepAlive(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  onJobStart(jobId: string): void {
    this.activeJobs.add(jobId);
    this.startKeepAlive();
  }

  onJobEnd(jobId: string): void {
    this.activeJobs.delete(jobId);
    if (this.activeJobs.size === 0) {
      this.stopKeepAlive();
    }
  }
}
```

### State Persistence

```typescript
// Persist critical state before suspension
interface PersistedState {
  activeJobs: JobState[];
  offlineQueue: OfflineQueueItem[];
  lastHeartbeat: number;
  wsConnectionState: 'connected' | 'disconnected';
}

// Save state on suspend
chrome.runtime.onSuspend.addListener(async () => {
  const state: PersistedState = {
    activeJobs: Array.from(jobManager.getActiveJobs()),
    offlineQueue: await offlineQueue.getAll(),
    lastHeartbeat: Date.now(),
    wsConnectionState: wsManager.isConnected() ? 'connected' : 'disconnected'
  };
  await chrome.storage.local.set({ persistedState: state });
});

// Restore state on wake
chrome.runtime.onStartup.addListener(async () => {
  const { persistedState } = await chrome.storage.local.get('persistedState');
  if (persistedState) {
    await restoreState(persistedState);
  }
});
```

---

## ⚠️ Unified Failure Modes

### Error Codes (Standardized)

| Code | Description | Recoverable | User Action |
|------|-------------|:-----------:|-------------|
| `LOGIN_REQUIRED_UNSUPPORTED` | الموقع يتطلب تسجيل دخول (noLogin connector) | ❌ | لا شيء - يُسجل كـ "غير متاح" |
| `RATE_LIMITED` | تم تجاوز حد الطلبات | ✅ | انتظار + إعادة محاولة تلقائية |
| `BLOCKED` | الموقع حظر الطلب | ⚠️ | قد يحتاج تدخل يدوي |
| `CAPTCHA_REQUIRED` | يتطلب حل CAPTCHA | ✅ | تدخل المستخدم |
| `NOT_FOUND` | الصفحة غير موجودة (404) | ❌ | تخطي |
| `PROFILE_PRIVATE` | الملف الشخصي خاص | ❌ | تسجيل كـ "خاص" |
| `TIMEOUT` | انتهت مهلة الطلب | ✅ | إعادة محاولة |
| `NETWORK_ERROR` | خطأ في الشبكة | ✅ | إعادة محاولة |
| `PARSE_ERROR` | فشل تحليل الصفحة | ❌ | تسجيل خطأ |
| `CONSENT_REQUIRED` | يتطلب موافقة (cookies/terms) | ✅ | تدخل المستخدم |
| `QUOTA_EXCEEDED` | تجاوز حد الاستخدام | ❌ | ترقية الباقة |

### Error Handling Flow

```typescript
interface FailureResult {
  code: FailureCode;
  message: string;
  recoverable: boolean;
  retryAfterMs?: number;
  userActionRequired?: boolean;
}

async function handleStepFailure(
  step: JobStep,
  error: FailureResult
): Promise<'retry' | 'skip' | 'fail' | 'user_action'> {
  
  // Non-recoverable errors
  if (!error.recoverable) {
    if (step.optional) {
      return 'skip';  // Skip optional steps
    }
    return 'fail';    // Fail required steps
  }
  
  // User action required
  if (error.userActionRequired) {
    await sendNeedsUserAction(step, error);
    return 'user_action';
  }
  
  // Recoverable with retry
  if (error.retryAfterMs && step.retryCount < step.maxRetries) {
    await delay(error.retryAfterMs);
    return 'retry';
  }
  
  return step.optional ? 'skip' : 'fail';
}
```

### Connector-Specific Failure Handling

```typescript
const CONNECTOR_FAILURE_RULES: Record<ConnectorType, FailureRules> = {
  google_maps: {
    onRateLimit: { action: 'retry', delay: 60000 },
    onBlocked: { action: 'fail', notify: true },
    onCaptcha: { action: 'user_action' }
  },
  web_search: {
    onRateLimit: { action: 'retry', delay: 30000 },
    onBlocked: { action: 'skip' },
    onCaptcha: { action: 'skip' }  // Don't solve captcha for web search
  },
  website_crawl: {
    onRateLimit: { action: 'retry', delay: 5000 },
    onBlocked: { action: 'skip' },
    onNotFound: { action: 'skip' }
  },
  social_public: {
    onLoginRequired: { action: 'fail', code: 'LOGIN_REQUIRED_UNSUPPORTED' },
    onPrivate: { action: 'skip', evidence: 'الملف الشخصي خاص' },
    onRateLimit: { action: 'retry', delay: 120000 }
  }
};
```

---

## 🔀 Concurrency Policy

### Limits

| Limit | Value | Reason |
|-------|-------|--------|
| Max parallel jobs | 3 | Browser performance |
| Max tabs per job | 2 | Memory management |
| Max total tabs | 5 | System resources |
| Job queue size | 10 | Prevent overload |

### Implementation

```typescript
class ConcurrencyManager {
  private readonly MAX_PARALLEL_JOBS = 3;
  private readonly MAX_TABS_PER_JOB = 2;
  private readonly MAX_TOTAL_TABS = 5;
  
  private activeJobs: Map<string, JobExecution> = new Map();
  private jobQueue: JobPlan[] = [];
  private openTabs: Map<number, string> = new Map(); // tabId -> jobId

  async canStartJob(): Promise<boolean> {
    return this.activeJobs.size < this.MAX_PARALLEL_JOBS;
  }

  async enqueueJob(job: JobPlan): Promise<void> {
    if (await this.canStartJob()) {
      await this.startJob(job);
    } else {
      this.jobQueue.push(job);
      console.log(`Job ${job.jobId} queued. Queue size: ${this.jobQueue.length}`);
    }
  }

  async onJobComplete(jobId: string): Promise<void> {
    this.activeJobs.delete(jobId);
    this.releaseJobTabs(jobId);
    
    // Start next queued job
    if (this.jobQueue.length > 0 && await this.canStartJob()) {
      const nextJob = this.jobQueue.shift()!;
      await this.startJob(nextJob);
    }
  }

  async requestTab(jobId: string): Promise<number | null> {
    const jobTabs = this.getJobTabCount(jobId);
    const totalTabs = this.openTabs.size;

    if (jobTabs >= this.MAX_TABS_PER_JOB) {
      return null; // Job tab limit reached
    }
    if (totalTabs >= this.MAX_TOTAL_TABS) {
      return null; // Total tab limit reached
    }

    const tab = await chrome.tabs.create({ active: false });
    this.openTabs.set(tab.id!, jobId);
    return tab.id!;
  }
}
```

### Backoff Strategy

```typescript
const BACKOFF_CONFIG = {
  initialDelay: 1000,      // 1 second
  maxDelay: 60000,         // 1 minute
  multiplier: 2,
  jitter: 0.1              // 10% random jitter
};

function calculateBackoff(retryCount: number): number {
  const delay = Math.min(
    BACKOFF_CONFIG.initialDelay * Math.pow(BACKOFF_CONFIG.multiplier, retryCount),
    BACKOFF_CONFIG.maxDelay
  );
  
  // Add jitter
  const jitter = delay * BACKOFF_CONFIG.jitter * (Math.random() * 2 - 1);
  return Math.round(delay + jitter);
}
```

### Pause/Resume

```typescript
class JobPauseManager {
  private pausedJobs: Set<string> = new Set();

  pauseJob(jobId: string): void {
    this.pausedJobs.add(jobId);
    // Notify backend
    wsManager.send({
      type: 'JOB_PAUSED',
      payload: { jobId }
    });
  }

  resumeJob(jobId: string): void {
    this.pausedJobs.delete(jobId);
    // Notify backend
    wsManager.send({
      type: 'JOB_RESUMED',
      payload: { jobId }
    });
  }

  isPaused(jobId: string): boolean {
    return this.pausedJobs.has(jobId);
  }

  pauseAll(): void {
    for (const jobId of jobManager.getActiveJobIds()) {
      this.pauseJob(jobId);
    }
  }

  resumeAll(): void {
    for (const jobId of this.pausedJobs) {
      this.resumeJob(jobId);
    }
  }
}
```

---

## 🪟 Execution Window Strategy

### Window Management

```typescript
// Create dedicated execution window (minimized, not user's tabs)
async function createExecutionWindow(): Promise<chrome.windows.Window> {
  return chrome.windows.create({
    type: 'normal',
    state: 'minimized',  // Hidden from user
    focused: false,
    width: 1280,
    height: 720
  });
}

// Rules:
// 1. NEVER use existing user windows
// 2. NEVER activate execution tabs
// 3. ALWAYS minimize execution window
// 4. Close execution window when all jobs complete
```

### Tab Isolation

```typescript
class ExecutionTabManager {
  private executionWindowId: number | null = null;
  private tabPool: Map<number, TabState> = new Map();

  async getOrCreateWindow(): Promise<number> {
    if (this.executionWindowId) {
      // Verify window still exists
      try {
        await chrome.windows.get(this.executionWindowId);
        return this.executionWindowId;
      } catch {
        this.executionWindowId = null;
      }
    }

    const window = await createExecutionWindow();
    this.executionWindowId = window.id!;
    return this.executionWindowId;
  }

  async createTab(url: string): Promise<number> {
    const windowId = await this.getOrCreateWindow();
    
    const tab = await chrome.tabs.create({
      windowId,
      url,
      active: false  // NEVER activate
    });

    this.tabPool.set(tab.id!, { 
      status: 'loading',
      createdAt: Date.now()
    });

    return tab.id!;
  }

  async cleanup(): Promise<void> {
    if (this.executionWindowId) {
      await chrome.windows.remove(this.executionWindowId);
      this.executionWindowId = null;
      this.tabPool.clear();
    }
  }
}
```

---

## ❓ Open Questions

| # | Question | Verification Method | Status |
|---|----------|---------------------|--------|
| 1 | هل نحتاج دعم Firefox أم Chrome فقط؟ | قرار Product | ⏳ Pending |
| 2 | هل نسمح للمستخدم بمشاهدة نافذة التنفيذ أم تبقى مخفية؟ | User research | ⏳ Pending |
| 3 | ما الحد الأقصى لعدد Jobs المتزامنة؟ | Load testing | ✅ 3 jobs |
| 4 | ما مدة صلاحية Evidence القديم؟ | Product decision | ✅ 24 hours |
| 5 | هل نحتاج redact للأرقام السعودية الخاصة؟ | Legal review | ⏳ Pending |

---

> **الوثيقة التالية:** [12-UI_VENDORIZING_PLAN.md](./12-UI_VENDORIZING_PLAN.md)
