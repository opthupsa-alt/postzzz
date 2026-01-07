# Next Step Plan (7-Day Roadmap)
> Generated: 2026-01-07 22:30 UTC+3
> Status: PENDING USER APPROVAL

## ⚠️ Important
**Do NOT execute this plan until user approves.**

---

## Week Overview

| Day | Focus | Deliverable |
|-----|-------|-------------|
| 1 | Lead Model + API | `/leads` CRUD working |
| 2 | Frontend Integration | ProspectingPage saves to DB |
| 3 | List Model + API | `/lists` CRUD working |
| 4 | Frontend Lists | ListsPage saves to DB |
| 5 | Polish & Fixes | Tailwind, token verification |
| 6 | Extension Testing | Verify extension works locally |
| 7 | Documentation + Review | Final testing, cleanup |

---

## Day 1: Lead Model + API

### Tasks

1. **Add Lead model to Prisma schema**
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
     jobId        String?
     createdAt    DateTime   @default(now())
     updatedAt    DateTime   @updatedAt
     createdById  String
     
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

2. **Run migration**
   ```bash
   cd api
   npx prisma migrate dev --name add_leads
   ```

3. **Create Leads module**
   - `api/src/leads/leads.module.ts`
   - `api/src/leads/leads.controller.ts`
   - `api/src/leads/leads.service.ts`
   - `api/src/leads/dto/create-lead.dto.ts`
   - `api/src/leads/dto/update-lead.dto.ts`

4. **Implement endpoints**
   - `POST /leads` - Create lead
   - `GET /leads` - List leads (with filters)
   - `GET /leads/:id` - Get lead details
   - `PATCH /leads/:id` - Update lead
   - `DELETE /leads/:id` - Delete lead
   - `POST /leads/bulk` - Bulk create leads

5. **Test with curl/Postman**

### Success Criteria
- [ ] `POST /leads` returns 201
- [ ] `GET /leads` returns array
- [ ] Lead appears in Prisma Studio

---

## Day 2: Frontend Lead Integration

### Tasks

1. **Add Lead API functions to `web/lib/api.ts`**
   ```typescript
   export async function getLeads(): Promise<Lead[]>
   export async function createLead(data: CreateLeadDto): Promise<Lead>
   export async function updateLead(id: string, data: Partial<Lead>): Promise<Lead>
   export async function deleteLead(id: string): Promise<void>
   export async function bulkCreateLeads(leads: CreateLeadDto[]): Promise<Lead[]>
   ```

2. **Update ProspectingPage**
   - Replace mock leads with API call
   - Save leads to DB after search completes
   - Load leads from API on page load

3. **Update LeadsManagementPage**
   - Fetch leads from API
   - Delete leads via API
   - Update lead status via API

4. **Test full flow**
   - Search → Leads appear
   - Refresh → Leads still there
   - Delete → Lead removed

### Success Criteria
- [ ] Leads persist after refresh
- [ ] CRUD operations work from UI

---

## Day 3: List Model + API

### Tasks

1. **Add List model to schema**
   ```prisma
   model List {
     id          String     @id @default(uuid())
     tenantId    String
     name        String
     description String?
     color       String?
     createdAt   DateTime   @default(now())
     updatedAt   DateTime   @updatedAt
     createdById String
     
     tenant      Tenant     @relation(fields: [tenantId], references: [id])
     createdBy   User       @relation(fields: [createdById], references: [id])
     leads       LeadList[]
     
     @@index([tenantId])
     @@map("lists")
   }
   
   model LeadList {
     id        String   @id @default(uuid())
     leadId    String
     listId    String
     addedAt   DateTime @default(now())
     
     lead      Lead     @relation(fields: [leadId], references: [id], onDelete: Cascade)
     list      List     @relation(fields: [listId], references: [id], onDelete: Cascade)
     
     @@unique([leadId, listId])
     @@map("lead_lists")
   }
   ```

2. **Run migration**

3. **Create Lists module**

4. **Implement endpoints**
   - `POST /lists` - Create list
   - `GET /lists` - List all lists
   - `PATCH /lists/:id` - Update list
   - `DELETE /lists/:id` - Delete list
   - `POST /lists/:id/leads` - Add leads to list
   - `DELETE /lists/:id/leads` - Remove leads from list

### Success Criteria
- [ ] Lists CRUD works
- [ ] Can add/remove leads from lists

---

## Day 4: Frontend List Integration

### Tasks

1. **Add List API functions**
2. **Update ListsPage**
3. **Update ListDetailPage**
4. **Test full flow**

### Success Criteria
- [ ] Lists persist after refresh
- [ ] Can manage leads in lists

---

## Day 5: Polish & Fixes

### Tasks

1. **Fix Tailwind CSS**
   - Configure PostCSS properly
   - Remove CDN from index.html
   - Test all pages

2. **Add token verification**
   - Create AuthProvider context
   - Call /auth/me on app load
   - Redirect to login if invalid

3. **Fix Extension README**
   - Update port to 3001

4. **Dashboard real stats**
   - Create /stats endpoint
   - Fetch real data

### Success Criteria
- [ ] No Tailwind CDN warning
- [ ] Token verified on load
- [ ] Dashboard shows real numbers

---

## Day 6: Extension Testing

### Tasks

1. **Load extension in Chrome**
2. **Test login via extension**
3. **Test job creation**
4. **Document any issues**

### Success Criteria
- [ ] Extension connects to local API
- [ ] Can login via extension
- [ ] Jobs appear in dashboard

---

## Day 7: Documentation + Review

### Tasks

1. **Update all docs**
2. **Final testing checklist**
3. **Clean up code**
4. **Prepare for next phase**

### Success Criteria
- [ ] All docs accurate
- [ ] No console errors
- [ ] Ready for next sprint

---

## Decisions Required

### What to Complete Now
1. Lead model + API (P0)
2. List model + API (P1)
3. Frontend integration (P0)

### What to Defer
1. WhatsApp integration (needs Meta API)
2. Reports generation (after leads work)
3. Extension runner logic (after core works)
4. Deployment (explicitly blocked)

### What to Cancel
1. Any cloud deployment
2. Any external API integrations
3. Any paid service setup

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Schema migration fails | Test on dev branch first |
| API breaks existing features | Run smoke tests after changes |
| Frontend breaks | Keep backup of working state |

---

## Approval Required

**Please confirm before I proceed with Day 1 tasks.**

Options:
- ✅ "Proceed with Day 1" - Start implementing Lead model
- 🔄 "Modify plan" - Adjust priorities
- ⏸️ "Hold" - Wait for further instructions
