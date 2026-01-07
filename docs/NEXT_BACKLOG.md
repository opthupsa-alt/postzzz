# 📋 Leedz Next Backlog

> **تاريخ التقرير:** 2026-01-07
> **الغرض:** 20 تذكرة مرتبة حسب الأولوية لإكمال المنتج

---

## 🎯 Priority Legend

| Priority | Meaning |
|----------|---------|
| 🔴 **P0** | Critical - يجب إنجازه قبل أي شيء آخر |
| 🟠 **P1** | High - مهم للـ MVP |
| 🟡 **P2** | Medium - مطلوب لكن يمكن تأجيله |
| 🟢 **P3** | Low - تحسينات مستقبلية |

---

## 📝 Backlog (20 Tasks)

### 🔴 P0 - Critical (Must Have for Local Dev)

| # | Task | Module | Effort | Dependencies |
|---|------|--------|--------|--------------|
| 1 | **Web Auth Integration** - Connect LoginPage.tsx to POST /auth/login, store token in localStorage/Zustand, redirect to Dashboard | Web | 4h | None |
| 2 | **Protected Routes** - Add auth guard to React Router, redirect unauthenticated users to /login | Web | 2h | #1 |
| 3 | **Logout Flow** - Clear token, redirect to login, add logout button to AppShell | Web | 1h | #1 |
| 4 | **API Error Handling** - Global error interceptor in Web, show toast notifications for 401/500 | Web | 2h | #1 |

---

### 🟠 P1 - High Priority (MVP Features)

| # | Task | Module | Effort | Dependencies |
|---|------|--------|--------|--------------|
| 5 | **Create Job API** - POST /jobs endpoint to create new prospecting jobs | API | 3h | None |
| 6 | **Job Creation UI** - Form to create job from Web (target, connectors, parameters) | Web | 4h | #5 |
| 7 | **Jobs List UI** - Display jobs in DashboardPage with status, progress, actions | Web | 3h | #5 |
| 8 | **Neon Branch for Dev** - Create separate Neon branch for local development to avoid polluting production data | Ops | 1h | None |
| 9 | **Invite Team Member** - Complete invite flow: send invite, accept invite, join tenant | API + Web | 6h | Email service |
| 10 | **Email Service Setup** - Configure SendGrid/SES for transactional emails (invites, password reset) | API | 3h | None |

---

### 🟡 P2 - Medium Priority (Complete Features)

| # | Task | Module | Effort | Dependencies |
|---|------|--------|--------|--------------|
| 11 | **Password Reset Flow** - Forgot password page, reset token, email, new password | API + Web | 4h | #10 |
| 12 | **User Profile Update** - Edit name, avatar, change password | API + Web | 3h | None |
| 13 | **Tenant Settings** - Edit tenant name, logo, settings | API + Web | 3h | None |
| 14 | **Audit Logs UI** - Display audit logs in AuditLogsPage with filters | Web | 3h | None |
| 15 | **Job Logs UI** - Display job execution logs with timeline | Web | 2h | #5 |

---

### 🟢 P3 - Low Priority (Extension & Integrations)

| # | Task | Module | Effort | Dependencies |
|---|------|--------|--------|--------------|
| 16 | **Chrome Extension Scaffold** - Create extension/ folder, manifest.json, basic popup | Extension | 4h | None |
| 17 | **WebSocket Gateway** - Real-time communication between API and Extension | API | 6h | #16 |
| 18 | **Google Maps Connector** - Implement google_maps connector in Extension | Extension | 8h | #16, #17 |
| 19 | **Evidence Viewer UI** - Display collected evidence with screenshots, text | Web | 4h | #18 |
| 20 | **Stripe Billing Integration** - Plans, subscriptions, payment processing | API + Web | 8h | None |

---

## 📊 Effort Summary

| Priority | Tasks | Total Effort |
|----------|-------|--------------|
| 🔴 P0 | 4 | 9 hours |
| 🟠 P1 | 6 | 20 hours |
| 🟡 P2 | 5 | 15 hours |
| 🟢 P3 | 5 | 30 hours |
| **Total** | **20** | **74 hours** |

---

## 🗓️ Suggested Sprint Plan

### Sprint 2 (Week 1-2): Web Auth & Jobs
- Tasks: #1, #2, #3, #4, #5, #6, #7
- Goal: Complete web authentication and basic job management

### Sprint 3 (Week 3-4): Team & Email
- Tasks: #8, #9, #10, #11, #12
- Goal: Team invites, email service, password reset

### Sprint 4 (Week 5-6): Extension Foundation
- Tasks: #13, #14, #15, #16, #17
- Goal: Chrome extension scaffold, WebSocket gateway

### Sprint 5 (Week 7-8): Connectors & Evidence
- Tasks: #18, #19
- Goal: First connector (Google Maps), evidence viewing

### Sprint 6 (Week 9-10): Billing & Polish
- Tasks: #20 + bug fixes + polish
- Goal: Stripe integration, production readiness

---

## 📌 Immediate Next Actions

1. **Start with Task #1** - Web Auth Integration is the foundation
2. **Create Neon Dev Branch** (Task #8) - Avoid polluting production data
3. **Test full auth flow** in browser after #1-#4 complete

---

## 🔗 Related Documents

- `CURRENT_STATE.md` - What works now
- `GAP_ANALYSIS.md` - Detailed module status
- `07-DEVELOPMENT-ROADMAP.md` - Original sprint plan
- `CONNECTION_GUIDE.md` - Infrastructure setup

---

> **Last Updated:** 2026-01-07
