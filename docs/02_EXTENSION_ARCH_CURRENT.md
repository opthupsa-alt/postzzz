# 02_EXTENSION_ARCH_CURRENT.md - معمارية الإضافة

> **Generated**: 2026-01-12  
> **Source**: `extension/`  
> **Purpose**: Phase 0 - فهم المشروع من الكود

---

## 1. Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CHROME EXTENSION (MV3)                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────┐    ┌─────────────────┐    ┌────────────────┐  │
│  │  Background.js  │◄──►│  Content Script │    │   Side Panel   │  │
│  │ (Service Worker)│    │ (Page Injection)│    │  (UI + Login)  │  │
│  └────────┬────────┘    └─────────────────┘    └───────┬────────┘  │
│           │                                            │           │
│           │         ┌──────────────────┐               │           │
│           └────────►│   WebSocket      │◄──────────────┘           │
│                     │   (Socket.io)    │                           │
│                     └────────┬─────────┘                           │
│                              │                                     │
└──────────────────────────────┼─────────────────────────────────────┘
                               │
                               ▼
                        ┌─────────────┐
                        │   API       │
                        │  /agent     │
                        └─────────────┘
```

---

## 2. Manifest Configuration

**Path**: `extension/manifest.json`

### Version & Type
```json
{
  "manifest_version": 3,
  "name": "Leedz - Lead Generation",
  "version": "1.0.0"
}
```

### Permissions
**Path**: `extension/manifest.json:18-31`

| Permission | Purpose |
|------------|---------|
| `storage` | Store auth token, settings |
| `tabs` | Manage browser tabs |
| `sidePanel` | Extension side panel UI |
| `activeTab` | Access current tab |
| `scripting` | Inject scripts |
| `windows` | Create execution windows |
| `alarms` | Scheduled tasks |
| `cookies` | Read platform cookies |
| `<all_urls>` | Host permission for all sites |

### Components
**Path**: `extension/manifest.json:33-56`

| Component | File | Purpose |
|-----------|------|---------|
| Background | `background.js` | Service worker (main logic) |
| Content Script | `content-script.js` | Injected into platform pages |
| Side Panel | `sidepanel.html` | Extension UI |
| Options | `settings/settings.html` | Settings page |

---

## 3. Background Service Worker

**Path**: `extension/background.js`  
**Size**: ~6000 lines (bundled)

### Configuration Loading
**Path**: `extension/background.js:12-80`

```javascript
const DEFAULT_CONFIG = {
  API_URL: 'https://leedz-api.onrender.com',
  WEB_URL: 'https://leedz.vercel.app',
  DEBUG_MODE: false,
  SHOW_SEARCH_WINDOW: false
};

async function loadLocalConfig() { ... }
```

### Storage Keys
**Path**: `extension/background.js:86-91`

```javascript
const STORAGE_KEYS = {
  AUTH_TOKEN: 'leedz_auth_token',
  USER: 'leedz_user',
  TENANT: 'leedz_tenant',
  PLATFORM_CONFIG: 'leedz_platform_config',
};
```

### Key Functions

| Function | Line | Purpose |
|----------|------|---------|
| `loadLocalConfig()` | :33-80 | Load config from files |
| `getStorageData()` | :115-119 | Chrome storage helper |
| `fetchPlatformConfig()` | :135-160 | Fetch config from API |
| `connectWebSocket()` | ~:200 | Connect to /agent namespace |
| `handleJobAvailable()` | ~:300 | Receive new job |
| `executeSearch()` | ~:400 | Execute search job |
| `submitEvidence()` | ~:500 | Send results to API |

---

## 4. Content Script

**Path**: `extension/content-script.js`  
**Size**: ~130 lines

### Injection Targets
**Path**: `extension/manifest.json:37-49`

```json
"content_scripts": [{
  "matches": [
    "http://localhost:*/*",
    "https://*.vercel.app/*",
    "https://*.leedz.app/*"
  ],
  "js": ["content-script.js"],
  "run_at": "document_end"
}]
```

### Platform Detection
The content script checks if it's on a known platform page and reports status.

---

## 5. Side Panel UI

**Path**: `extension/sidepanel.html` + `extension/sidepanel.js`

### HTML Structure

| Section | Purpose |
|---------|---------|
| Login Form | Email/password login |
| Status Display | Connection status |
| Job Progress | Current job progress |
| Recent Results | Last search results |

---

## 6. Search Engine (للتعطيل)

**Path**: `extension/search/`

### Files

| File | Path | Purpose |
|------|------|---------|
| **orchestrator.js** | `extension/search/orchestrator.js` | Coordinate multi-source search |
| **search-engine.js** | `extension/search/search-engine.js` | Main search logic |
| **google-search.js** | `extension/search/google-search.js` | Google Search scraper |
| **social-media.js** | `extension/search/social-media.js` | Social media search |
| **social-scraper.js** | `extension/search/social-scraper.js` | Platform-specific scrapers |

### Orchestrator Config
**Path**: `extension/search/orchestrator.js:16-34`

```javascript
const ORCHESTRATOR_CONFIG = {
  enableGoogleMaps: true,
  enableGoogleSearch: true,
  enableSocialMedia: false,
  googleSearchForSingle: true,
  googleSearchForBulk: false,
  enrichTopResults: 3,
  highConfidence: 80,
  mediumConfidence: 50,
};
```

---

## 7. Platform Login Detection

**Path**: `extension/background.js` (scattered)

### How It Works

1. **Content script** runs on platform pages
2. Checks for auth token in `localStorage`
3. Sends message to background: `{ type: 'AUTH_STATE', token, user }`
4. Background stores in `chrome.storage.local`
5. WebSocket connects with token

---

## 8. WebSocket Protocol

**Namespace**: `/agent`  
**Path**: `api/src/agent/agent.gateway.ts`

### Events (Client → Server)

| Event | Payload | Purpose |
|-------|---------|---------|
| `heartbeat` | `{ agentId }` | Keep alive |
| `job:ack` | `{ jobId, agentId }` | Acknowledge job |
| `job:progress` | `{ jobId, progress, message }` | Update progress |
| `job:evidence` | `{ jobId, evidence[] }` | Submit results |
| `job:done` | `{ jobId, output }` | Complete job |

### Events (Server → Client)

| Event | Payload | Purpose |
|-------|---------|---------|
| `config` | `{ platform, connectors }` | Send config on connect |
| `job:available` | `{ jobId, type, context }` | New job available |

---

## 9. Configuration Files

### config.production.js (in Git)
**Path**: `extension/config.production.js`

```javascript
const LEEDZ_CONFIG = {
  API_URL: 'https://leedz-api.onrender.com',
  WEB_URL: 'https://leedz.vercel.app',
  DEBUG_MODE: false,
  SHOW_SEARCH_WINDOW: false
};
```

### config.js (gitignored - local dev)
**Path**: `extension/config.js`

```javascript
const LEEDZ_CONFIG = {
  API_URL: 'http://localhost:3001',
  WEB_URL: 'http://localhost:3000',
  DEBUG_MODE: true,
  SHOW_SEARCH_WINDOW: false
};
```

---

## 10. What Can Be Reused for Social Ops

| Component | Reusable? | Notes |
|-----------|-----------|-------|
| Background service worker | ✅ Yes | Core structure, WebSocket |
| Side panel UI | ✅ Yes | Login, status display |
| Content script | ⚠️ Partial | Need new platform detection |
| WebSocket protocol | ✅ Yes | Same pattern for publishing jobs |
| Search engine | ❌ No | Replace with publishing engine |

### New Components Needed

1. **Platform Runners** - Instagram, Facebook, Twitter, etc.
2. **Publishing Orchestrator** - Coordinate multi-platform posting
3. **Proof Collector** - Screenshot/log collection
4. **Client Binding** - Associate extension with client account
