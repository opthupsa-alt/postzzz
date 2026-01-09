# 📌 PROJECT CONSTANTS - Leedz

> **الغرض:** الثوابت المعمارية التي لا تتغير - يُراجع قبل كل تغيير  
> **آخر تحديث:** يناير 2026

---

## 🔒 الثوابت المعمارية (Non-Negotiable)

### 1. SaaS Multi-tenant من البداية

```
✅ كل كيان يحتوي tenant_id
✅ RLS على مستوى قاعدة البيانات
✅ RBAC: OWNER → ADMIN → MANAGER → SALES
✅ Invites + Accept/Reject flow
✅ Switch Tenant للمستخدمين متعددي المنظمات
✅ Plans + Quotas + Feature Flags
✅ Audit logging لكل عملية حساسة
```

**المرجع:** `09-SAAS_MULTITENANCY.md`, `15-MULTITENANCY_RBAC_MATRIX.md`

---

### 2. Extension Runner = Execution Engine

```
✅ Chrome Extension (MV3) ينفذ في المتصفح
✅ يتلقى Job Plans من Backend
✅ ينفذ Connectors: google_maps, web_search, website_crawl, social_public
✅ يجمع Evidence ويرسلها للـ Backend
✅ لا يخزن بيانات حساسة محلياً
```

**المرجع:** `11-EXTENSION_RUNNER_SPEC.md`

---

### 3. Backend = Orchestrator

```
✅ يخطط Jobs ويوزعها
✅ يخزن Evidence في قاعدة البيانات
✅ يولد التقارير (AI)
✅ يدير Auth + RBAC + RLS
✅ لا ينفذ scraping بنفسه
```

**المرجع:** `01-SYSTEM-OVERVIEW.md`, `06-API-REQUIREMENTS.md`

---

### 4. Job-first Architecture

```
✅ كل عملية طويلة = Job
✅ Job له: id, type, status, progress, created_by, tenant_id
✅ Job Types: SEARCH, SURVEY, WHATSAPP_SEND, WHATSAPP_BULK, IMPORT, EXPORT, REPORT_GENERATE, BULK_STATUS_UPDATE, BULK_DELETE
✅ Progress updates عبر WebSocket
✅ Audit event عند بدء وانتهاء كل Job
```

**المرجع:** `06-API-REQUIREMENTS.md`, `DIFF_SUMMARY.md`

---

### 5. Evidence-based Reporting

```
✅ كل claim يرتبط بـ Evidence
✅ Evidence = نص فقط (لا screenshots)
✅ Evidence لها: type, source, snippet, confidence, hash, collected_at
✅ PII Redaction قبل التخزين
✅ حد أقصى 10KB per evidence item
```

**المرجع:** `11-EXTENSION_RUNNER_SPEC.md`

---

### 6. Execution Window منفصل

```
✅ Extension يفتح نافذة/تبويب منفصل للتنفيذ
✅ لا يلمس تبويبات المستخدم أبداً
✅ النافذة مصغرة أو مخفية
✅ تُغلق بعد انتهاء الـ Job
```

**المرجع:** `11-EXTENSION_RUNNER_SPEC.md`

---

## 🚫 قواعد UI/UX (لا تُكسر)

### ممنوع

| القاعدة | السبب |
|---------|-------|
| ❌ تغيير UI/UX الموجود | الـ Prototype معتمد |
| ❌ تقليص الشاشات | 17 شاشة موجودة ثابتة |
| ❌ حذف أزرار أو وظائف | قد يكسر التوقعات |
| ❌ إضافة مكتبات جديدة للويب | إلا لضرورة قصوى مع تبرير مكتوب |

### مطلوب

| القاعدة | التفاصيل |
|---------|----------|
| ✅ الحفاظ على 17 شاشة موجودة | كما هي بالضبط |
| ✅ شاشات جديدة تُوسم "Planned" | حتى تُنفذ وتُختبر |
| ✅ توثيق أي تغيير | في `SPRINT_CLOSEOUT.md` |
| ✅ تبرير مكتوب لأي مكتبة جديدة | في PR description |

---

## 📋 آلية إغلاق كل مرحلة

بعد كل Sprint أو تغيير رئيسي:

```
1. تحديث docs/SPRINT_CLOSEOUT.md
   - ما تم إنجازه ✅
   - ما لم يتم (TBD)
   - قرارات ثبتناها
   - مخاطر/تحذيرات
   - خطوات تحقق سريعة

2. مراجعة هذا الملف (PROJECT_CONSTANTS.md)
   - هل كسرنا أي ثابت؟
   - هل نحتاج تحديث ثابت؟

3. تحديث OPERATIONS_RUNBOOK.md إذا تغيرت البيئة
```

---

## 🔗 مراجع سريعة

| الموضوع | الملف |
|---------|-------|
| SaaS + RBAC | `09-SAAS_MULTITENANCY.md` |
| الصلاحيات | `15-MULTITENANCY_RBAC_MATRIX.md` |
| الباقات | `16-SUBSCRIPTION_QUOTAS_FLAGS.md` |
| Extension Runner | `11-EXTENSION_RUNNER_SPEC.md` |
| API | `06-API-REQUIREMENTS.md`, `openapi.yaml` |
| الشاشات | `03-SCREENS-ANALYSIS.md` |
| التدفقات | `04-USER-FLOWS.md` |
| التشغيل | `OPERATIONS_RUNBOOK.md` |

---

## ✅ Checklist قبل أي PR

```
[ ] لم أكسر أي ثابت معماري
[ ] لم أغير UI موجود بدون موافقة
[ ] لم أضف مكتبة جديدة (أو وثقت السبب)
[ ] حدّثت SPRINT_CLOSEOUT.md
[ ] لا أسرار في الكود
```

---

> **تحديث هذا الملف:** فقط عند تغيير قرار معماري أساسي بموافقة الفريق
