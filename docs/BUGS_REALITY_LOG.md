# Bugs Reality Log
> Generated: 2026-01-07 22:28 UTC+3
> Priority: P0 (Critical) → P3 (Low)

## Summary

| Priority | Count | Status |
|----------|-------|--------|
| P0 Critical | 1 | Open |
| P1 High | 2 | Open |
| P2 Medium | 3 | Open |
| P3 Low | 2 | Open |

---

## P0 - Critical (Blocking Core Functionality)

### BUG-001: Leads do not persist after page refresh
**Status:** 🔴 Open
**Reported:** 2026-01-07
**Component:** Database Schema + Frontend

**Description:**
When user searches for prospects in ProspectingPage, leads appear in the UI but disappear after page refresh.

**Root Cause:**
No `Lead` model exists in Prisma schema. Leads are stored in Zustand (browser memory) only.

**Evidence:**
```typescript
// web/pages/ProspectingPage.tsx:69-77
const mockLeads: Lead[] = [...];  // Hardcoded mock data
setLeads(mockLeads);  // Zustand only, not DB
```

```prisma
// api/prisma/schema.prisma
// NO Lead model exists!
```

**Reproduction:**
1. Login at http://localhost:3000
2. Go to "التنقيب" (Prospecting)
3. Enter keyword + city, click search
4. See leads appear
5. Press Ctrl+Shift+R
6. **Leads are gone**

**Fix Required:**
1. Add Lead model to schema
2. Create /leads API endpoints
3. Replace mock data with API calls

**Effort:** 4-5 hours

---

## P1 - High (Important for MVP)

### BUG-002: Lists do not persist
**Status:** 🔴 Open
**Component:** Database Schema + Frontend

**Description:**
Lists created in ListsPage disappear after refresh.

**Root Cause:**
No `List` model in Prisma schema.

**Evidence:**
```typescript
// web/store/useStore.ts:73
lists: [],  // Empty array, no persistence
```

**Reproduction:**
1. Go to Lists page
2. Create a list
3. Refresh page
4. List is gone

**Fix Required:**
Add List model + API + frontend integration

**Effort:** 3-4 hours

---

### BUG-003: Extension README has wrong port
**Status:** 🟡 Open (Documentation)
**Component:** Extension

**Description:**
README says port 8787 but API runs on 3001.

**Evidence:**
```markdown
// leedz_extension chrome/extension/README.md:6
http://localhost:8787/health  ← WRONG

// Actual:
http://localhost:3001/health  ← CORRECT
```

**Fix Required:**
Update README.md

**Effort:** 5 minutes

---

## P2 - Medium (Should Fix)

### BUG-004: Tailwind CSS uses CDN
**Status:** 🟡 Open
**Component:** Frontend Build

**Description:**
Tailwind is loaded via CDN script tag instead of PostCSS build.

**Evidence:**
```html
<!-- web/index.html:7-18 -->
<script src="https://cdn.tailwindcss.com"></script>
```

**Impact:**
- Console warning in production
- Slower initial load
- No tree-shaking

**Fix Required:**
Configure PostCSS properly, remove CDN

**Effort:** 1 hour

---

### BUG-005: Dashboard stats are hardcoded
**Status:** 🟡 Open
**Component:** Frontend

**Description:**
Dashboard shows fake numbers, not real data.

**Evidence:**
```typescript
// web/pages/DashboardPage.tsx:117
value={savedLeads.length + 1200}  // +1200 is hardcoded!
```

**Fix Required:**
Create /stats API endpoint, fetch real data

**Effort:** 2 hours

---

### BUG-006: ProtectedRoute doesn't verify token validity
**Status:** 🟡 Open
**Component:** Frontend Auth

**Description:**
ProtectedRoute only checks if token exists in localStorage, doesn't verify it's still valid.

**Evidence:**
```typescript
// web/components/ProtectedRoute.tsx:12
if (!isAuthenticated()) {  // Only checks localStorage
```

**Impact:**
Expired tokens stay "logged in" until API call fails.

**Fix Required:**
Call /auth/me on app load to verify token

**Effort:** 1 hour

---

## P3 - Low (Nice to Have)

### BUG-007: Search history is local only
**Status:** 🟢 Open
**Component:** Frontend

**Description:**
Search history in ProspectingPage doesn't persist.

**Evidence:**
```typescript
// web/pages/ProspectingPage.tsx:23-26
const [searchHistory, setSearchHistory] = useState([
  { query: 'مطاعم الرياض', date: 'منذ ساعتين', results: 15 },
  ...
]);  // Hardcoded, not persisted
```

**Fix Required:**
Store in localStorage or DB

**Effort:** 30 minutes

---

### BUG-008: Performance chart data is hardcoded
**Status:** 🟢 Open
**Component:** Frontend

**Description:**
Weekly performance chart shows static data.

**Evidence:**
```typescript
// web/pages/DashboardPage.tsx:52-59
{ label: 'السبت', value: 40, color: 'bg-blue-100' },
// All values are hardcoded
```

**Fix Required:**
Create analytics API

**Effort:** 3-4 hours

---

## Closed Bugs

| ID | Description | Fixed Date |
|----|-------------|------------|
| - | Login was mock (setTimeout) | 2026-01-07 |
| - | Extension port was 8787 in JS | 2026-01-07 |
| - | No ProtectedRoute | 2026-01-07 |
| - | Database tables missing | 2026-01-07 |
| - | Zustand had mock data arrays | 2026-01-07 |

---

## Bug Fix Priority Order

1. **BUG-001** - Lead persistence (P0, blocks core feature)
2. **BUG-002** - List persistence (P1, needed for organization)
3. **BUG-003** - Extension README (P1, quick fix)
4. **BUG-004** - Tailwind CDN (P2, production readiness)
5. **BUG-005** - Dashboard stats (P2, user experience)
6. **BUG-006** - Token verification (P2, security)
7. **BUG-007** - Search history (P3, convenience)
8. **BUG-008** - Performance chart (P3, analytics)
