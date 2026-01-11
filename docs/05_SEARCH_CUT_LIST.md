# 05_SEARCH_CUT_LIST.md - قائمة تعطيل البحث

> **Generated**: 2026-01-12  
> **Purpose**: Phase 1 - تعطيل البحث بدون حذف (Kill Switch)  
> **Feature Flag**: `searchDisabled` in PlatformSettings

---

## 1. Feature Flag Implementation

### Database Field
**Path**: `api/prisma/schema.prisma` - PlatformSettings model

```prisma
model PlatformSettings {
  // ... existing fields ...
  
  // Feature Flags
  searchDisabled    Boolean @default(false)  // ← ADD THIS
}
```

### API Endpoint
**Path**: `api/src/health/health.controller.ts`

```typescript
@Get('features')
async getFeatures() {
  const settings = await this.prisma.platformSettings.findFirst();
  return {
    searchDisabled: settings?.searchDisabled ?? false,
  };
}
```

---

## 2. Backend Files to Guard

### Jobs Service
**Path**: `api/src/jobs/jobs.service.ts:28-58`

**Action**: Check `searchDisabled` before creating search jobs

```typescript
// Add at start of create() method
const SEARCH_JOB_TYPES = ['SEARCH_SINGLE', 'SEARCH_BULK', 'google_maps', 'google_maps_search'];

async create(tenantId: string, userId: string, dto: CreateJobDto) {
  // Check if search is disabled
  if (SEARCH_JOB_TYPES.includes(dto.type)) {
    const settings = await this.prisma.platformSettings.findFirst();
    if (settings?.searchDisabled) {
      throw new ForbiddenException('Search feature is currently disabled');
    }
  }
  // ... rest of method
}
```

### Agent Service
**Path**: `api/src/agent/agent.service.ts:50-70`

**Action**: Return empty connectors if search disabled

```typescript
async getConfig() {
  const settings = await this.prisma.platformSettings.findFirst();
  
  return {
    platform: { ... },
    searchDisabled: settings?.searchDisabled ?? false,
    connectors: settings?.searchDisabled ? [] : [
      { id: 'google_maps', name: 'Google Maps', enabled: true },
      { id: 'google_search', name: 'Google Search', enabled: true },
    ],
  };
}
```

### Jobs Controller
**Path**: `api/src/jobs/jobs.controller.ts`

**Action**: Already handled by service

---

## 3. Frontend Files to Guard

### AppShell - Sidebar
**Path**: `web/components/AppShell.tsx:86-100`

**Action**: Hide "البحث عن عملاء" link

```typescript
// Fetch feature flags
const [searchDisabled, setSearchDisabled] = useState(false);

useEffect(() => {
  getFeatureFlags().then(flags => setSearchDisabled(flags.searchDisabled));
}, []);

// In sidebar links, conditionally render
{!searchDisabled && (
  <SidebarLink to="/app/prospecting" icon={Search} label="البحث عن عملاء" />
)}
```

### AppShell - Command Palette
**Path**: `web/components/AppShell.tsx:86-100`

**Action**: Hide search option in command palette

```typescript
const suggestions = [
  !searchDisabled && { label: 'البحث عن عملاء جدد', icon: Search, path: '/app/prospecting' },
  { label: 'عرض القوائم الذكية', icon: ListTodo, path: '/app/lists' },
  // ...
].filter(Boolean);
```

### ProspectingPage
**Path**: `web/pages/ProspectingPage.tsx`

**Action**: Add route guard or redirect

```typescript
// Option 1: Create SearchGuard component
const SearchGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [searchDisabled, setSearchDisabled] = useState<boolean | null>(null);
  
  useEffect(() => {
    getFeatureFlags().then(flags => setSearchDisabled(flags.searchDisabled));
  }, []);
  
  if (searchDisabled === null) return <Loading />;
  if (searchDisabled) return <Navigate to="/app/dashboard" replace />;
  
  return <>{children}</>;
};

// Option 2: In App.tsx, wrap route
<Route path="prospecting" element={
  <SearchGuard>
    <ProspectingPage />
  </SearchGuard>
} />
```

### API Client
**Path**: `web/lib/api.ts`

**Action**: Add feature flags function

```typescript
export interface FeatureFlags {
  searchDisabled: boolean;
}

export async function getFeatureFlags(): Promise<FeatureFlags> {
  const response = await fetch(`${API_BASE_URL}/health/features`);
  return response.json();
}
```

---

## 4. Extension Files to Guard

### Background.js
**Path**: `extension/background.js`

**Action**: Check config before executing search

```javascript
// In job handler
async function handleJobAvailable(job) {
  // Check if search is disabled
  if (platformConfig.searchDisabled) {
    console.log('[Leedz] Search is disabled, ignoring job');
    return;
  }
  
  // ... rest of handler
}
```

### Config Response
The API already returns `searchDisabled` in config, extension should respect it.

---

## 5. Files to Keep (No Changes)

These files contain search logic but should NOT be deleted yet:

### Extension Search Engine
| File | Path | Reason to Keep |
|------|------|----------------|
| orchestrator.js | `extension/search/orchestrator.js` | May reuse patterns |
| search-engine.js | `extension/search/search-engine.js` | Reference for publishing |
| google-search.js | `extension/search/google-search.js` | Reference |
| social-media.js | `extension/search/social-media.js` | May reuse for Social Ops |
| social-scraper.js | `extension/search/social-scraper.js` | May reuse for Social Ops |

### API Modules
| Module | Path | Reason to Keep |
|--------|------|----------------|
| SearchHistoryModule | `api/src/search-history/` | Historical data |
| JobsModule | `api/src/jobs/` | Reuse for publishing |
| AgentModule | `api/src/agent/` | Reuse for publishing |

### Database Tables
| Table | Reason to Keep |
|-------|----------------|
| Job | Reuse for publishing jobs |
| Evidence | Historical data |
| JobLog | Historical data |
| SearchHistory | Historical data |
| ExtensionSettings | Reuse for Social Ops settings |

---

## 6. Files to Delete Later (Phase 5+)

After Social Ops is complete and stable:

### Extension
- [ ] `extension/search/orchestrator.js`
- [ ] `extension/search/search-engine.js`
- [ ] `extension/search/google-search.js`
- [ ] `extension/search/social-media.js` (if not reused)
- [ ] `extension/search/social-scraper.js` (if not reused)

### API
- [ ] `api/src/search-history/` module (deprecate, keep data)

### Web
- [ ] `web/pages/ProspectingPage.tsx`

---

## 7. Implementation Checklist

### Phase 1A: Add Feature Flag
- [ ] Add `searchDisabled` to PlatformSettings schema
- [ ] Run `prisma db push`
- [ ] Add `/health/features` endpoint

### Phase 1B: Backend Guards
- [ ] Guard `JobsService.create()` for search job types
- [ ] Update `AgentService.getConfig()` to include flag
- [ ] Return empty connectors if disabled

### Phase 1C: Frontend Guards
- [ ] Add `getFeatureFlags()` to API client
- [ ] Hide Prospecting link in sidebar
- [ ] Hide search option in command palette
- [ ] Add SearchGuard component
- [ ] Wrap ProspectingPage route

### Phase 1D: Extension Guards
- [ ] Check `searchDisabled` in config
- [ ] Skip search jobs if disabled

### Phase 1E: Enable Flag
- [ ] Set `searchDisabled = true` in PlatformSettings
- [ ] Verify all guards work

---

## 8. Testing Checklist

After implementation:

- [ ] `/health/features` returns `{ searchDisabled: true }`
- [ ] Creating search job returns 403 Forbidden
- [ ] Sidebar doesn't show "البحث عن عملاء"
- [ ] Command palette doesn't show search option
- [ ] Navigating to `/app/prospecting` redirects to dashboard
- [ ] Extension doesn't execute search jobs
- [ ] Existing leads/data still accessible
- [ ] Other features work normally

---

## 9. Rollback Plan

If issues occur:

1. Set `searchDisabled = false` in database
2. All guards will allow search again
3. No code changes needed for rollback
