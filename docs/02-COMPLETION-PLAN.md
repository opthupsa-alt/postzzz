# Leedz - خطة إكمال المشروع
> آخر تحديث: 2026-01-08

## 🎯 الهدف
تحويل المشروع من حالة التطوير إلى منتج جاهز للنشر والاستخدام العالمي.

---

## 📋 المهام المطلوبة

### 🔴 أولوية عالية (Critical)

#### 1. إصلاح Dashboard المستخدم العادي
**الملف**: `web/pages/DashboardPage.tsx`
**المشكلة**: الإحصائيات hardcoded وليست من API
**الحل**:
- [ ] إنشاء endpoint `/dashboard/stats` في Backend
- [ ] ربط Frontend بالـ API الحقيقي
- [ ] عرض إحصائيات حقيقية (leads, jobs, messages)

#### 2. ربط صفحة Team بالـ API
**الملف**: `web/pages/TeamPage.tsx`
**المشكلة**: تستخدم Zustand store بدلاً من API
**الحل**:
- [ ] استخدام `/users/team` API
- [ ] استخدام `/invites` لدعوة الأعضاء
- [ ] تحديث الأدوار عبر `/users/:id/role`

#### 3. ربط صفحة Settings بالـ API
**الملف**: `web/pages/SettingsPage.tsx`
**المشكلة**: تستخدم Zustand store
**الحل**:
- [ ] إنشاء `/users/me` endpoint لتحديث الملف الشخصي
- [ ] إنشاء `/users/me/password` لتغيير كلمة المرور
- [ ] ربط إعدادات التنبيهات بالـ API

#### 4. ربط Audit Logs بالـ API
**الملف**: `web/pages/AuditLogsPage.tsx`
**المشكلة**: بيانات وهمية
**الحل**:
- [ ] إنشاء `/audit-logs` endpoint
- [ ] ربط Frontend بالـ API

---

### 🟡 أولوية متوسطة (Important)

#### 5. تفعيل البحث الحقيقي (Prospecting)
**الملف**: `web/pages/ProspectingPage.tsx`
**المشكلة**: لا يوجد بحث حقيقي
**الحل**:
- [ ] تكامل مع Google Maps API أو مصدر بيانات
- [ ] تفعيل Agent system للبحث
- [ ] ربط النتائج بـ Jobs

#### 6. تكامل WhatsApp
**الملف**: `web/pages/WhatsAppMessagesPage.tsx`
**المشكلة**: UI فقط بدون backend
**الحل**:
- [ ] إنشاء WhatsApp module في Backend
- [ ] تكامل مع Meta WhatsApp Business API
- [ ] إرسال واستقبال الرسائل

#### 7. نظام التقارير
**الملفات**: `api/src/reports/`, `web/pages/LeadDetailPage.tsx`
**المشكلة**: Backend جاهز لكن Frontend يستخدم mock
**الحل**:
- [ ] ربط Frontend بـ `/reports` API
- [ ] تفعيل توليد التقارير

---

### 🟢 أولوية منخفضة (Nice to Have)

#### 8. نظام الإشعارات
- [ ] إنشاء Notifications module
- [ ] WebSocket للإشعارات الفورية
- [ ] Email notifications

#### 9. نظام الفوترة
- [ ] تكامل مع Stripe أو بوابة دفع
- [ ] إدارة الفواتير
- [ ] تجديد الاشتراكات

#### 10. Chrome Extension
- [ ] إكمال Extension Runner
- [ ] تكامل مع Agent system

---

## 📊 جدول التنفيذ

| المهمة | الوقت المقدر | الأولوية |
|--------|--------------|----------|
| Dashboard Stats API | 2 ساعات | 🔴 |
| Team Page Integration | 2 ساعات | 🔴 |
| Settings Page Integration | 2 ساعات | 🔴 |
| Audit Logs Integration | 1 ساعة | 🔴 |
| Prospecting Search | 8 ساعات | 🟡 |
| WhatsApp Integration | 16 ساعة | 🟡 |
| Reports Integration | 2 ساعات | 🟡 |
| Notifications | 8 ساعات | 🟢 |
| Billing | 16 ساعة | 🟢 |
| Extension | 24 ساعة | 🟢 |

---

## ✅ المهام المكتملة

- [x] Authentication (Login/Signup/JWT)
- [x] Multi-tenancy Architecture
- [x] Super Admin Panel
- [x] Admin Dashboard
- [x] Admin Tenants Management
- [x] Admin Users Management
- [x] Admin Plans Management
- [x] Admin Subscriptions Management
- [x] Admin Data Bank
- [x] Admin Settings
- [x] Leads CRUD
- [x] Lists CRUD
- [x] Jobs System
- [x] RBAC (Role-Based Access Control)
- [x] Permissions Guard

---

## 🚀 خطوات البدء الفوري

### الخطوة 1: Dashboard Stats
```typescript
// إنشاء endpoint جديد
GET /dashboard/stats
Response: {
  totalLeads: number,
  leadsThisWeek: number,
  totalJobs: number,
  jobsThisWeek: number,
  // ...
}
```

### الخطوة 2: ربط Team Page
```typescript
// استبدال useStore بـ API calls
const { data: team } = await getTeamMembers();
const invite = await createInvite({ email, role });
```

### الخطوة 3: ربط Settings
```typescript
// إنشاء endpoints
PATCH /users/me - تحديث الملف الشخصي
PATCH /users/me/password - تغيير كلمة المرور
```
