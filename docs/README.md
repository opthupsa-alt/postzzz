# 📚 توثيق نظام ليدززز (Leedz) - Analysis Pack v2.1

> **الإصدار:** 2.1.0  
> **تاريخ التحديث:** يناير 2026  
> **الحالة:** جاهز للتطوير Backend + Extension

---

## 🎯 نظرة سريعة

**ليدززز** هو نظام مبيعات ذكي (Sales Intelligence + CRM) موجه للسوق السعودي. يجمع بين اكتشاف العملاء من Google Maps، تحليل AI، تواصل WhatsApp، وإدارة CRM متكاملة.

**حالة المشروع:** Frontend Prototype مكتمل (17 شاشة موجودة + 6 SaaS مخططة) ← جاهز للتطوير Backend + Extension

---

## 📁 فهرس الوثائق

### الوثائق الأساسية
| الملف | الوصف | الحالة |
|-------|-------|--------|
| [00-GLOSSARY.md](./00-GLOSSARY.md) | قاموس المصطلحات الموحد | ✅ |
| [01-SYSTEM-OVERVIEW.md](./01-SYSTEM-OVERVIEW.md) | نظرة عامة على النظام + Extension Runner | ✅ |
| [02-DATA-MODEL.md](./02-DATA-MODEL.md) | نموذج البيانات (SQL + SaaS entities) | ✅ v2.1 |
| [03-SCREENS-ANALYSIS.md](./03-SCREENS-ANALYSIS.md) | تحليل 23 شاشة (17 موجودة + 6 مخططة) | ✅ v2.1 |
| [04-USER-FLOWS.md](./04-USER-FLOWS.md) | 14 تدفق مستخدم (8 أساسية + 6 SaaS) | ✅ v2.1 |
| [05-COMPONENTS-REFERENCE.md](./05-COMPONENTS-REFERENCE.md) | مرجع المكونات | ✅ |
| [06-API-REQUIREMENTS.md](./06-API-REQUIREMENTS.md) | متطلبات API (مع SaaS + Runner) | ✅ v2.1 |
| [07-DEVELOPMENT-ROADMAP.md](./07-DEVELOPMENT-ROADMAP.md) | خارطة طريق + DoD | ✅ v2.1 |

### وثائق SaaS Multi-Tenancy
| الملف | الوصف | الحالة |
|-------|-------|--------|
| [09-SAAS_MULTITENANCY.md](./09-SAAS_MULTITENANCY.md) | تصميم Multi-tenancy + RBAC | ✅ |
| [15-MULTITENANCY_RBAC_MATRIX.md](./15-MULTITENANCY_RBAC_MATRIX.md) | مصفوفة الصلاحيات الكاملة | ✅ v2.1 |
| [16-SUBSCRIPTION_QUOTAS_FLAGS.md](./16-SUBSCRIPTION_QUOTAS_FLAGS.md) | الباقات والحدود والميزات | ✅ v2.1 |

### وثائق Extension Runner
| الملف | الوصف | الحالة |
|-------|-------|--------|
| [11-EXTENSION_RUNNER_SPEC.md](./11-EXTENSION_RUNNER_SPEC.md) | مواصفات Runner (Connectors, Protocol, Privacy) | ✅ v2.1 |
| [12-UI_VENDORIZING_PLAN.md](./12-UI_VENDORIZING_PLAN.md) | خطة نقل UI + CI Sync | ✅ v2.1 |
| [13-EXTENSION_API_MAPPING.md](./13-EXTENSION_API_MAPPING.md) | جدول Mapping (UI→API→Permission→Job→Audit) | ✅ |

### وثائق الجودة والأمان
| الملف | الوصف | الحالة |
|-------|-------|--------|
| [08-CONFLICTS_AND_GAPS.md](./08-CONFLICTS_AND_GAPS.md) | تقرير التضاربات (v1) | ✅ |
| [14-CONFLICTS_AND_FIXES.md](./14-CONFLICTS_AND_FIXES.md) | تقرير 24 تضارب + الإصلاحات | ✅ v2.1 |
| [10-SECURITY_THREAT_MODEL.md](./10-SECURITY_THREAT_MODEL.md) | 10 تهديدات + ضوابط | ✅ |

### مرجع API
| الملف | الوصف | الحالة |
|-------|-------|--------|
| [openapi.yaml](./openapi.yaml) | OpenAPI 3.1 Spec | ✅ v2.1 |

### وثائق التشغيل (Operations)
| الملف | الوصف | الحالة |
|-------|-------|--------|
| [OPERATIONS_RUNBOOK.md](./OPERATIONS_RUNBOOK.md) | دليل التشغيل الكامل | ✅ v1.0 |
| [SPRINT_CLOSEOUT.md](./SPRINT_CLOSEOUT.md) | إغلاق السبرنتات | ✅ |

### وثائق إضافية
| الملف | الوصف | الحالة |
|-------|-------|--------|
| [17-EXECUTIVE-SUMMARY.md](./17-EXECUTIVE-SUMMARY.md) | الملخص التنفيذي | ✅ |
| [DIFF_SUMMARY.md](./DIFF_SUMMARY.md) | ملخص التغييرات + Matrix | ✅ v2.1 |

### ملفات مُلغاة (Deprecated)
| الملف | السبب |
|-------|-------|
| `DEPRECATED-02-DATA-MODEL-V2.md` | تم دمجه في `02-DATA-MODEL.md` |
| `DEPRECATED-07-DEVELOPMENT-ROADMAP-V2.md` | تم دمجه في `07-DEVELOPMENT-ROADMAP.md` |

---

## 🚀 How to Run

> **📖 للتعليمات الكاملة:** راجع [OPERATIONS_RUNBOOK.md](./OPERATIONS_RUNBOOK.md)

### Quick Start

```bash
# 1. Clone & Install
cd leedz/web
pnpm install

# 2. Setup environment
# Copy .env.example to .env.local
# Get secrets from ops/local/.env.secrets.local (local only, not in git)

# 3. Run
pnpm dev
# → http://localhost:5173
```

### Environment Setup

| File | Purpose | In Git? |
|------|---------|:-------:|
| `.env.example` | Template with variable names | ✅ |
| `.env.local` | Your local config | ❌ |
| `ops/local/.env.secrets.local` | Actual secrets | ❌ |

---

## 📚 للبدء السريع

### للمطورين Backend
1. ابدأ بـ [01-SYSTEM-OVERVIEW.md](./01-SYSTEM-OVERVIEW.md)
2. راجع [15-MULTITENANCY_RBAC_MATRIX.md](./15-MULTITENANCY_RBAC_MATRIX.md) للصلاحيات
3. راجع [16-SUBSCRIPTION_QUOTAS_FLAGS.md](./16-SUBSCRIPTION_QUOTAS_FLAGS.md) للباقات
4. راجع [06-API-REQUIREMENTS.md](./06-API-REQUIREMENTS.md) للـ API contracts
5. اتبع [07-DEVELOPMENT-ROADMAP.md](./07-DEVELOPMENT-ROADMAP.md) + DoD

### لمطوري Extension
1. ابدأ بـ [11-EXTENSION_RUNNER_SPEC.md](./11-EXTENSION_RUNNER_SPEC.md)
2. راجع [12-UI_VENDORIZING_PLAN.md](./12-UI_VENDORIZING_PLAN.md)
3. راجع [13-EXTENSION_API_MAPPING.md](./13-EXTENSION_API_MAPPING.md)

### للمطورين Frontend
1. راجع [03-SCREENS-ANALYSIS.md](./03-SCREENS-ANALYSIS.md)
2. راجع [04-USER-FLOWS.md](./04-USER-FLOWS.md)
3. راجع [05-COMPONENTS-REFERENCE.md](./05-COMPONENTS-REFERENCE.md)

### للـ Product/Security
1. راجع [14-CONFLICTS_AND_FIXES.md](./14-CONFLICTS_AND_FIXES.md)
2. راجع [10-SECURITY_THREAT_MODEL.md](./10-SECURITY_THREAT_MODEL.md)

---

## 📊 ملخص القرارات الرئيسية

| القرار | التفاصيل |
|--------|----------|
| Multi-tenancy | Shared DB with Tenant ID + RLS |
| الأدوار | 4: OWNER, ADMIN, MANAGER, SALES |
| Job Types | 9 أنواع |
| الباقات | 4: FREE, STARTER, PRO, ENTERPRISE |
| Extension Runner | Execution Engine (MV3) |
| Backend | Orchestrator (NestJS) |
| Real-time | WebSocket |
| Connectors | google_maps, web_search, website_crawl, social_public |

---

## 🏗️ القرارات المعمارية الثابتة (Non-Negotiable)

```
1. Extension Runner = Execution Engine (ينفذ في المتصفح)
2. Backend = Orchestrator (يخطط ويخزن ويولد التقارير)
3. Evidence-based: كل claim يجب أن يرتبط بـ Evidence
4. Job-first: كل عملية طويلة = Job مع progress
5. Execution Window: منفصل عن تبويبات المستخدم
6. Privacy: لا لمس لتبويبات المستخدم، Evidence نص فقط
7. No <all_urls>: explicit domain allowlist فقط
8. LOGIN_REQUIRED_UNSUPPORTED: fail gracefully لـ noLogin connectors
```

---

## ✅ Final Consistency Checklist (v2.1)

### Files Verification
| Check | Status | Notes |
|-------|:------:|-------|
| README matches actual files | ✅ | 22 files verified |
| All links working | ✅ | All relative links valid |
| No orphan files | ✅ | All files documented |

### Content Consistency
| Check | Status | Notes |
|-------|:------:|-------|
| Screens count matches (23) | ✅ | 17 existing + 6 planned |
| Flows count matches (14) | ✅ | 8 basic + 6 SaaS |
| Roles consistent (4) | ✅ | OWNER, ADMIN, MANAGER, SALES |
| Plans consistent (4) | ✅ | FREE, STARTER, PRO, ENTERPRISE |
| Job types consistent (9) | ✅ | Across all docs |

### Cross-Document Alignment
| Check | Status | Notes |
|-------|:------:|-------|
| OpenAPI ↔ API-Requirements | ✅ | All endpoints documented |
| RBAC Matrix ↔ SaaS Multitenancy | ✅ | Same permissions |
| Data Model ↔ OpenAPI schemas | ✅ | Aligned |
| Screens ↔ User Flows | ✅ | All screens have flows |
| Extension Spec ↔ API Mapping | ✅ | All connectors mapped |

### Architecture Decisions (Non-Negotiable)
| Decision | Documented In | Status |
|----------|---------------|:------:|
| Extension = Execution Engine | 11-EXTENSION_RUNNER_SPEC.md | ✅ |
| Backend = Orchestrator | 01-SYSTEM-OVERVIEW.md | ✅ |
| Evidence-based claims | 11-EXTENSION_RUNNER_SPEC.md | ✅ |
| Job-first architecture | 06-API-REQUIREMENTS.md | ✅ |
| Execution Window (not user tabs) | 11-EXTENSION_RUNNER_SPEC.md | ✅ |
| No `<all_urls>` permission | 11-EXTENSION_RUNNER_SPEC.md | ✅ |
| Shared DB + tenant_id + RLS | 09-SAAS_MULTITENANCY.md | ✅ |

### Security Coverage
| Check | Status | Notes |
|-------|:------:|-------|
| CORS documented | ✅ | 02-DATA-MODEL.md |
| RBAC server-side | ✅ | 02-DATA-MODEL.md, 15-MULTITENANCY_RBAC_MATRIX.md |
| Rate limiting | ✅ | 02-DATA-MODEL.md |
| Input sanitization | ✅ | 02-DATA-MODEL.md |
| PII redaction | ✅ | 02-DATA-MODEL.md |
| Audit coverage | ✅ | 02-DATA-MODEL.md |
| Secrets management | ✅ | 02-DATA-MODEL.md |

### DoD Coverage
| Sprint | DoD Defined | Location |
|--------|:-----------:|----------|
| Sprint 1 (SaaS Foundation) | ✅ | 07-DEVELOPMENT-ROADMAP.md |
| Sprint 2 (Extension Core) | ✅ | 07-DEVELOPMENT-ROADMAP.md |
| Sprint 3 (Jobs & Evidence) | ✅ | 07-DEVELOPMENT-ROADMAP.md |
| Sprint 4 (WhatsApp) | ✅ | 07-DEVELOPMENT-ROADMAP.md |
| Sprint 5 (Reports & AI) | ✅ | 07-DEVELOPMENT-ROADMAP.md |
| Sprint 6 (Polish & Security) | ✅ | 07-DEVELOPMENT-ROADMAP.md |

---

## 📞 التواصل

فريق التطوير - Leedz

---

> **آخر تحديث:** يناير 2026 (v2.1)
