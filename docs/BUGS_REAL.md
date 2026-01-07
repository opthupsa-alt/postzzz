# Bugs Report - Real Issues
> Prioritized list with reproduction steps and fix status

## Critical (P0) - None Found

All core functionality works.

---

## High Priority (P1)

### Bug #1: Extension README has wrong port
**Status:** 🟡 Documentation bug only
**File:** `leedz_extension chrome/extension/README.md`
**Line:** 6, 20

**Current (Wrong):**
```
http://localhost:8787/health
API Base: http://localhost:8787
```

**Should Be:**
```
http://localhost:3001/health
API Base: http://localhost:3001
```

**Impact:** Confuses developers
**Fix:** Update README

---

### Bug #2: No Lead model in Prisma schema
**Status:** 🔴 Feature gap
**File:** `api/prisma/schema.prisma`

**Reproduction:**
1. Try to save a lead from ProspectingPage
2. Lead is only stored in frontend state
3. Refresh → Lead disappears

**Impact:** Leads don't persist
**Fix:** Add Lead model to schema + API endpoints

---

## Medium Priority (P2)

### Bug #3: Dashboard stats are hardcoded
**Status:** 🟡 UI issue
**File:** `web/pages/DashboardPage.tsx`
**Line:** 117

**Current:**
```typescript
value={savedLeads.length + 1200}
```

**Impact:** Stats don't reflect real data
**Fix:** Create `/stats` API endpoint

---

### Bug #4: Tailwind CSS uses CDN
**Status:** 🟡 Performance issue
**File:** `web/index.html`
**Line:** 7-18

**Current:**
```html
<script src="https://cdn.tailwindcss.com"></script>
```

**Impact:** 
- Console warning in production
- Slower initial load
- No tree-shaking

**Fix:** Configure PostCSS properly

---

### Bug #5: ProtectedRoute doesn't verify token validity
**Status:** 🟡 Security improvement
**File:** `web/components/ProtectedRoute.tsx`
**Line:** 12

**Current:**
```typescript
if (!isAuthenticated()) { // Only checks localStorage
```

**Should:**
```typescript
// Call /auth/me to verify token is still valid
```

**Impact:** Expired tokens stay "logged in" until API call fails
**Fix:** Add token verification on app load

---

## Low Priority (P3)

### Bug #6: Search history in ProspectingPage is local only
**Status:** 🟢 Minor
**File:** `web/pages/ProspectingPage.tsx`
**Line:** 22-25

**Current:**
```typescript
const [searchHistory, setSearchHistory] = useState([
  { query: 'مطاعم الرياض', date: 'منذ ساعتين', results: 15 },
  { query: 'مقاولات جدة', date: 'أمس', results: 42 }
]);
```

**Impact:** Search history doesn't persist
**Fix:** Store in DB or localStorage

---

### Bug #7: Performance chart data is hardcoded
**Status:** 🟢 Minor
**File:** `web/pages/DashboardPage.tsx`
**Lines:** 52-59

**Impact:** Chart doesn't show real data
**Fix:** Create analytics API

---

## Fixed Bugs (Closed)

### ~~Bug: Login was mock (setTimeout)~~
**Status:** ✅ Fixed
**Evidence:** `web/pages/LoginPage.tsx` now calls real API

### ~~Bug: Extension port was 8787~~
**Status:** ✅ Fixed
**Evidence:** `background.js` and `panel.js` now use 3001

### ~~Bug: No ProtectedRoute~~
**Status:** ✅ Fixed
**Evidence:** `web/components/ProtectedRoute.tsx` exists

### ~~Bug: Database tables missing~~
**Status:** ✅ Fixed
**Evidence:** `prisma migrate status` shows "up to date"

### ~~Bug: Zustand had mock data~~
**Status:** ✅ Fixed
**Evidence:** `web/store/useStore.ts` starts with empty arrays

---

## Summary

| Priority | Count | Status |
|----------|-------|--------|
| P0 Critical | 0 | - |
| P1 High | 2 | 1 doc bug, 1 feature gap |
| P2 Medium | 3 | UI/Security improvements |
| P3 Low | 2 | Minor enhancements |
| Fixed | 5 | Closed |
