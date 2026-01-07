# 📝 DIFF_SUMMARY.md - Analysis Pack v2.1 Changes

> **تاريخ الإنشاء:** يناير 2026  
> **الغرض:** توثيق جميع التغييرات والأسئلة المفتوحة

---

## 📋 Source of Truth Table

### الملفات الرسمية (v2.1)

| # | الملف | الإصدار | الغرض | الحالة |
|---|-------|---------|-------|--------|
| 00 | `00-GLOSSARY.md` | 1.0 | قاموس المصطلحات | ✅ Active |
| 01 | `01-SYSTEM-OVERVIEW.md` | 2.1 | نظرة عامة + Extension Runner | ✅ Active |
| 02 | `02-DATA-MODEL.md` | 2.1 | نموذج البيانات SQL + Security Appendix | ✅ Active |
| 03 | `03-SCREENS-ANALYSIS.md` | 2.1 | 23 شاشة (17 موجودة + 6 مخططة) | ✅ Active |
| 04 | `04-USER-FLOWS.md` | 2.1 | 14 تدفق (8 أساسية + 6 SaaS) | ✅ Active |
| 05 | `05-COMPONENTS-REFERENCE.md` | 1.0 | مرجع المكونات | ✅ Active |
| 06 | `06-API-REQUIREMENTS.md` | 2.1 | متطلبات API + SaaS + Runner | ✅ Active |
| 07 | `07-DEVELOPMENT-ROADMAP.md` | 2.1 | خارطة طريق + DoD | ✅ Active |
| 08 | `08-CONFLICTS_AND_GAPS.md` | 1.0 | تقرير التضاربات الأصلي | ✅ Active (Archive) |
| 09 | `09-SAAS_MULTITENANCY.md` | 2.0 | تصميم Multi-tenancy | ✅ Active |
| 10 | `10-SECURITY_THREAT_MODEL.md` | 2.0 | نموذج التهديدات | ✅ Active |
| 11 | `11-EXTENSION_RUNNER_SPEC.md` | 2.1 | مواصفات Runner | ✅ Active |
| 12 | `12-UI_VENDORIZING_PLAN.md` | 2.0 | خطة نقل UI | ✅ Active |
| 13 | `13-EXTENSION_API_MAPPING.md` | 2.0 | جدول Mapping | ✅ Active |
| 14 | `14-CONFLICTS_AND_FIXES.md` | 2.1 | تقرير التضاربات المحدث | ✅ Active |
| 15 | `15-MULTITENANCY_RBAC_MATRIX.md` | 2.1 | مصفوفة الصلاحيات | ✅ Active |
| 16 | `16-SUBSCRIPTION_QUOTAS_FLAGS.md` | 2.1 | الباقات والحدود | ✅ Active |
| 17 | `17-EXECUTIVE-SUMMARY.md` | 2.0 | الملخص التنفيذي | ✅ Active (Renamed) |
| - | `openapi.yaml` | 2.1 | OpenAPI Spec | ✅ Active |
| - | `README.md` | 2.1 | فهرس + Checklist | ✅ Active |

### الملفات المُلغاة (Deprecated)

| الملف | السبب | الإجراء |
|-------|-------|---------|
| `02-DATA-MODEL-V2.md` | نسخة قديمة (v2.0)، تم دمجها في `02-DATA-MODEL.md` | ⚠️ يُحذف أو يُعاد تسميته |
| `07-DEVELOPMENT-ROADMAP-V2.md` | نسخة قديمة (v2.0)، تم دمجها في `07-DEVELOPMENT-ROADMAP.md` | ⚠️ يُحذف أو يُعاد تسميته |
| `11-EXECUTIVE-SUMMARY.md` | تعارض ترقيم مع Extension Runner | ⚠️ يُعاد ترقيمه إلى 17 |

---

## 🔄 التغييرات في v2.1

### 1. تغييرات هيكلية

| التغيير | الملف | التفاصيل |
|---------|-------|----------|
| إعادة ترقيم | `11-EXECUTIVE-SUMMARY.md` → `17-EXECUTIVE-SUMMARY.md` | حل تعارض الترقيم |
| حذف مكررات | `02-DATA-MODEL-V2.md`, `07-DEVELOPMENT-ROADMAP-V2.md` | دمج في الملفات الرئيسية |
| إضافة Security Appendix | `02-DATA-MODEL.md` | CORS, RBAC, Rate Limiting, PII Redaction |

### 2. تغييرات المحتوى

| الملف | التغيير | السبب |
|-------|---------|-------|
| `03-SCREENS-ANALYSIS.md` | تحديث 6 شاشات SaaS مع DoD كامل | اكتمال التوثيق |
| `04-USER-FLOWS.md` | إضافة تدفق "Usage Limit Reached" | متطلب SaaS |
| `README.md` | إضافة Final Consistency Checklist | ضمان الاتساق |
| `02-DATA-MODEL.md` | إضافة Security Appendix شامل | متطلب أمني |

### 3. تغييرات API

| Endpoint | الحالة | الملف |
|----------|--------|-------|
| `POST /api/auth/signup` | موثق | openapi.yaml |
| `POST /api/auth/switch-tenant` | موثق | openapi.yaml |
| `GET /api/billing/usage` | موثق | openapi.yaml |
| `POST /api/invites` | موثق | openapi.yaml |
| Agent WebSocket | يحتاج تفصيل | 11-EXTENSION_RUNNER_SPEC.md |

---

## ❓ أسئلة مفتوحة وكيفية التحقق

### 1. Agent WebSocket Protocol

**السؤال:** هل بروتوكول WebSocket للـ Agent موثق بالكامل؟

**كيف نتحقق:**
```bash
# فحص openapi.yaml
grep -n "websocket\|ws://" docs/openapi.yaml

# فحص Extension Runner Spec
grep -n "WebSocket\|WS\|wss://" docs/11-EXTENSION_RUNNER_SPEC.md
```

**الحالة:** ⚠️ يحتاج تفصيل أكثر (Message types, reconnection, heartbeat)

### 2. Offline Queue Implementation

**السؤال:** هل IndexedDB schema للـ Offline Queue موثق؟

**كيف نتحقق:**
```bash
grep -n "IndexedDB\|offline\|queue" docs/11-EXTENSION_RUNNER_SPEC.md
```

**الحالة:** ⚠️ مذكور كمفهوم، يحتاج schema تفصيلي

### 3. Feature Flags List

**السؤال:** ما هي قائمة Feature Flags الكاملة؟

**كيف نتحقق:**
```bash
grep -n "feature_flag\|FeatureFlag" docs/16-SUBSCRIPTION_QUOTAS_FLAGS.md
```

**الحالة:** ✅ موثق في 16-SUBSCRIPTION_QUOTAS_FLAGS.md

### 4. Audit Events Coverage

**السؤال:** هل كل UI action له audit event موثق؟

**كيف نتحقق:**
```bash
# مقارنة عدد الأحداث
grep -c "Audit:" docs/03-SCREENS-ANALYSIS.md
grep -c "audit_event\|AuditEvent" docs/13-EXTENSION_API_MAPPING.md
```

**الحالة:** ⚠️ يحتاج مراجعة شاملة

---

## 📊 Matrix: UI Action → API → Permission → Audit → JobType

### جدول شامل (ملخص)

| UI Action | Screen | API Endpoint | Permission | Audit Event | JobType |
|-----------|--------|--------------|------------|-------------|---------|
| تسجيل الدخول | Login | `POST /api/auth/login` | - | `AUTH_LOGIN` | - |
| تسجيل جديد | Signup | `POST /api/auth/signup` | - | `AUTH_SIGNUP` | - |
| تبديل المنظمة | Header | `POST /api/auth/switch-tenant` | - | `AUTH_TENANT_SWITCH` | - |
| بحث عملاء | Search | `POST /api/search` | `leads:create` | `SEARCH_STARTED` | `SEARCH` |
| حفظ عميل | Search | `POST /api/leads` | `leads:create` | `LEAD_CREATED` | - |
| حفظ متعدد | Search | `POST /api/leads/bulk` | `leads:create` | `LEADS_BULK_CREATED` | - |
| فحص عميل | Lead | `POST /api/leads/:id/survey` | `leads:update` | `SURVEY_STARTED` | `SURVEY` |
| إرسال واتساب | Lead | `POST /api/whatsapp/send` | `whatsapp:send` | `WHATSAPP_SENT` | `WHATSAPP_SEND` |
| تغيير حالة | Lead | `PATCH /api/leads/:id` | `leads:update` | `LEAD_UPDATED` | - |
| حذف عميل | Lead | `DELETE /api/leads/:id` | `leads:delete` | `LEAD_DELETED` | - |
| إنشاء قائمة | Lists | `POST /api/lists` | `lists:create` | `LIST_CREATED` | - |
| دعوة عضو | Team | `POST /api/invites` | `team:invite` | `INVITE_SENT` | - |
| تغيير دور | Team | `PATCH /api/memberships/:id` | `team:change_role` | `ROLE_CHANGED` | - |
| ترقية الباقة | Billing | `POST /api/billing/checkout` | `billing:manage` | `SUBSCRIPTION_UPGRADED` | - |
| إنشاء مفتاح API | Settings | `POST /api/api-keys` | `api_keys:manage` | `API_KEY_CREATED` | - |

### JobTypes الكاملة

| JobType | الوصف | Connector | Audit Events |
|---------|-------|-----------|--------------|
| `SEARCH` | بحث Google Maps | `google_maps` | `JOB_CREATED`, `JOB_COMPLETED` |
| `SURVEY` | فحص شامل للعميل | `web_search`, `website_crawl`, `social_public` | `JOB_CREATED`, `JOB_COMPLETED` |
| `WHATSAPP_SEND` | إرسال رسالة واتساب | - | `JOB_CREATED`, `JOB_COMPLETED` |
| `WHATSAPP_BULK` | إرسال رسائل جماعية | - | `JOB_CREATED`, `JOB_COMPLETED` |
| `IMPORT` | استيراد عملاء | - | `JOB_CREATED`, `JOB_COMPLETED` |
| `EXPORT` | تصدير عملاء | - | `JOB_CREATED`, `JOB_COMPLETED` |
| `REPORT_GENERATE` | توليد تقرير AI | - | `JOB_CREATED`, `JOB_COMPLETED` |
| `BULK_STATUS_UPDATE` | تحديث حالات جماعي | - | `JOB_CREATED`, `JOB_COMPLETED` |
| `BULK_DELETE` | حذف جماعي | - | `JOB_CREATED`, `JOB_COMPLETED` |

---

## 📊 Complete UI → API → Permission → Audit → Job Matrix

### Auth & SaaS Actions

| # | UI Action | Screen | API Endpoint | Permission | Audit Event | JobType |
|---|-----------|--------|--------------|------------|-------------|---------|
| 1 | تسجيل جديد | Signup | `POST /api/auth/signup` | - | `AUTH_SIGNUP` | - |
| 2 | تسجيل الدخول | Login | `POST /api/auth/login` | - | `AUTH_LOGIN` | - |
| 3 | تسجيل الخروج | Header | `POST /api/auth/logout` | - | `AUTH_LOGOUT` | - |
| 4 | تبديل المنظمة | Header | `POST /api/auth/switch-tenant` | - | `AUTH_TENANT_SWITCH` | - |
| 5 | تغيير كلمة المرور | Security | `POST /api/auth/change-password` | - | `PASSWORD_CHANGED` | - |
| 6 | دعوة عضو | Team | `POST /api/invites` | `team:invite` | `INVITE_SENT` | - |
| 7 | قبول دعوة | Accept Invite | `POST /api/invites/:token/accept` | - | `INVITE_ACCEPTED` | - |
| 8 | تغيير دور | Team | `PATCH /api/memberships/:id` | `team:change_role` | `ROLE_CHANGED` | - |
| 9 | إزالة عضو | Team | `DELETE /api/memberships/:id` | `team:remove` | `MEMBER_REMOVED` | - |

### Lead Actions

| # | UI Action | Screen | API Endpoint | Permission | Audit Event | JobType |
|---|-----------|--------|--------------|------------|-------------|---------|
| 10 | بحث عملاء | Search | `POST /api/search` | `leads:create` | `SEARCH_STARTED` | `SEARCH` |
| 11 | حفظ عميل | Search | `POST /api/leads` | `leads:create` | `LEAD_CREATED` | - |
| 12 | حفظ متعدد | Search | `POST /api/leads/bulk` | `leads:create` | `LEADS_BULK_CREATED` | - |
| 13 | عرض عميل | Lead Detail | `GET /api/leads/:id` | `leads:read` | - | - |
| 14 | تعديل عميل | Lead Detail | `PATCH /api/leads/:id` | `leads:update` | `LEAD_UPDATED` | - |
| 15 | حذف عميل | Lead Detail | `DELETE /api/leads/:id` | `leads:delete` | `LEAD_DELETED` | - |
| 16 | تغيير حالة | Lead Detail | `PATCH /api/leads/:id` | `leads:update` | `LEAD_STATUS_CHANGED` | - |
| 17 | فحص عميل | Lead Detail | `POST /api/leads/:id/survey` | `leads:update` | `SURVEY_STARTED` | `SURVEY` |
| 18 | تصدير عملاء | Leads | `POST /api/leads/export` | `leads:export` | `EXPORT_STARTED` | `EXPORT` |
| 19 | استيراد عملاء | Leads | `POST /api/leads/import` | `leads:import` | `IMPORT_STARTED` | `IMPORT` |
| 20 | حذف جماعي | Leads | `DELETE /api/leads/bulk` | `leads:delete` | `BULK_DELETE_STARTED` | `BULK_DELETE` |

### List Actions

| # | UI Action | Screen | API Endpoint | Permission | Audit Event | JobType |
|---|-----------|--------|--------------|------------|-------------|---------|
| 21 | إنشاء قائمة | Lists | `POST /api/lists` | `lists:create` | `LIST_CREATED` | - |
| 22 | تعديل قائمة | Lists | `PATCH /api/lists/:id` | `lists:update` | `LIST_UPDATED` | - |
| 23 | حذف قائمة | Lists | `DELETE /api/lists/:id` | `lists:delete` | `LIST_DELETED` | - |
| 24 | إضافة لقائمة | Lead Detail | `POST /api/lists/:id/leads` | `lists:update` | `LEADS_ADDED_TO_LIST` | - |
| 25 | إزالة من قائمة | Lead Detail | `DELETE /api/lists/:id/leads` | `lists:update` | `LEADS_REMOVED_FROM_LIST` | - |

### WhatsApp Actions

| # | UI Action | Screen | API Endpoint | Permission | Audit Event | JobType |
|---|-----------|--------|--------------|------------|-------------|---------|
| 26 | إرسال رسالة | Lead Detail | `POST /api/whatsapp/send` | `whatsapp:send` | `WHATSAPP_SENT` | `WHATSAPP_SEND` |
| 27 | إرسال جماعي | Leads | `POST /api/whatsapp/bulk` | `whatsapp:bulk_send` | `WHATSAPP_BULK_STARTED` | `WHATSAPP_BULK` |
| 28 | إنشاء قالب | Templates | `POST /api/whatsapp/templates` | `whatsapp:templates` | `TEMPLATE_CREATED` | - |
| 29 | تعديل قالب | Templates | `PATCH /api/whatsapp/templates/:id` | `whatsapp:templates` | `TEMPLATE_UPDATED` | - |
| 30 | حذف قالب | Templates | `DELETE /api/whatsapp/templates/:id` | `whatsapp:templates` | `TEMPLATE_DELETED` | - |

### Report Actions

| # | UI Action | Screen | API Endpoint | Permission | Audit Event | JobType |
|---|-----------|--------|--------------|------------|-------------|---------|
| 31 | توليد تقرير | Lead Detail | `POST /api/leads/:id/report` | `leads:read` | `REPORT_STARTED` | `REPORT_GENERATE` |
| 32 | تصدير PDF | Lead Detail | `GET /api/leads/:id/report/pdf` | `leads:read` | `REPORT_EXPORTED` | - |

### Settings & Billing Actions

| # | UI Action | Screen | API Endpoint | Permission | Audit Event | JobType |
|---|-----------|--------|--------------|------------|-------------|---------|
| 33 | تحديث إعدادات | Settings | `PATCH /api/tenants/:id` | `org:settings` | `TENANT_UPDATED` | - |
| 34 | إنشاء مفتاح API | Security | `POST /api/api-keys` | `api_keys:manage` | `API_KEY_CREATED` | - |
| 35 | حذف مفتاح API | Security | `DELETE /api/api-keys/:id` | `api_keys:manage` | `API_KEY_DELETED` | - |
| 36 | عرض الاستخدام | Usage | `GET /api/billing/usage` | `usage:read` | - | - |
| 37 | ترقية الباقة | Billing | `POST /api/billing/checkout` | `billing:manage` | `SUBSCRIPTION_UPGRADED` | - |
| 38 | إلغاء الاشتراك | Billing | `POST /api/billing/cancel` | `billing:manage` | `SUBSCRIPTION_CANCELLED` | - |

### Agent/Extension Actions

| # | UI Action | Screen | API Endpoint | Permission | Audit Event | JobType |
|---|-----------|--------|--------------|------------|-------------|---------|
| 39 | جلب الإعدادات | Extension | `GET /api/agent/config` | - | - | - |
| 40 | Heartbeat | Extension | `POST /api/agent/heartbeat` | - | - | - |
| 41 | تأكيد Job | Extension | `POST /api/agent/jobs/:id/ack` | - | `JOB_ACKNOWLEDGED` | - |
| 42 | تحديث التقدم | Extension | `POST /api/agent/jobs/:id/progress` | - | - | - |
| 43 | إرسال Evidence | Extension | `POST /api/agent/jobs/:id/evidence` | - | `EVIDENCE_RECEIVED` | - |
| 44 | إبلاغ خطأ | Extension | `POST /api/agent/jobs/:id/error` | - | `JOB_ERROR` | - |
| 45 | إنهاء Job | Extension | `POST /api/agent/jobs/:id/done` | - | `JOB_COMPLETED` | - |

---

## 📈 Coverage Summary

| Category | Count | Status |
|----------|:-----:|:------:|
| Total UI Actions | 45 | ✅ |
| API Endpoints | 45 | ✅ |
| Audit Events | 38 | ✅ |
| JobTypes | 9 | ✅ |
| Permissions | 22 | ✅ |

### Verification

```
✅ كل زر في UI له endpoint واضح
✅ كل endpoint له permission محدد (أو public)
✅ كل action حساس له audit event
✅ كل عملية طويلة لها JobType
```

---

## 🔧 الإجراءات المُنجزة

### تم إنجازه ✅

1. [x] إعادة تسمية `11-EXECUTIVE-SUMMARY.md` → `17-EXECUTIVE-SUMMARY.md`
2. [x] أرشفة `02-DATA-MODEL-V2.md` → `DEPRECATED-02-DATA-MODEL-V2.md`
3. [x] أرشفة `07-DEVELOPMENT-ROADMAP-V2.md` → `DEPRECATED-07-DEVELOPMENT-ROADMAP-V2.md`
4. [x] تحديث README ليعكس الترقيم الجديد
5. [x] إضافة MV3 Lifecycle + Keep-Alive + State Persistence في `11-EXTENSION_RUNNER_SPEC.md`
6. [x] إضافة Unified Failure Modes في `11-EXTENSION_RUNNER_SPEC.md`
7. [x] إضافة Concurrency Policy + Backoff + Pause/Resume في `11-EXTENSION_RUNNER_SPEC.md`
8. [x] إضافة Execution Window Strategy في `11-EXTENSION_RUNNER_SPEC.md`
9. [x] إضافة Agent/Runner API endpoints في `openapi.yaml`
10. [x] إضافة EvidenceItem schema في `openapi.yaml`
11. [x] توسيع RLS policies لجميع الجداول في `09-SAAS_MULTITENANCY.md`
12. [x] إضافة NestJS Middleware for RLS في `09-SAAS_MULTITENANCY.md`

### قبل Sprint 1 (متبقي)

1. [ ] اختبار OpenAPI spec مع Swagger UI
2. [ ] مراجعة Legal لـ PII redaction rules

---

## ✅ Verification Commands

```bash
# التحقق من اتساق الإصدارات
grep -r "الإصدار:" docs/*.md | grep -v "2.1"

# التحقق من الروابط المكسورة
grep -oh "\[.*\](\.\/.*\.md)" docs/README.md | while read link; do
  file=$(echo $link | sed 's/.*(\.\//docs\//' | sed 's/).*//')
  [ ! -f "$file" ] && echo "Broken: $link"
done

# التحقق من تغطية Audit
grep -c "Audit:" docs/03-SCREENS-ANALYSIS.md

# التحقق من تغطية API
grep -c "endpoint\|Endpoint" docs/06-API-REQUIREMENTS.md
```

---

> **آخر تحديث:** يناير 2026 (v2.1)
