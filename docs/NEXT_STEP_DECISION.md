# Next Step Decision
> Updated: 2026-01-07 22:40 UTC+3
> Branch: `reality-audit-local-first`

## Current State Summary

✅ **Completed:**
- Backend API running locally (port 3001)
- Frontend Web running locally (port 3000)
- Database connected (Neon online)
- Auth flow working (signup, login, logout)
- Token persistence (localStorage)
- Jobs CRUD (create, list, view)
- Data persists after refresh

---

## Recommended Next Steps (Priority Order)

### Step 1: Add Lead Model to Database
**Priority:** P1 - High
**Effort:** 2-3 hours
**Why:** Core feature - leads don't persist currently

**Tasks:**
1. Add `Lead` model to `api/prisma/schema.prisma`
2. Create migration: `npx prisma migrate dev --name add_leads`
3. Create `api/src/leads/` module (controller, service)
4. Add API endpoints: GET, POST, PATCH, DELETE `/leads`
5. Update frontend to call real API

**Schema Draft:**
```prisma
model Lead {
  id           String   @id @default(uuid())
  tenantId     String
  companyName  String
  industry     String?
  city         String?
  phone        String?
  email        String?
  website      String?
  status       LeadStatus @default(NEW)
  source       String?
  notes        String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  createdById  String
  
  tenant       Tenant   @relation(fields: [tenantId], references: [id])
  createdBy    User     @relation(fields: [createdById], references: [id])
  
  @@index([tenantId, status])
  @@map("leads")
}

enum LeadStatus {
  NEW
  CONTACTED
  QUALIFIED
  PROPOSAL
  NEGOTIATION
  WON
  LOST
}
```

---

### Step 2: Add List Model
**Priority:** P2 - Medium
**Effort:** 2 hours
**Why:** Organize leads into lists

**Tasks:**
1. Add `List` and `LeadList` models
2. Create migration
3. Create API endpoints
4. Update frontend

---

### Step 3: Fix Tailwind CSS
**Priority:** P2 - Medium
**Effort:** 1 hour
**Why:** Remove CDN dependency

**Tasks:**
1. Fix PostCSS config
2. Remove CDN from index.html
3. Test all pages

---

### Step 4: Add Token Verification on Load
**Priority:** P2 - Medium
**Effort:** 1 hour
**Why:** Security improvement

**Tasks:**
1. Create `AuthProvider` context
2. Call `/auth/me` on app load
3. Redirect to login if token invalid

---

### Step 5: Extension Integration
**Priority:** P3 - Low (for now)
**Effort:** 4-6 hours
**Why:** Runner functionality

**Tasks:**
1. Update extension README
2. Test extension with local API
3. Implement job execution flow

---

## Decision Matrix

| Option | Pros | Cons |
|--------|------|------|
| **A: Add Leads first** | Core feature, high value | More complex |
| **B: Fix Tailwind first** | Quick win, cleaner code | Lower impact |
| **C: Extension first** | Full flow working | Complex, depends on leads |

**Recommendation:** Option A - Add Leads Model

---

## What NOT to Do Now

❌ Deploy to Render/Vercel
❌ Add WhatsApp integration (needs Meta API approval)
❌ Add billing/subscriptions
❌ Optimize performance

---

## Definition of "Feature Complete" for MVP

| Feature | Status | Required for MVP |
|---------|--------|------------------|
| Auth | ✅ Done | Yes |
| Jobs | ✅ Done | Yes |
| Leads CRUD | ❌ Missing | **Yes** |
| Lists | ❌ Missing | Nice to have |
| Dashboard Stats | ⚠️ Hardcoded | Nice to have |
| WhatsApp | ❌ Missing | Phase 2 |
| Extension Runner | ⚠️ Partial | Phase 2 |

---

## Conclusion

**Next logical step:** Add Lead model and API endpoints.

This will enable:
1. Saving leads from ProspectingPage
2. Viewing leads in LeadsManagementPage
3. Lead details persistence
4. Full CRUD operations

After leads are working, the core MVP flow is complete:
`Search → Find Leads → Save Leads → Manage Leads`
