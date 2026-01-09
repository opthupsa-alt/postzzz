# 🔌 متطلبات الـ API - ليدززز (Leedz)

> **الإصدار:** 2.1.0  
> **تاريخ التحديث:** يناير 2026  
> **الحالة:** محدّث مع SaaS Multi-Tenant + Extension Runner

---

## 📋 نظرة عامة

هذا المستند يحدد متطلبات الـ API اللازمة لنظام SaaS Multi-tenant كامل مع دعم Extension Runner.

### Tenant Context (إلزامي)

```
كل API call يجب أن يحتوي على Tenant Context:

1. JWT Token يحتوي على:
   - userId
   - currentTenantId
   - role

2. Header اختياري للتأكيد:
   - X-Tenant-ID: <tenant-uuid>

3. Backend يتحقق من:
   - Token صالح
   - User عضو في Tenant
   - User له Permission المطلوب
```

---

## 🏗️ البنية المقترحة

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                        │
├─────────────────────────────────────────────────────────────┤
│                     API Gateway                             │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐       │
│  │  Auth   │  │  Leads  │  │ WhatsApp│  │ Search  │       │
│  │ Service │  │ Service │  │ Service │  │ Service │       │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘       │
├─────────────────────────────────────────────────────────────┤
│                    Database (PostgreSQL)                    │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ Google Maps │  │ WhatsApp    │  │ External    │        │
│  │ API         │  │ Business API│  │ CRMs        │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 Authentication API

### POST /api/auth/signup (CF-04 fix)
إنشاء حساب جديد مع Tenant

**Request:**
```json
{
  "email": "owner@company.com",
  "password": "SecurePass123!",
  "name": "أحمد محمد",
  "companyName": "شركة التقنية",
  "companySlug": "tech-company",
  "phone": "+966501234567"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "owner@company.com",
      "name": "أحمد محمد",
      "emailVerified": false
    },
    "tenant": {
      "id": "uuid",
      "name": "شركة التقنية",
      "slug": "tech-company"
    },
    "membership": {
      "role": "OWNER"
    },
    "token": "jwt-token",
    "refreshToken": "refresh-token"
  }
}
```

**Errors:**
- 400: `VALIDATION_ERROR` - بيانات غير صالحة
- 409: `EMAIL_ALREADY_EXISTS` - البريد مستخدم
- 409: `SLUG_ALREADY_EXISTS` - الـ slug مستخدم

**Audit:** `AUTH_SIGNUP`

---

### POST /api/auth/login
تسجيل الدخول

**Request:**
```json
{
  "email": "user@company.com",
  "password": "********"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "name": "أحمد محمد",
      "email": "ahmed@leadz.sa",
      "avatar": "https://..."
    },
    "tenants": [
      {
        "id": "tenant-uuid-1",
        "name": "شركة التقنية",
        "slug": "tech-company",
        "role": "OWNER"
      },
      {
        "id": "tenant-uuid-2",
        "name": "شركة أخرى",
        "slug": "other-company",
        "role": "SALES"
      }
    ],
    "currentTenant": {
      "id": "tenant-uuid-1",
      "name": "شركة التقنية",
      "role": "OWNER"
    },
    "token": "jwt-token",
    "refreshToken": "refresh-token",
    "expiresIn": 3600
  }
}
```

**Response (401):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "البريد الإلكتروني أو كلمة المرور غير صحيحة"
  }
}
```

**Audit:** `AUTH_LOGIN`

---

### POST /api/auth/forgot-password
طلب استعادة كلمة المرور

**Request:**
```json
{
  "email": "user@company.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "تم إرسال رابط الاستعادة إلى بريدك الإلكتروني"
}
```

---

### POST /api/auth/reset-password
إعادة تعيين كلمة المرور

**Request:**
```json
{
  "token": "reset-token",
  "newPassword": "********"
}
```

---

### POST /api/auth/refresh
تجديد الـ Token

**Request:**
```json
{
  "refreshToken": "refresh-token"
}
```

---

### POST /api/auth/logout
تسجيل الخروج

**Headers:**
```
Authorization: Bearer <token>
```

**Audit:** `AUTH_LOGOUT`

---

### POST /api/auth/switch-tenant
تبديل الـ Tenant الحالي

**Request:**
```json
{
  "tenantId": "tenant-uuid"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "tenant": {
      "id": "tenant-uuid",
      "name": "شركة أخرى",
      "slug": "other-company",
      "role": "SALES"
    },
    "token": "new-jwt-token",
    "refreshToken": "new-refresh-token"
  }
}
```

**Errors:**
- 403: `NOT_MEMBER` - المستخدم ليس عضواً في هذا الـ Tenant

**Audit:** `AUTH_TENANT_SWITCH`

---

## 🏢 Tenants API

### GET /api/tenants
جلب قائمة الـ Tenants التي ينتمي إليها المستخدم

**Response (200):**
```json
{
  "success": true,
  "data": {
    "tenants": [
      {
        "id": "uuid",
        "name": "شركة التقنية",
        "slug": "tech-company",
        "logoUrl": "https://...",
        "role": "OWNER",
        "memberCount": 5,
        "plan": "PRO"
      }
    ]
  }
}
```

---

### POST /api/tenants
إنشاء Tenant جديد (للمستخدم الحالي)

**Request:**
```json
{
  "name": "شركة جديدة",
  "slug": "new-company"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "tenant": {
      "id": "uuid",
      "name": "شركة جديدة",
      "slug": "new-company"
    },
    "membership": {
      "role": "OWNER"
    }
  }
}
```

**Audit:** `TENANT_CREATED`

---

### PATCH /api/tenants/:id
تحديث بيانات الـ Tenant

**Permission:** `org:settings:update`

**Request:**
```json
{
  "name": "اسم جديد",
  "logoUrl": "https://..."
}
```

**Audit:** `TENANT_UPDATED`

---

## 👥 Team API

### GET /api/team
جلب أعضاء الفريق

**Permission:** `team:read`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "members": [
      {
        "id": "membership-uuid",
        "user": {
          "id": "user-uuid",
          "name": "أحمد محمد",
          "email": "ahmed@company.com",
          "avatar": "https://..."
        },
        "role": "ADMIN",
        "status": "ACTIVE",
        "joinedAt": "2026-01-01T00:00:00Z"
      }
    ]
  }
}
```

---

### POST /api/invites
إرسال دعوة لعضو جديد

**Permission:** `team:invite`

**Request:**
```json
{
  "email": "new@company.com",
  "role": "SALES",
  "message": "مرحباً، انضم لفريقنا!"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "invite": {
      "id": "uuid",
      "email": "new@company.com",
      "role": "SALES",
      "status": "PENDING",
      "expiresAt": "2026-01-14T00:00:00Z"
    }
  }
}
```

**Audit:** `INVITE_SENT`

---

### GET /api/invites
جلب الدعوات المعلقة

**Permission:** `team:invite`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "invites": [
      {
        "id": "uuid",
        "email": "pending@company.com",
        "role": "SALES",
        "status": "PENDING",
        "createdAt": "2026-01-01T00:00:00Z",
        "expiresAt": "2026-01-14T00:00:00Z"
      }
    ]
  }
}
```

---

### POST /api/invites/:token/accept
قبول دعوة (Public endpoint)

**Request:**
```json
{
  "name": "محمد علي",
  "password": "SecurePass123!"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": { ... },
    "tenant": { ... },
    "token": "jwt-token"
  }
}
```

**Audit:** `INVITE_ACCEPTED`

---

### DELETE /api/invites/:id
إلغاء دعوة

**Permission:** `team:invite`

**Audit:** `INVITE_CANCELLED`

---

### POST /api/invites/:id/resend
إعادة إرسال دعوة

**Permission:** `team:invite`

**Audit:** `INVITE_RESENT`

---

### PATCH /api/team/:membershipId
تغيير دور عضو

**Permission:** `team:change_role`

**Request:**
```json
{
  "role": "MANAGER"
}
```

**Audit:** `MEMBER_ROLE_CHANGED`

---

### DELETE /api/team/:membershipId
إزالة عضو

**Permission:** `team:remove`

**Audit:** `MEMBER_REMOVED`

---

## 💳 Billing API

### GET /api/billing/plan
جلب الباقة الحالية

**Permission:** `billing:read`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "plan": {
      "id": "PRO",
      "name": "احترافي",
      "priceMonthly": 299,
      "billingCycle": "MONTHLY"
    },
    "subscription": {
      "status": "ACTIVE",
      "currentPeriodEnd": "2026-02-01T00:00:00Z",
      "cancelAtPeriodEnd": false
    }
  }
}
```

---

### GET /api/billing/usage
جلب الاستخدام الحالي

**Permission:** `billing:read`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "usage": {
      "seats": { "used": 3, "limit": 20 },
      "leads": { "used": 450, "limit": 10000 },
      "searches": { "used": 45, "limit": 1000, "resetsAt": "2026-02-01" },
      "whatsappMessages": { "used": 120, "limit": 5000, "resetsAt": "2026-02-01" },
      "reveals": { "used": 25, "limit": 1000, "resetsAt": "2026-02-01" }
    }
  }
}
```

---

### GET /api/billing/invoices
جلب الفواتير

**Permission:** `billing:invoices`

---

## 👥 Leads API

### GET /api/leads
جلب قائمة العملاء المحفوظين

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | رقم الصفحة (default: 1) |
| limit | number | عدد العناصر (default: 20) |
| search | string | بحث بالاسم أو النشاط |
| status | string | فلترة بالحالة |
| listId | string | فلترة بالقائمة |
| hasPhone | boolean | فلترة بوجود هاتف |
| hasWebsite | boolean | فلترة بوجود موقع |
| sortBy | string | الترتيب (createdAt, companyName) |
| sortOrder | string | اتجاه الترتيب (asc, desc) |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "leads": [
      {
        "id": "uuid",
        "companyName": "أرامكو السعودية",
        "industry": "طاقة",
        "city": "الظهران",
        "phone": "+966501234567",
        "website": "https://aramco.com",
        "status": "QUALIFIED",
        "evidenceCount": 5,
        "hasReport": true,
        "tags": ["VIP", "Enterprise"],
        "listId": "uuid",
        "createdAt": "2026-01-01T00:00:00Z",
        "updatedAt": "2026-01-05T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

---

### GET /api/leads/:id
جلب تفاصيل عميل

**Response (200):**
```json
{
  "success": true,
  "data": {
    "lead": {
      "id": "uuid",
      "companyName": "أرامكو السعودية",
      "industry": "طاقة",
      "city": "الظهران",
      "phone": "+966501234567",
      "website": "https://aramco.com",
      "email": "info@aramco.com",
      "status": "QUALIFIED",
      "tags": ["VIP", "Enterprise"],
      "listId": "uuid",
      "listName": "عملاء الرياض",
      "createdAt": "2026-01-01T00:00:00Z",
      "updatedAt": "2026-01-05T00:00:00Z",
      "createdBy": {
        "id": "uuid",
        "name": "أحمد محمد"
      }
    },
    "evidence": [...],
    "report": {...},
    "activities": [...]
  }
}
```

---

### POST /api/leads
إنشاء عميل جديد

**Request:**
```json
{
  "companyName": "شركة جديدة",
  "industry": "تقنية",
  "city": "الرياض",
  "phone": "+966501234567",
  "website": "https://example.com",
  "email": "info@example.com",
  "listId": "uuid"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "lead": {
      "id": "uuid",
      ...
    }
  }
}
```

---

### POST /api/leads/bulk
إنشاء عدة عملاء (Bulk Create)

**Request:**
```json
{
  "leads": [
    { "companyName": "شركة 1", ... },
    { "companyName": "شركة 2", ... }
  ],
  "listId": "uuid"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "created": 2,
    "skipped": 0,
    "leads": [...]
  }
}
```

---

### PATCH /api/leads/:id
تحديث عميل

**Request:**
```json
{
  "status": "CONTACTED",
  "tags": ["VIP"]
}
```

---

### PATCH /api/leads/:id/status
تحديث حالة العميل

**Request:**
```json
{
  "status": "QUALIFIED"
}
```

---

### DELETE /api/leads/:id
حذف عميل

---

### DELETE /api/leads/bulk
حذف عدة عملاء

**Request:**
```json
{
  "ids": ["uuid1", "uuid2"]
}
```

---

### POST /api/leads/import
استيراد عملاء من ملف

**Request (multipart/form-data):**
```
file: <CSV/Excel file>
listId: uuid (optional)
```

**Response (202):**
```json
{
  "success": true,
  "data": {
    "jobId": "uuid",
    "message": "جاري معالجة الملف..."
  }
}
```

---

### GET /api/leads/export
تصدير عملاء

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| ids | string[] | معرفات العملاء |
| listId | string | معرف القائمة |
| format | string | csv, xlsx |

**Response:**
```
Content-Type: application/octet-stream
Content-Disposition: attachment; filename="leads.xlsx"
```

---

## 🔍 Search API

### POST /api/search
بحث عن عملاء جدد

**Request:**
```json
{
  "keyword": "مطاعم",
  "city": "الرياض",
  "filters": {
    "hasPhone": true,
    "hasWebsite": false
  }
}
```

**Response (202):**
```json
{
  "success": true,
  "data": {
    "jobId": "uuid",
    "message": "بدء البحث..."
  }
}
```

---

### GET /api/search/:jobId/results
جلب نتائج البحث

**Response (200):**
```json
{
  "success": true,
  "data": {
    "job": {
      "id": "uuid",
      "status": "SUCCESS",
      "progress": 100,
      "message": "اكتمل البحث"
    },
    "results": [
      {
        "id": "temp-uuid",
        "companyName": "مطعم الشرق",
        "industry": "أغذية",
        "city": "الرياض",
        "phone": "+966501234567",
        "website": "https://...",
        "source": "Google Maps",
        "rating": 4.5,
        "reviewsCount": 120
      }
    ],
    "totalResults": 25
  }
}
```

---

## 📊 Survey API

### POST /api/leads/:id/survey
تشغيل فحص آلي للعميل

**Response (202):**
```json
{
  "success": true,
  "data": {
    "jobId": "uuid",
    "message": "بدء الفحص الآلي..."
  }
}
```

---

### GET /api/leads/:id/evidence
جلب أدلة العميل

**Response (200):**
```json
{
  "success": true,
  "data": {
    "evidence": [
      {
        "id": "uuid",
        "title": "الموقع الرسمي",
        "source": "aramco.com",
        "url": "https://aramco.com/about",
        "type": "WEBSITE",
        "snippet": "...",
        "timestamp": "2026-01-01T00:00:00Z"
      }
    ]
  }
}
```

---

### GET /api/leads/:id/report
جلب تقرير العميل

**Response (200):**
```json
{
  "success": true,
  "data": {
    "report": {
      "leadId": "uuid",
      "summary": "...",
      "lastUpdated": "2026-01-01T00:00:00Z",
      "sections": [
        {
          "title": "تحليل الاحتياج التقني",
          "content": "...",
          "confidence": "HIGH",
          "evidenceIds": ["uuid1", "uuid2"]
        }
      ],
      "score": 94
    }
  }
}
```

---

## 📋 Lists API

### GET /api/lists
جلب جميع القوائم

**Response (200):**
```json
{
  "success": true,
  "data": {
    "lists": [
      {
        "id": "uuid",
        "name": "عملاء الرياض",
        "count": 42,
        "createdAt": "2026-01-01T00:00:00Z",
        "updatedAt": "2026-01-05T00:00:00Z"
      }
    ]
  }
}
```

---

### POST /api/lists
إنشاء قائمة جديدة

**Request:**
```json
{
  "name": "قائمة جديدة"
}
```

---

### PATCH /api/lists/:id
تحديث قائمة

**Request:**
```json
{
  "name": "اسم جديد"
}
```

---

### DELETE /api/lists/:id
حذف قائمة

---

### POST /api/lists/:id/leads
إضافة عملاء لقائمة

**Request:**
```json
{
  "leadIds": ["uuid1", "uuid2"]
}
```

---

### DELETE /api/lists/:id/leads
إزالة عملاء من قائمة

**Request:**
```json
{
  "leadIds": ["uuid1", "uuid2"]
}
```

---

## 💬 WhatsApp API

### POST /api/whatsapp/send
إرسال رسالة واتساب

**Request:**
```json
{
  "leadId": "uuid",
  "phone": "+966501234567",
  "message": "مرحباً...",
  "templateId": "uuid"
}
```

**Response (202):**
```json
{
  "success": true,
  "data": {
    "jobId": "uuid",
    "messageId": "wamid.xxx",
    "status": "PENDING"
  }
}
```

---

### POST /api/whatsapp/send/bulk
إرسال رسائل جماعية

**Request:**
```json
{
  "leadIds": ["uuid1", "uuid2"],
  "message": "مرحباً ${name}...",
  "templateId": "uuid"
}
```

---

### GET /api/whatsapp/messages
جلب سجل الرسائل

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | رقم الصفحة |
| limit | number | عدد العناصر |
| status | string | SUCCESS, FAILED |
| leadId | string | فلترة بالعميل |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "uuid",
        "leadId": "uuid",
        "leadName": "أرامكو",
        "phone": "+966501234567",
        "message": "...",
        "status": "DELIVERED",
        "sentAt": "2026-01-01T10:30:00Z",
        "deliveredAt": "2026-01-01T10:30:05Z"
      }
    ],
    "stats": {
      "total": 100,
      "delivered": 95,
      "failed": 5
    }
  }
}
```

---

### GET /api/whatsapp/templates
جلب قوالب الرسائل

---

### POST /api/whatsapp/templates
إنشاء قالب جديد

**Request:**
```json
{
  "name": "تعريف عام",
  "content": "مرحباً ${name}..."
}
```

---

### PATCH /api/whatsapp/templates/:id
تحديث قالب

---

### DELETE /api/whatsapp/templates/:id
حذف قالب

---

### GET /api/whatsapp/status
حالة اتصال واتساب

**Response (200):**
```json
{
  "success": true,
  "data": {
    "connected": true,
    "phone": "+966501234567",
    "businessName": "ليدززز",
    "provider": "Meta Business API",
    "quotaRemaining": 950,
    "quotaLimit": 1000
  }
}
```

---

## 👥 Team API

### GET /api/team
جلب أعضاء الفريق

**Response (200):**
```json
{
  "success": true,
  "data": {
    "members": [
      {
        "id": "uuid",
        "name": "أحمد محمد",
        "email": "ahmed@leadz.sa",
        "role": "ADMIN",
        "status": "ONLINE",
        "avatar": "https://...",
        "joinedAt": "2023-01-01T00:00:00Z",
        "stats": {
          "deals": 12,
          "messages": 150
        }
      }
    ]
  }
}
```

---

### POST /api/team/invite
دعوة عضو جديد

**Request:**
```json
{
  "email": "new@leadz.sa",
  "role": "SALES"
}
```

---

### PATCH /api/team/:id/role
تغيير دور العضو

**Request:**
```json
{
  "role": "ADMIN"
}
```

---

### DELETE /api/team/:id
إزالة عضو

---

## 📊 Dashboard API

### GET /api/dashboard/stats
إحصائيات لوحة التحكم

**Response (200):**
```json
{
  "success": true,
  "data": {
    "totalLeads": 1203,
    "totalEvidence": 4852,
    "totalMessages": 856,
    "totalSearches": 45,
    "funnel": {
      "discovered": 12500,
      "prospected": 4200,
      "contacted": 1850,
      "opportunities": 450,
      "closed": 120
    },
    "weeklyActivity": [
      { "day": "السبت", "value": 40 },
      { "day": "الأحد", "value": 65 },
      ...
    ],
    "recentActivity": [
      {
        "type": "message",
        "content": "تم إرسال رسالة واتساب...",
        "time": "10:30 ص"
      }
    ]
  }
}
```

---

## 📝 Audit Logs API

### GET /api/audit-logs
جلب سجلات الرقابة

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | رقم الصفحة |
| limit | number | عدد العناصر |
| action | string | نوع الإجراء |
| userId | string | معرف المستخدم |
| from | date | من تاريخ |
| to | date | إلى تاريخ |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "uuid",
        "action": "تصدير بيانات",
        "user": {
          "id": "uuid",
          "name": "أحمد محمد"
        },
        "target": "قائمة الرياض",
        "details": {...},
        "timestamp": "2026-01-01T10:30:00Z",
        "ip": "192.168.1.1"
      }
    ],
    "riskAnalysis": {
      "suspiciousLogins": 0,
      "bulkDeletes": 2,
      "largeExports": 1
    }
  }
}
```

---

## ⚙️ Settings API

### GET /api/settings
جلب الإعدادات

**Response (200):**
```json
{
  "success": true,
  "data": {
    "profile": {
      "name": "أحمد محمد",
      "email": "ahmed@leadz.sa",
      "avatar": "https://..."
    },
    "notifications": {
      "searchCompletions": true,
      "salesReports": true,
      "whatsappStatus": true,
      "teamActivity": false
    },
    "security": {
      "twoFactorEnabled": false,
      "lastPasswordChange": "2025-06-01T00:00:00Z"
    }
  }
}
```

---

### PATCH /api/settings/profile
تحديث الملف الشخصي

---

### PATCH /api/settings/notifications
تحديث تفضيلات الإشعارات

---

### POST /api/settings/change-password
تغيير كلمة المرور

**Request:**
```json
{
  "currentPassword": "********",
  "newPassword": "********"
}
```

---

### POST /api/settings/enable-2fa
تفعيل التحقق بخطوتين

---

## 🔑 API Keys

### GET /api/api-keys
جلب مفاتيح API

---

### POST /api/api-keys
إنشاء مفتاح جديد

**Request:**
```json
{
  "label": "تطبيق الويب"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "label": "تطبيق الويب",
    "key": "lz_live_xxxxxxxxxxxxx",
    "createdAt": "2026-01-01T00:00:00Z"
  },
  "warning": "احفظ هذا المفتاح الآن، لن تتمكن من رؤيته مرة أخرى"
}
```

---

### DELETE /api/api-keys/:id
حذف مفتاح

---

## 🔗 Integrations API

### GET /api/integrations
جلب حالة التكاملات

**Response (200):**
```json
{
  "success": true,
  "data": {
    "integrations": [
      {
        "id": "whatsapp",
        "name": "Meta WhatsApp Business",
        "status": "CONNECTED",
        "lastSync": "2026-01-01T10:30:00Z",
        "config": {...}
      },
      {
        "id": "salesforce",
        "name": "Salesforce CRM",
        "status": "DISCONNECTED"
      }
    ]
  }
}
```

---

### POST /api/integrations/:id/connect
ربط تكامل

**Request:**
```json
{
  "credentials": {
    "apiKey": "xxx",
    "secret": "xxx"
  }
}
```

---

### POST /api/integrations/:id/disconnect
فصل تكامل

---

### POST /api/integrations/:id/sync
مزامنة البيانات

---

## 📡 Jobs API (WebSocket)

### WebSocket /ws/jobs
الاتصال بتحديثات المهام

**Message Types:**

```json
// Job Created
{
  "type": "JOB_CREATED",
  "data": {
    "id": "uuid",
    "type": "SEARCH",
    "status": "PENDING"
  }
}

// Job Progress
{
  "type": "JOB_PROGRESS",
  "data": {
    "id": "uuid",
    "progress": 50,
    "message": "جاري التحليل..."
  }
}

// Job Completed
{
  "type": "JOB_COMPLETED",
  "data": {
    "id": "uuid",
    "status": "SUCCESS",
    "result": {...}
  }
}
```

---

## 🔒 أمان الـ API

### Headers المطلوبة
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
Accept-Language: ar
X-Request-ID: <unique-id>
```

### Rate Limiting
| Endpoint | Limit |
|----------|-------|
| /api/search | 10/minute |
| /api/whatsapp/send | 100/hour |
| /api/leads/import | 5/hour |
| Default | 100/minute |

### Error Responses
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "رسالة الخطأ",
    "details": {...}
  }
}
```

### Error Codes
| Code | HTTP Status | Description |
|------|-------------|-------------|
| UNAUTHORIZED | 401 | غير مصرح |
| FORBIDDEN | 403 | ممنوع |
| NOT_FOUND | 404 | غير موجود |
| VALIDATION_ERROR | 400 | خطأ في البيانات |
| RATE_LIMITED | 429 | تجاوز الحد |
| SERVER_ERROR | 500 | خطأ في الخادم |

---

## 📦 External APIs Integration

### Google Maps Places API
```
GET https://maps.googleapis.com/maps/api/place/textsearch/json
  ?query={keyword}+in+{city}
  &key={API_KEY}
  &language=ar
```

### Meta WhatsApp Business API
```
POST https://graph.facebook.com/v18.0/{phone_number_id}/messages
Authorization: Bearer {ACCESS_TOKEN}

{
  "messaging_product": "whatsapp",
  "to": "{recipient_phone}",
  "type": "text",
  "text": { "body": "{message}" }
}
```

---

## 🔌 Agent/Runner API (v2)

> **قرار:** استخدام **WebSocket** للتواصل الحي بين Backend و Extension Runner.
> 
> **التبرير:** WebSocket يوفر اتصال ثنائي الاتجاه في الوقت الحقيقي، ضروري لـ:
> - إرسال Jobs فوري
> - تحديثات Progress حية
> - طلبات User Action فورية
> - معرفة حالة الاتصال

### WebSocket Connection

```
WS wss://api.leadz.sa/agent/ws
Headers:
  Authorization: Bearer <jwt-token>
  X-Extension-Version: 1.0.0
```

### GET /api/agent/config
الحصول على إعدادات الـ Agent

**Response (200):**
```json
{
  "success": true,
  "data": {
    "allowlist": [
      "https://www.google.com/maps/*",
      "https://maps.google.com/*",
      "https://www.linkedin.com/company/*",
      "https://www.linkedin.com/in/*"
    ],
    "featureFlags": {
      "connector_google_maps": true,
      "connector_web_search": true,
      "connector_website_crawl": true,
      "connector_social_public": true,
      "feature_reveal": true,
      "feature_whatsapp": true,
      "feature_ai_report": true
    },
    "connectorSettings": {
      "google_maps": {
        "requestsPerMinute": 10,
        "backoffMs": 5000,
        "maxRetries": 3
      },
      "web_search": {
        "requestsPerMinute": 5,
        "backoffMs": 10000,
        "maxRetries": 2
      },
      "website_crawl": {
        "requestsPerMinute": 20,
        "backoffMs": 2000,
        "maxRetries": 2,
        "maxPageSize": "5MB"
      },
      "social_public": {
        "requestsPerMinute": 3,
        "backoffMs": 20000,
        "maxRetries": 1
      }
    },
    "blocklist": [
      "*.gov.sa",
      "*.edu.sa",
      "*bank*",
      "*login*",
      "*auth*"
    ]
  }
}
```

---

### POST /api/agent/heartbeat
إرسال نبضة للإبقاء على الاتصال ومعرفة حالة الـ Agent

**Request:**
```json
{
  "extensionVersion": "1.0.0",
  "activeJobs": ["job-uuid-1", "job-uuid-2"],
  "status": "IDLE" | "BUSY" | "PAUSED"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "acknowledged": true,
    "serverTime": "2026-01-07T00:00:00Z"
  }
}
```

---

### POST /api/agent/jobs/:id/ack
تأكيد استلام Job

**Request:**
```json
{
  "accepted": true,
  "reason": null
}
```

أو للرفض:
```json
{
  "accepted": false,
  "reason": "BUSY" | "UNSUPPORTED_CONNECTOR" | "QUOTA_EXCEEDED"
}
```

**Response (200):**
```json
{
  "success": true
}
```

---

### POST /api/agent/jobs/:id/progress
إرسال تحديث التقدم

**Request:**
```json
{
  "stepId": 1,
  "progress": 50,
  "message": "جاري فحص الموقع..."
}
```

**Response (200):**
```json
{
  "success": true
}
```

---

### POST /api/agent/jobs/:id/logs
إرسال سجلات التنفيذ

**Request:**
```json
{
  "logs": [
    {
      "stepId": 1,
      "level": "INFO",
      "message": "بدء فحص الموقع",
      "data": { "url": "https://example.com" },
      "timestamp": "2026-01-07T00:00:00Z"
    },
    {
      "stepId": 1,
      "level": "WARN",
      "message": "الموقع بطيء",
      "data": { "loadTime": 5000 },
      "timestamp": "2026-01-07T00:00:05Z"
    }
  ]
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "logsReceived": 2
  }
}
```

---

### POST /api/agent/jobs/:id/evidence
إرسال دفعة من الأدلة

**Request:**
```json
{
  "stepId": 1,
  "evidence": [
    {
      "type": "WEBSITE",
      "title": "صفحة من نحن",
      "source": "example.com",
      "url": "https://example.com/about",
      "snippet": "شركة متخصصة في التقنية...",
      "confidence": "HIGH",
      "rawData": {
        "emails": ["info@example.com"],
        "phones": ["+966501234567"]
      }
    }
  ]
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "evidenceIds": ["evidence-uuid-1"],
    "evidenceCount": 1
  }
}
```

---

### POST /api/agent/jobs/:id/need-user-action
طلب تدخل المستخدم (Captcha/Login/Block)

**Request:**
```json
{
  "stepId": 1,
  "actionType": "CAPTCHA" | "LOGIN" | "VERIFICATION" | "BLOCKED",
  "message": "يرجى حل الـ Captcha للمتابعة",
  "tabId": 12345
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "timeout": 300
  }
}
```

---

### POST /api/agent/jobs/:id/complete
إكمال Job

**Request:**
```json
{
  "status": "SUCCESS" | "FAILED" | "PARTIAL_SUCCESS" | "CANCELLED",
  "summary": {
    "stepsCompleted": 3,
    "stepsTotal": 4,
    "evidenceCount": 12,
    "duration": 45000
  },
  "error": {
    "code": "BLOCKED",
    "message": "تم حظر الوصول",
    "stepId": 4
  }
}
```

**Response (200):**
```json
{
  "success": true
}
```

---

### POST /api/extension/resolve
تحليل الصفحة الحالية

**Request:**
```json
{
  "url": "https://www.linkedin.com/company/example",
  "pageTitle": "Example Company | LinkedIn",
  "pageContent": "..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "entityType": "LINKEDIN_COMPANY",
    "resolved": {
      "name": "Example Company",
      "industry": "Technology",
      "location": "Riyadh",
      "website": "https://example.com"
    },
    "existingLead": {
      "id": "lead-uuid",
      "status": "PROSPECTED"
    }
  }
}
```

---

### POST /api/extension/reveal
كشف بيانات التواصل

**Request:**
```json
{
  "leadId": "lead-uuid",
  "sourceUrl": "https://linkedin.com/in/example",
  "entityType": "LINKEDIN_PROFILE"
}
```

**Response (202):**
```json
{
  "success": true,
  "data": {
    "jobId": "job-uuid"
  }
}
```

**Job Complete Response (via WebSocket):**
```json
{
  "type": "JOB_COMPLETE",
  "payload": {
    "jobId": "job-uuid",
    "status": "SUCCESS",
    "result": {
      "phone": "+966501234567",
      "email": "contact@example.com",
      "confidence": "HIGH"
    }
  }
}
```

---

### POST /api/extension/save
حفظ سريع للـ CRM

**Request:**
```json
{
  "companyName": "Example Company",
  "industry": "Technology",
  "city": "Riyadh",
  "website": "https://example.com",
  "source": "EXTENSION",
  "sourceUrl": "https://linkedin.com/company/example"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "lead": {
      "id": "lead-uuid",
      "companyName": "Example Company",
      "status": "NEW"
    }
  }
}
```

---

### WebSocket Message Types

#### Backend → Extension

| Type | Purpose |
|------|---------|
| `JOB_DISPATCH` | إرسال Job للتنفيذ |
| `JOB_CANCEL` | إلغاء Job قيد التنفيذ |
| `CONFIG_UPDATE` | تحديث الإعدادات |

#### Extension → Backend

| Type | Purpose |
|------|---------|
| `JOB_ACK` | تأكيد استلام Job |
| `PROGRESS` | تحديث التقدم |
| `LOG` | إرسال سجل |
| `EVIDENCE_BATCH` | إرسال أدلة |
| `NEEDS_USER_ACTION` | طلب تدخل المستخدم |
| `USER_ACTION_RESOLVED` | تم حل المشكلة |
| `JOB_COMPLETE` | اكتمال Job |
| `HEARTBEAT` | نبضة الاتصال |

> **التفاصيل الكاملة:** [11-EXTENSION_RUNNER_SPEC.md](./11-EXTENSION_RUNNER_SPEC.md)

---

> **الوثيقة التالية:** [07-DEVELOPMENT-ROADMAP.md](./07-DEVELOPMENT-ROADMAP.md) - خارطة طريق التطوير
