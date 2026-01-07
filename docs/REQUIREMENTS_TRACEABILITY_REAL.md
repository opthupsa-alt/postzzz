# Requirements Traceability Matrix (Reality Version)
> Generated: 2026-01-07 22:22 UTC+3
> Based on actual code inspection and testing

## Architecture Requirements

| Requirement | Status | Evidence | Next Action |
|-------------|--------|----------|-------------|
| Runner/Agent = Chrome Extension | ✅ Configured | `leedz_extension chrome/extension/dist/` exists, `background.js` has API calls | Test with local API |
| Backend = Orchestrator | ✅ Implemented | `api/src/agent/agent.controller.ts` has job management endpoints | None |
| UI vendored inside Extension | ⏳ Planned | Extension has separate `panel.html`, not vendored from web | Decide: vendor or rebuild |
| No deployment now | ✅ Enforced | No Render/Vercel configs active | Maintain |
| Local-First development | ✅ Working | Backend on 3001, Frontend on 3000, Neon DB online | None |

## Core Feature Requirements

| Requirement | Schema | API | Frontend | Status | Evidence |
|-------------|--------|-----|----------|--------|----------|
| User Authentication | ✅ User model | ✅ /auth/* | ✅ LoginPage | ✅ Complete | `api/src/auth/` |
| User Registration | ✅ User model | ✅ /auth/signup | ✅ SignupPage | ✅ Complete | `web/pages/SignupPage.tsx` |
| Multi-tenant | ✅ Tenant, Membership | ✅ /tenants/* | ⚠️ Partial | ✅ Backend done | `api/src/tenants/` |
| Team Management | ✅ Membership | ✅ /users/team | ✅ TeamPage | ✅ Complete | `web/pages/TeamPage.tsx` |
| Team Invites | ✅ Invite model | ✅ /invites/* | ✅ TeamPage | ✅ Complete | `api/src/invites/` |
| Job Management | ✅ Job model | ✅ /jobs/* | ✅ Dashboard | ✅ Complete | `api/src/jobs/` |
| **Lead CRUD** | ❌ No model | ❌ No API | ⚠️ Mock only | ❌ **Gap** | Missing in schema |
| **List Management** | ❌ No model | ❌ No API | ⚠️ Mock only | ❌ **Gap** | Missing in schema |
| Lead Search (Prospecting) | ⚠️ Job only | ⚠️ Creates job | ⚠️ Mock results | ⚠️ Partial | `ProspectingPage.tsx:69` |
| WhatsApp Integration | ❌ No model | ❌ No API | ⚠️ UI only | ❌ Not started | Needs Meta API |
| Reports Generation | ❌ No model | ❌ No API | ⚠️ UI only | ❌ Not started | - |
| Audit Logging | ✅ AuditLog model | ⚠️ Partial | ✅ AuditLogsPage | ⚠️ Partial | `api/src/audit/` |

## Extension Requirements

| Requirement | Status | Evidence | Next Action |
|-------------|--------|----------|-------------|
| Extension connects to API | ✅ Configured | `background.js:1` → `localhost:3001` | Test manually |
| Extension has Side Panel | ✅ Exists | `panel.html`, `panel.js` | Test manually |
| Extension executes jobs | ⏳ Partial | Agent endpoints exist, no runner logic | Implement runner |
| Extension stores token | ✅ Implemented | `background.js` uses `chrome.storage.local` | None |
| Extension CORS allowed | ✅ Configured | `api/src/main.ts:29-31` | Add EXTENSION_ID to .env |

## Data Persistence Requirements

| Requirement | Status | Evidence | Next Action |
|-------------|--------|----------|-------------|
| Users persist | ✅ Yes | Stored in `users` table | None |
| Jobs persist | ✅ Yes | Stored in `jobs` table | None |
| Token persists | ✅ Yes | localStorage `leedz_token` | None |
| **Leads persist** | ❌ **No** | Zustand only, no DB table | **Add Lead model** |
| **Lists persist** | ❌ **No** | Zustand only, no DB table | **Add List model** |
| Search history | ❌ No | Zustand only | Low priority |

## Security Requirements

| Requirement | Status | Evidence | Next Action |
|-------------|--------|----------|-------------|
| JWT Authentication | ✅ Implemented | `api/src/auth/guards/jwt-auth.guard.ts` | None |
| Password hashing | ✅ Implemented | bcrypt in `auth.service.ts` | None |
| CORS protection | ✅ Configured | `api/src/main.ts:33-38` | None |
| Rate limiting | ✅ Configured | ThrottlerGuard in controllers | None |
| No secrets in Git | ✅ Verified | Only `.env.example` tracked | Maintain |
| RBAC (Role-based) | ✅ Implemented | 4 roles: OWNER, ADMIN, MANAGER, SALES | None |

## UI/UX Requirements

| Requirement | Status | Evidence | Next Action |
|-------------|--------|----------|-------------|
| Arabic RTL support | ✅ Implemented | All pages use Arabic text | None |
| Responsive design | ✅ Implemented | Tailwind responsive classes | None |
| Dashboard | ✅ Implemented | `DashboardPage.tsx` | Connect real stats |
| Prospecting page | ⚠️ Partial | UI done, data is mock | Connect to Lead API |
| Leads management | ⚠️ Partial | UI done, data is mock | Connect to Lead API |
| Lists page | ⚠️ Partial | UI done, data is mock | Connect to List API |
| Settings page | ✅ Implemented | `SettingsPage.tsx` | None |

## Priority Matrix

### P0 - Critical (Blocking core functionality)
| Item | Effort | Impact |
|------|--------|--------|
| Add Lead model + API | 3-4 hours | Enables lead persistence |
| Connect ProspectingPage to Lead API | 2 hours | Fixes "data disappears" |

### P1 - High (Important for MVP)
| Item | Effort | Impact |
|------|--------|--------|
| Add List model + API | 2-3 hours | Enables list organization |
| Connect LeadsManagementPage to API | 2 hours | Full lead management |

### P2 - Medium (Nice to have)
| Item | Effort | Impact |
|------|--------|--------|
| Fix Tailwind CDN | 1 hour | Better performance |
| Add token verification on load | 1 hour | Better security |
| Dashboard real stats | 2 hours | Accurate metrics |

### P3 - Low (Future)
| Item | Effort | Impact |
|------|--------|--------|
| WhatsApp integration | 1 week+ | Needs Meta API approval |
| Reports generation | 3-4 hours | PDF export |
| Extension runner | 1 week | Full automation |

## Conclusion

**Core infrastructure is complete.** The main gap is the Lead/List data layer.

Once Lead CRUD is implemented, the core MVP flow works:
`Search → Save Leads → Manage Leads → Export`
