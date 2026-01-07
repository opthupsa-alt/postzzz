# 🎯 NEXT LOGICAL STEP - Leedz Project

> **تاريخ التحديث:** 2026-01-07
> **الغرض:** تحديد الخطوة المنطقية التالية وخطة 7 أيام

---

## 🤔 ما هي الخطوة المنطقية التالية؟

### الإجابة: **ربط Frontend بـ Backend API**

### لماذا؟

1. **Backend جاهز 100%** - كل الـ endpoints تعمل ومختبرة
2. **Frontend موجود لكن معزول** - UI جميل لكن لا يتصل بالـ API
3. **بدون هذا الربط، لا يمكن اختبار أي شيء حقيقي**
4. **Extension يعتمد على نفس الـ auth flow**

### ما الذي يجب إنجازه؟

| Task | Priority | Effort |
|------|----------|--------|
| 1. إنشاء API Client module | 🔴 P0 | 1h |
| 2. ربط LoginPage بـ POST /auth/login | 🔴 P0 | 2h |
| 3. إضافة Token Storage (localStorage) | 🔴 P0 | 1h |
| 4. إنشاء ProtectedRoute component | 🔴 P0 | 1h |
| 5. ربط Dashboard بـ GET /jobs | 🟠 P1 | 2h |

---

## 📅 خطة 7 أيام (Daily Plan)

### Day 1: Auth Foundation

**الهدف:** Login يعمل مع API حقيقي

| Task | Time | Deliverable |
|------|------|-------------|
| إنشاء `web/lib/api.ts` | 1h | API client with token handling |
| تعديل `LoginPage.tsx` | 2h | Real API call + error handling |
| إضافة localStorage للـ token | 30m | Token persists on refresh |
| اختبار Login flow | 30m | Login → Dashboard works |

**Definition of Done:**
- [ ] Login بـ email/password صحيح → Dashboard
- [ ] Login بـ email/password خاطئ → رسالة خطأ
- [ ] Refresh الصفحة → يبقى مسجل دخول

---

### Day 2: Protected Routes

**الهدف:** Routes محمية + Logout

| Task | Time | Deliverable |
|------|------|-------------|
| إنشاء `ProtectedRoute.tsx` | 1h | Auth guard component |
| تعديل `App.tsx` | 30m | Wrap /app/* routes |
| إضافة Logout button | 1h | Clear token + redirect |
| إنشاء `AuthContext` (optional) | 1h | Centralized auth state |

**Definition of Done:**
- [ ] زيارة /app/dashboard بدون token → redirect لـ /login
- [ ] Logout → يمسح token ويرجع لـ /login
- [ ] Token منتهي → redirect لـ /login

---

### Day 3: Dashboard Integration

**الهدف:** Dashboard يعرض بيانات حقيقية

| Task | Time | Deliverable |
|------|------|-------------|
| ربط GET /auth/me | 1h | User info in header |
| ربط GET /jobs | 2h | Jobs list from API |
| إزالة mock data من store | 1h | Clean store |

**Definition of Done:**
- [ ] Dashboard يعرض اسم المستخدم الحقيقي
- [ ] Jobs list تأتي من API
- [ ] Empty state إذا لا يوجد jobs

---

### Day 4: Jobs Creation

**الهدف:** إنشاء Job من الواجهة

| Task | Time | Deliverable |
|------|------|-------------|
| إنشاء Job creation form | 2h | Form UI |
| ربط POST /jobs | 1h | Create job API call |
| عرض Job في القائمة | 1h | Real-time update |

**Definition of Done:**
- [ ] إنشاء job → يظهر في القائمة
- [ ] Job status = PENDING

---

### Day 5: Extension Fix

**الهدف:** Extension يتصل بـ API الصحيح

| Task | Time | Deliverable |
|------|------|-------------|
| تصحيح API port (8787 → 3001) | 30m | Correct port |
| اختبار Login من Extension | 1h | Login works |
| اختبار Logout | 30m | Logout works |
| توثيق Extension loading | 1h | README updated |

**Definition of Done:**
- [ ] Extension login → token stored
- [ ] Extension logout → token cleared
- [ ] Extension يتصل بـ localhost:3001

---

### Day 6: Error Handling & Polish

**الهدف:** تجربة مستخدم سلسة

| Task | Time | Deliverable |
|------|------|-------------|
| Global error handler | 1h | Toast notifications |
| Loading states | 1h | Spinners/skeletons |
| 401 handling | 1h | Auto logout on 401 |
| Form validation | 1h | Client-side validation |

**Definition of Done:**
- [ ] API errors تظهر كـ toast
- [ ] Loading states واضحة
- [ ] 401 → auto logout

---

### Day 7: Testing & Documentation

**الهدف:** تأكيد كل شيء يعمل

| Task | Time | Deliverable |
|------|------|-------------|
| Full flow test | 2h | Manual testing |
| Update smoke-local.ps1 | 1h | Include web tests |
| Update LOCAL_RUNBOOK | 1h | Complete instructions |
| Git commit & cleanup | 1h | Clean history |

**Definition of Done:**
- [ ] Full auth flow works (signup → login → dashboard → logout)
- [ ] Jobs CRUD works
- [ ] Extension connects
- [ ] Documentation updated

---

## 🚦 Gates: متى نسمح بالنشر؟

### Gate 1: Local Stability ✅ (Current)
- [x] API يعمل محلياً
- [x] DB متصلة
- [x] Auth endpoints تعمل
- [ ] Frontend متصل بـ API ← **الخطوة التالية**

### Gate 2: Integration Complete
- [ ] Login/Logout يعمل من Web
- [ ] Login/Logout يعمل من Extension
- [ ] Jobs CRUD يعمل
- [ ] No 500 errors

### Gate 3: Production Ready
- [ ] Neon Dev Branch منفصل
- [ ] Environment variables documented
- [ ] Secrets not in Git
- [ ] Error handling complete

### Gate 4: Deploy Allowed
- [ ] All Gates 1-3 passed
- [ ] Smoke tests pass
- [ ] Manual QA complete
- [ ] Render/Vercel env configured

---

## ⚠️ Blockers الحالية

| Blocker | Impact | Resolution |
|---------|--------|------------|
| Frontend لا يتصل بـ API | 🔴 Critical | Day 1-2 tasks |
| Extension port خاطئ | 🟠 High | Day 5 task |
| Dev/Prod same DB | 🟡 Medium | Create Neon branch |

---

## 📊 Effort Summary

| Day | Focus | Hours |
|-----|-------|-------|
| 1 | Auth Foundation | 4h |
| 2 | Protected Routes | 3.5h |
| 3 | Dashboard Integration | 4h |
| 4 | Jobs Creation | 4h |
| 5 | Extension Fix | 3h |
| 6 | Error Handling | 4h |
| 7 | Testing & Docs | 5h |
| **Total** | | **27.5h** |

---

## 🎯 Success Criteria (End of Week)

1. ✅ User can signup from Web
2. ✅ User can login from Web
3. ✅ User can logout from Web
4. ✅ Dashboard shows real data
5. ✅ User can create a Job
6. ✅ Extension connects to API
7. ✅ No 500 errors anywhere
8. ✅ Documentation complete

---

> **آخر تحديث:** 2026-01-07
