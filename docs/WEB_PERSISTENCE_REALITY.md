# Web Persistence Reality Report
> Generated: 2026-01-07 22:15 UTC+3
> Purpose: Explain why "data disappears after Super Refresh"

## Executive Summary

**Root Cause Found:** Leads are stored in Zustand (browser memory) only, not in the database.

There is **NO Lead model** in the Prisma schema, therefore:
- Leads cannot be saved to Neon DB
- Leads exist only in browser memory (Zustand store)
- Refresh clears browser memory → Leads disappear

---

## Persistence Matrix

| Screen | What's Added | Calls API? | Stored in DB? | Survives Refresh? | Evidence |
|--------|--------------|------------|---------------|-------------------|----------|
| **Login** | Session | ✅ Yes | ✅ Token in localStorage | ✅ Yes | `web/lib/api.ts:111` |
| **Signup** | User | ✅ Yes | ✅ Yes (users table) | ✅ Yes | `POST /auth/signup` |
| **Prospecting** | Leads | ⚠️ Job only | ❌ No (Zustand only) | ❌ **No** | `web/pages/ProspectingPage.tsx:77` |
| **Leads Management** | savedLeads | ❌ No | ❌ No (Zustand only) | ❌ **No** | `web/store/useStore.ts:72` |
| **Dashboard** | Jobs list | ✅ Yes | ✅ Yes (jobs table) | ✅ Yes | `web/pages/DashboardPage.tsx:88` |
| **Lists** | Lists | ❌ No | ❌ No (Zustand only) | ❌ **No** | `web/store/useStore.ts:73` |

---

## Detailed Analysis

### 1. ProspectingPage - The Main Problem

**File:** `web/pages/ProspectingPage.tsx`

**What happens when user searches:**

```typescript
// Line 48: Creates real job in API ✅
const apiJob = await createJob('PROSPECT_SEARCH', { keyword, city });

// Lines 69-75: Creates MOCK leads (hardcoded data) ❌
const mockLeads: Lead[] = [
  { id: `${jobId}-1`, companyName: 'مؤسسة الحلول الذكية', ... },
  { id: `${jobId}-2`, companyName: 'مطعم مذاق الشرق', ... },
  ...
];

// Line 77: Stores in Zustand ONLY (not DB) ❌
setLeads(mockLeads);
```

**Result:**
- Job is saved to Neon DB ✅
- Leads are NOT saved to DB ❌
- Leads exist only in browser memory
- Refresh → Leads gone

### 2. Zustand Store - Memory Only

**File:** `web/store/useStore.ts`

```typescript
// Lines 70-73: Initial state is empty arrays
jobs: [],
leads: [],
savedLeads: [],
lists: [],
```

**No persistence mechanism:**
- No localStorage sync
- No API calls to save/load
- Pure in-memory state

### 3. What DOES Persist

| Data | Storage | Survives Refresh |
|------|---------|------------------|
| JWT Token | localStorage | ✅ Yes |
| User info | localStorage | ✅ Yes |
| Jobs | Neon DB | ✅ Yes |
| Users | Neon DB | ✅ Yes |
| Tenants | Neon DB | ✅ Yes |
| Leads | Zustand (memory) | ❌ No |
| Lists | Zustand (memory) | ❌ No |

---

## Database Schema Gap

**File:** `api/prisma/schema.prisma`

**Models that EXIST:**
- Tenant
- User
- Membership
- Invite
- Job
- JobLog
- Evidence
- AuditLog
- Plan

**Models that DON'T EXIST:**
- ❌ Lead
- ❌ List
- ❌ LeadList (junction table)

---

## The Fix Required

### Step 1: Add Lead Model to Schema

```prisma
model Lead {
  id           String     @id @default(uuid())
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
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
  createdById  String
  jobId        String?    // Link to search job that found it
  
  tenant       Tenant     @relation(fields: [tenantId], references: [id])
  createdBy    User       @relation(fields: [createdById], references: [id])
  job          Job?       @relation(fields: [jobId], references: [id])
  
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

### Step 2: Create API Endpoints

```
POST   /leads        - Create lead
GET    /leads        - List leads for tenant
GET    /leads/:id    - Get lead details
PATCH  /leads/:id    - Update lead
DELETE /leads/:id    - Delete lead
```

### Step 3: Update Frontend

Replace Zustand mock storage with real API calls.

---

## Reproduction Steps

1. Open http://localhost:3000
2. Login with `admin@optarget.com` / `Admin123!`
3. Go to "التنقيب" (Prospecting)
4. Enter keyword and city, click search
5. See leads appear in the table
6. Press Ctrl+Shift+R (Super Refresh)
7. **Leads are gone** ← This is the bug

---

## Conclusion

**The "data disappears after refresh" is NOT a bug - it's a missing feature.**

The Lead model was never implemented in the database. The frontend shows mock data that exists only in browser memory.

**To fix:** Implement Lead CRUD in backend + connect frontend to real API.
