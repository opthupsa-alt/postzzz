# 🗺️ خارطة طريق التطوير - ليدززز (Leedz)

> **الإصدار:** 1.0.0  
> **تاريخ الإنشاء:** يناير 2026

---

## 📋 نظرة عامة

هذا المستند يحدد خارطة طريق تطوير نظام ليدززز من الحالة الحالية (Frontend Prototype) إلى منتج إنتاجي كامل.

---

## 🎯 الحالة الحالية

### ما تم إنجازه ✅
- [x] واجهة مستخدم كاملة (React + TypeScript)
- [x] جميع الشاشات الرئيسية (17 شاشة)
- [x] إدارة الحالة (Zustand Store)
- [x] التنقل والتوجيه (React Router)
- [x] تصميم RTL عربي أولاً
- [x] Mock Data للتجربة
- [x] مكونات قابلة لإعادة الاستخدام

### ما يحتاج تطوير 🔧
- [ ] Backend API
- [ ] قاعدة البيانات
- [ ] المصادقة الحقيقية
- [ ] تكامل Google Maps API
- [ ] تكامل WhatsApp Business API
- [ ] نظام المهام الخلفية (Jobs)
- [ ] تحليل AI للتقارير
- [ ] الإشعارات الحقيقية
- [ ] Extension للمتصفح

---

## 📅 المراحل

### المرحلة 1: البنية التحتية (4-6 أسابيع)

#### 1.1 إعداد Backend
```
الأسبوع 1-2:
├── اختيار التقنية (Node.js/NestJS أو Python/FastAPI)
├── إعداد المشروع والهيكل
├── إعداد Docker و Docker Compose
├── إعداد CI/CD Pipeline
└── إعداد بيئات التطوير/الاختبار/الإنتاج
```

#### 1.2 قاعدة البيانات
```
الأسبوع 2-3:
├── إعداد PostgreSQL
├── تصميم Schema النهائي
├── إنشاء Migrations
├── إعداد Prisma/TypeORM
└── Seed Data للتطوير
```

#### 1.3 المصادقة والأمان
```
الأسبوع 3-4:
├── نظام JWT Authentication
├── Refresh Tokens
├── Password Hashing (Argon2)
├── Rate Limiting
├── CORS Configuration
└── API Key Management
```

#### 1.4 ربط Frontend بـ Backend
```
الأسبوع 4-6:
├── إنشاء API Client (Axios/Fetch)
├── إعداد React Query للـ Caching
├── تحويل Zustand للعمل مع API
├── Error Handling
└── Loading States
```

**المخرجات:**
- ✅ Backend يعمل مع API أساسي
- ✅ قاعدة بيانات مُعدة
- ✅ نظام مصادقة كامل
- ✅ Frontend متصل بـ Backend

---

### المرحلة 2: الوظائف الأساسية (6-8 أسابيع)

#### 2.1 إدارة العملاء (CRUD)
```
الأسبوع 1-2:
├── API: GET/POST/PATCH/DELETE /leads
├── Bulk Operations
├── Search & Filtering
├── Pagination
└── Export (CSV/Excel)
```

#### 2.2 إدارة القوائم
```
الأسبوع 2-3:
├── API: CRUD /lists
├── إضافة/إزالة عملاء
├── نقل بين القوائم
└── إحصائيات القوائم
```

#### 2.3 نظام المهام (Jobs)
```
الأسبوع 3-4:
├── إعداد Bull/BullMQ Queue
├── Redis للـ Queue
├── WebSocket للتحديثات الحية
├── Job Types: SEARCH, SURVEY, WHATSAPP
└── Progress Tracking
```

#### 2.4 استيراد البيانات
```
الأسبوع 4-5:
├── رفع الملفات (Multer)
├── معالجة CSV/Excel
├── Validation
├── Duplicate Detection
└── Background Processing
```

#### 2.5 إدارة الفريق
```
الأسبوع 5-6:
├── API: CRUD /team
├── نظام الدعوات
├── إدارة الأدوار
└── Activity Tracking
```

#### 2.6 سجل الرقابة
```
الأسبوع 6-7:
├── Audit Log Middleware
├── تسجيل جميع الإجراءات
├── API: GET /audit-logs
└── Risk Analysis
```

**المخرجات:**
- ✅ CRUD كامل للعملاء والقوائم
- ✅ نظام مهام يعمل
- ✅ استيراد/تصدير البيانات
- ✅ إدارة الفريق
- ✅ سجل رقابة كامل

---

### المرحلة 3: التكاملات الخارجية (6-8 أسابيع)

#### 3.1 Google Maps Integration
```
الأسبوع 1-3:
├── إعداد Google Cloud Project
├── تفعيل Places API
├── Text Search Implementation
├── Place Details
├── Rate Limiting & Caching
└── Error Handling
```

#### 3.2 WhatsApp Business API
```
الأسبوع 3-6:
├── إعداد Meta Business Account
├── تسجيل Phone Number
├── إرسال رسائل نصية
├── إرسال رسائل قوالب
├── Webhook للـ Status Updates
├── Message Templates Management
└── Delivery Reports
```

#### 3.3 تكاملات CRM (اختياري)
```
الأسبوع 6-8:
├── Salesforce OAuth
├── Salesforce Sync
├── HubSpot OAuth
├── HubSpot Sync
└── Webhook Handlers
```

**المخرجات:**
- ✅ بحث حقيقي من Google Maps
- ✅ إرسال رسائل واتساب حقيقية
- ✅ مزامنة مع CRMs (اختياري)

---

### المرحلة 4: الذكاء الاصطناعي (4-6 أسابيع)

#### 4.1 استخراج الأدلة
```
الأسبوع 1-2:
├── Web Scraping Service
├── استخراج بيانات المواقع
├── تحليل Social Media
├── News Aggregation
└── Data Cleaning
```

#### 4.2 تحليل وبناء التقارير
```
الأسبوع 2-4:
├── إعداد OpenAI/Gemini API
├── Prompt Engineering
├── Report Generation
├── Confidence Scoring
├── Evidence Linking
└── Summary Generation
```

#### 4.3 كتابة الرسائل الذكية
```
الأسبوع 4-5:
├── AI Message Drafting
├── Personalization
├── Tone Adjustment
└── A/B Testing
```

#### 4.4 Lead Scoring
```
الأسبوع 5-6:
├── Scoring Algorithm
├── ML Model (اختياري)
├── Score Explanation
└── Recommendations
```

**المخرجات:**
- ✅ استخراج أدلة حقيقية
- ✅ تقارير ذكية بـ AI
- ✅ كتابة رسائل ذكية
- ✅ تقييم العملاء

---

### المرحلة 5: Extension والموبايل (4-6 أسابيع)

#### 5.1 Browser Extension
```
الأسبوع 1-3:
├── Chrome Extension Setup
├── Content Script
├── Side Panel UI
├── Context Detection
├── API Integration
├── Data Reveal Feature
└── Chrome Web Store Publishing
```

#### 5.2 تطبيق الموبايل (اختياري)
```
الأسبوع 3-6:
├── React Native Setup
├── Core Screens
├── Push Notifications
├── Offline Support
└── App Store Publishing
```

**المخرجات:**
- ✅ Extension يعمل على Chrome
- ✅ تطبيق موبايل (اختياري)

---

### المرحلة 6: التحسين والإطلاق (4 أسابيع)

#### 6.1 الأداء
```
الأسبوع 1:
├── Database Indexing
├── Query Optimization
├── Caching Strategy
├── CDN Setup
└── Image Optimization
```

#### 6.2 الاختبار
```
الأسبوع 1-2:
├── Unit Tests
├── Integration Tests
├── E2E Tests (Playwright)
├── Load Testing
└── Security Audit
```

#### 6.3 التوثيق
```
الأسبوع 2-3:
├── API Documentation (Swagger)
├── User Guide
├── Admin Guide
├── Developer Guide
└── Video Tutorials
```

#### 6.4 الإطلاق
```
الأسبوع 3-4:
├── Production Deployment
├── Monitoring Setup (Sentry)
├── Analytics (Mixpanel)
├── Backup Strategy
└── Support System
```

**المخرجات:**
- ✅ نظام محسّن وسريع
- ✅ اختبارات شاملة
- ✅ توثيق كامل
- ✅ إطلاق الإنتاج

---

## 📊 الجدول الزمني الإجمالي

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  المرحلة 1: البنية التحتية          ████████░░░░░░░░░░░░░░  │
│  (4-6 أسابيع)                       الأسبوع 1-6            │
│                                                             │
│  المرحلة 2: الوظائف الأساسية        ░░░░░░████████████░░░░  │
│  (6-8 أسابيع)                       الأسبوع 6-14           │
│                                                             │
│  المرحلة 3: التكاملات               ░░░░░░░░░░░░░░████████  │
│  (6-8 أسابيع)                       الأسبوع 14-22          │
│                                                             │
│  المرحلة 4: الذكاء الاصطناعي        ░░░░░░░░░░░░░░░░░░████  │
│  (4-6 أسابيع)                       الأسبوع 22-28          │
│                                                             │
│  المرحلة 5: Extension               ░░░░░░░░░░░░░░░░░░░░██  │
│  (4-6 أسابيع)                       الأسبوع 28-34          │
│                                                             │
│  المرحلة 6: الإطلاق                 ░░░░░░░░░░░░░░░░░░░░░█  │
│  (4 أسابيع)                         الأسبوع 34-38          │
│                                                             │
└─────────────────────────────────────────────────────────────┘

الإجمالي: 28-38 أسبوع (7-10 أشهر)
```

---

## 🛠️ التقنيات المقترحة

### Backend
| التقنية | الاستخدام |
|---------|----------|
| Node.js + NestJS | إطار العمل الرئيسي |
| PostgreSQL | قاعدة البيانات |
| Redis | Caching + Queue |
| Prisma | ORM |
| Bull/BullMQ | Job Queue |
| Socket.io | WebSocket |

### DevOps
| التقنية | الاستخدام |
|---------|----------|
| Docker | Containerization |
| GitHub Actions | CI/CD |
| AWS/GCP | Cloud Hosting |
| Nginx | Reverse Proxy |
| Let's Encrypt | SSL |

### Monitoring
| التقنية | الاستخدام |
|---------|----------|
| Sentry | Error Tracking |
| Prometheus + Grafana | Metrics |
| ELK Stack | Logging |

---

## 💰 تقدير الموارد

### الفريق المقترح
| الدور | العدد | المدة |
|-------|-------|-------|
| Backend Developer | 2 | كامل المشروع |
| Frontend Developer | 1 | كامل المشروع |
| DevOps Engineer | 1 | جزئي |
| QA Engineer | 1 | من المرحلة 2 |
| Product Manager | 1 | كامل المشروع |

### التكاليف الشهرية المتوقعة (الإنتاج)
| البند | التكلفة |
|-------|---------|
| Cloud Hosting | $200-500 |
| Google Maps API | $200-1000 |
| WhatsApp Business API | $100-500 |
| OpenAI/Gemini API | $100-300 |
| Monitoring Tools | $50-100 |
| **الإجمالي** | **$650-2400** |

---

## ⚠️ المخاطر والتحديات

### تقنية
| المخاطر | الحل |
|---------|------|
| Rate Limiting من Google | Caching + Proxy Rotation |
| حظر WhatsApp | استخدام API الرسمي فقط |
| أداء البحث | Database Indexing + Caching |
| تكلفة AI | Prompt Optimization + Caching |

### تجارية
| المخاطر | الحل |
|---------|------|
| تغيير سياسات Google/Meta | خطط بديلة + تنويع المصادر |
| المنافسة | التركيز على السوق المحلي |
| التسعير | نموذج مرن (Freemium) |

---

## ✅ معايير النجاح

### المرحلة 1
- [ ] API يستجيب في أقل من 200ms
- [ ] تسجيل دخول يعمل بشكل صحيح
- [ ] لا أخطاء في Console

### المرحلة 2
- [ ] CRUD كامل بدون أخطاء
- [ ] Jobs تعمل بشكل موثوق
- [ ] استيراد 1000 عميل في أقل من دقيقة

### المرحلة 3
- [ ] بحث Google Maps يعمل
- [ ] إرسال واتساب ناجح 95%+
- [ ] Webhook يستقبل التحديثات

### المرحلة 4
- [ ] تقارير AI ذات جودة عالية
- [ ] Lead Score دقيق 80%+
- [ ] رسائل AI مقبولة

### المرحلة 5
- [ ] Extension يعمل على Chrome
- [ ] Reveal Data يعمل
- [ ] حفظ للـ CRM يعمل

### المرحلة 6
- [ ] Uptime 99.9%
- [ ] Response Time < 500ms
- [ ] Zero Critical Bugs

---

## 🔌 Extension Track (v2)

> **ملاحظة:** هذا Track مستقل يعمل بالتوازي مع المراحل الأخرى بعد تثبيت البنية التحتية.

### Sprint E1: Extension Spec & Planning (أسبوع واحد)

```
المهام:
├── مراجعة 11-EXTENSION_RUNNER_SPEC.md
├── مراجعة 12-UI_VENDORIZING_PLAN.md
├── مراجعة 13-EXTENSION_API_MAPPING.md
├── تحديد Decision Gate لـ UI Vendoring
└── إعداد Extension project structure
```

**المخرجات:**
- ✅ قرار نهائي: Vendoring أو Rebuild
- ✅ Extension project initialized
- ✅ Manifest.json ready

---

### Sprint E2: Extension Core (أسبوعين)

```
المهام:
├── Background service worker
├── Side Panel UI (Vendored أو Rebuilt)
├── WebSocket connection to Backend
├── Auth flow (login/logout/refresh)
├── Tenant context management
└── Feature flags integration
```

**المخرجات:**
- ✅ Extension يتصل بالـ Backend
- ✅ Login/Logout يعمل
- ✅ Side Panel يعرض UI

---

### Sprint E3: Connectors & Jobs (أسبوعين)

```
المهام:
├── Connector: google_maps
├── Connector: website_crawl
├── Connector: social_public
├── Job execution engine
├── Progress reporting
├── Evidence collection & upload
└── User action handling (Captcha)
```

**المخرجات:**
- ✅ Survey job يعمل
- ✅ Evidence يُرسل للـ Backend
- ✅ Progress يظهر في UI

---

### Sprint E4: Features & Polish (أسبوعين)

```
المهام:
├── Resolve page entity
├── Save to CRM
├── Reveal contact data
├── WhatsApp send
├── Add to list
├── Error handling
├── Offline queue
└── Chrome Web Store preparation
```

**المخرجات:**
- ✅ جميع Actions تعمل
- ✅ Extension ready for Chrome Web Store
- ✅ Documentation complete

---

### Extension Track Timeline

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    EXTENSION TRACK TIMELINE                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Prerequisites: Backend API ready (Sprint 1-2 من المراحل الأساسية)      │
│                                                                          │
│  Sprint E1: Spec & Planning     ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│  (1 أسبوع)                      Week 1                                  │
│                                                                          │
│  Sprint E2: Extension Core      ░░░░████████░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│  (2 أسابيع)                     Week 2-3                                │
│                                                                          │
│  Sprint E3: Connectors & Jobs   ░░░░░░░░░░░░████████░░░░░░░░░░░░░░░░░░  │
│  (2 أسابيع)                     Week 4-5                                │
│                                                                          │
│  Sprint E4: Features & Polish   ░░░░░░░░░░░░░░░░░░░░████████░░░░░░░░░░  │
│  (2 أسابيع)                     Week 6-7                                │
│                                                                          │
│  الإجمالي: 7 أسابيع                                                     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Extension Track Dependencies

| Sprint | يعتمد على |
|--------|----------|
| E1 | لا شيء (يمكن البدء فوراً) |
| E2 | Backend Auth API (Sprint 0 من المراحل الأساسية) |
| E3 | Backend Jobs API + WebSocket (Sprint 2) |
| E4 | Backend Leads/Lists/WhatsApp API (Sprint 1-3) |

### Extension Track Success Criteria

- [ ] Extension يتصل بالـ Backend بنجاح
- [ ] Login/Logout يعمل
- [ ] Resolve يكتشف الكيانات
- [ ] Survey يجمع Evidence
- [ ] Save to CRM يعمل
- [ ] WhatsApp يُرسل الرسائل
- [ ] Reveal يكشف البيانات
- [ ] لا CSP violations
- [ ] Bundle size < 5MB
- [ ] Chrome Web Store approved

> **التفاصيل الكاملة:**
> - [11-EXTENSION_RUNNER_SPEC.md](./11-EXTENSION_RUNNER_SPEC.md)
> - [12-UI_VENDORIZING_PLAN.md](./12-UI_VENDORIZING_PLAN.md)
> - [13-EXTENSION_API_MAPPING.md](./13-EXTENSION_API_MAPPING.md)

---

## ✅ Definition of Done (DoD) - CF-22 fix

### Sprint: SaaS Foundation (المرحلة 1)

```
Technical DoD:
├── [ ] All endpoints return tenant-scoped data
├── [ ] RBAC enforced on all protected routes
├── [ ] Signup flow creates tenant + owner
├── [ ] Invite flow works end-to-end
├── [ ] Switch tenant works for multi-tenant users
├── [ ] Unit tests: 80% coverage on auth/tenant modules
├── [ ] Integration tests: signup, login, invite, switch
└── [ ] Security review: no tenant data leakage

Acceptance Criteria:
├── [ ] User can signup and create organization
├── [ ] Owner can invite team members
├── [ ] Invited user can accept and join
├── [ ] User can switch between organizations
└── [ ] Billing page shows plan and usage
```

### Sprint: Runner Core (Extension Track E2-E3)

```
Technical DoD:
├── [ ] Extension connects to backend via WebSocket
├── [ ] Job dispatch and ACK work
├── [ ] Progress updates flow correctly
├── [ ] Evidence upload works with hash/timestamp
├── [ ] Execution Window opens minimized
├── [ ] User tabs are NEVER touched
├── [ ] MV3 lifecycle handled (sleep/wake)
├── [ ] Offline queue works for 100 items
├── [ ] No <all_urls> in manifest
├── [ ] PII redaction implemented
└── [ ] Chrome Web Store review passed

Acceptance Criteria:
├── [ ] User can trigger Survey from Side Panel
├── [ ] Progress shows in real-time
├── [ ] Evidence appears after job completion
├── [ ] User can continue browsing during job
├── [ ] CAPTCHA/CONSENT prompts work
└── [ ] LOGIN_REQUIRED_UNSUPPORTED handled gracefully
```

### Sprint: Jobs & Evidence (المرحلة 2)

```
Technical DoD:
├── [ ] All job types implemented (SEARCH, SURVEY, REVEAL, REPORT, WHATSAPP)
├── [ ] Job state machine complete
├── [ ] Evidence stored with proper schema
├── [ ] Report generation works
├── [ ] Job logs stored and queryable
└── [ ] Rate limiting per tenant

Acceptance Criteria:
├── [ ] User can run search job
├── [ ] User can run survey job
├── [ ] User can generate AI report
├── [ ] Job progress visible in UI
└── [ ] Job history accessible
```

### Sprint: WhatsApp Integration (المرحلة 3)

```
Technical DoD:
├── [ ] WhatsApp Business API connected
├── [ ] Message templates CRUD
├── [ ] Single message send works
├── [ ] Bulk message send works
├── [ ] Webhook receives status updates
├── [ ] Message logs stored
└── [ ] Rate limiting enforced

Acceptance Criteria:
├── [ ] User can send WhatsApp message
├── [ ] User can use templates
├── [ ] Message status updates in real-time
└── [ ] Bulk send respects quotas
```

### Security DoD (All Sprints)

```
├── [ ] No tenant data leakage (verified by test)
├── [ ] No IDOR vulnerabilities
├── [ ] No privilege escalation
├── [ ] Tokens properly validated
├── [ ] Audit logs complete
├── [ ] Rate limiting active
└── [ ] Input sanitization complete
```

---

## 📞 الخطوات التالية

1. **مراجعة الخطة** مع الفريق
2. **تحديد الأولويات** والميزات الأساسية
3. **تجهيز البيئة** التطويرية
4. **بدء المرحلة 1** - البنية التحتية
5. **بدء Extension Track** بالتوازي (Sprint E1)

---

> **ملاحظة:** هذه الخطة قابلة للتعديل بناءً على المتطلبات والموارد المتاحة.
