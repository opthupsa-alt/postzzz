# Leedz - Project Status Report
> آخر تحديث: 2026-01-08

## نظرة عامة

**Leedz** هو نظام SaaS متعدد المستأجرين (Multi-tenant) لإدارة العملاء المحتملين (Leads) مع قدرات بحث ذكية وتكامل مع WhatsApp.

---

## 🏗️ البنية التقنية

### Backend (NestJS + Prisma + PostgreSQL)
- **المسار**: `api/`
- **المنفذ**: 3001
- **قاعدة البيانات**: PostgreSQL (Neon)

### Frontend (React + Vite + TailwindCSS)
- **المسار**: `web/`
- **المنفذ**: 3002

### Extension (Chrome)
- **المسار**: `extension/`
- **الحالة**: قيد التطوير

---

## 📊 حالة الوحدات

### ✅ مكتمل بالكامل (Production Ready)

| الوحدة | Backend | Frontend | ملاحظات |
|--------|---------|----------|---------|
| **Authentication** | ✅ | ✅ | Login, Signup, JWT, Guards |
| **Tenants** | ✅ | ✅ | CRUD + Status Management |
| **Users** | ✅ | ✅ | Team Management + Roles |
| **Leads** | ✅ | ✅ | CRUD + Bulk + Filters |
| **Lists** | ✅ | ✅ | Lead Organization |
| **Jobs** | ✅ | ✅ | Background Tasks |
| **Plans** | ✅ | ✅ | Subscription Plans |
| **Subscriptions** | ✅ | ✅ | Tenant Subscriptions |
| **Admin Dashboard** | ✅ | ✅ | Super Admin Panel |
| **Admin Data Bank** | ✅ | ✅ | Platform-wide Lead Analytics |
| **Invites** | ✅ | ⚠️ | Backend ready, Frontend partial |

### ⚠️ شبه مكتمل (Needs Integration)

| الوحدة | Backend | Frontend | المشكلة |
|--------|---------|----------|---------|
| **Reports** | ✅ | ⚠️ | Backend ready, Frontend uses mock data |
| **User Dashboard** | ✅ | ✅ | Connected to real API |
| **Team Page** | ✅ | ✅ | Connected to real API |
| **Audit Logs** | ✅ | ✅ | Connected to real API |
| **Settings Page** | ⚠️ | ⚠️ | Uses Zustand store, not API |
| **WhatsApp** | ❌ | ⚠️ | No backend, Frontend is UI only |

### ❌ غير مكتمل (Not Implemented)

| الوحدة | الحالة | الأولوية |
|--------|--------|----------|
| **Prospecting Search** | UI only, no real search | عالية |
| **WhatsApp Integration** | No Meta API integration | متوسطة |
| **Extension Runner** | Agent system incomplete | متوسطة |
| **Notifications** | Not implemented | منخفضة |
| **Billing/Payments** | Not implemented | منخفضة |

---

## 🔌 Backend APIs Status

### Auth Module (`/auth`)
| Endpoint | Method | Status |
|----------|--------|--------|
| `/auth/signup` | POST | ✅ |
| `/auth/login` | POST | ✅ |
| `/auth/me` | GET | ✅ |
| `/auth/refresh` | POST | ✅ |

### Admin Module (`/admin`)
| Endpoint | Method | Status |
|----------|--------|--------|
| `/admin/dashboard` | GET | ✅ |
| `/admin/tenants` | GET | ✅ |
| `/admin/tenants/:id` | GET | ✅ |
| `/admin/tenants/:id/status` | PATCH | ✅ |
| `/admin/tenants/:id` | DELETE | ✅ |
| `/admin/users` | GET | ✅ |
| `/admin/users/:id/status` | PATCH | ✅ |
| `/admin/users/:id/super-admin` | PATCH | ✅ |
| `/admin/plans` | POST | ✅ |
| `/admin/plans/:id` | PATCH | ✅ |
| `/admin/settings` | GET/PATCH | ✅ |
| `/admin/data-bank/stats` | GET | ✅ |
| `/admin/data-bank/leads` | GET | ✅ |
| `/admin/data-bank/leads/:id` | GET | ✅ |
| `/admin/data-bank/filters` | GET | ✅ |
| `/admin/data-bank/export` | GET | ✅ |

### Leads Module (`/leads`)
| Endpoint | Method | Status |
|----------|--------|--------|
| `/leads` | GET | ✅ |
| `/leads` | POST | ✅ |
| `/leads/bulk` | POST | ✅ |
| `/leads/count` | GET | ✅ |
| `/leads/:id` | GET | ✅ |
| `/leads/:id` | PATCH | ✅ |
| `/leads/:id` | DELETE | ✅ |

### Lists Module (`/lists`)
| Endpoint | Method | Status |
|----------|--------|--------|
| `/lists` | GET/POST | ✅ |
| `/lists/:id` | GET/PATCH/DELETE | ✅ |
| `/lists/:id/leads` | POST/DELETE | ✅ |

### Jobs Module (`/jobs`)
| Endpoint | Method | Status |
|----------|--------|--------|
| `/jobs` | GET/POST | ✅ |
| `/jobs/:id` | GET | ✅ |
| `/jobs/:id/cancel` | POST | ✅ |

### Reports Module (`/reports`)
| Endpoint | Method | Status |
|----------|--------|--------|
| `/reports` | GET/POST | ✅ |
| `/reports/:id` | GET/PATCH/DELETE | ✅ |
| `/reports/:id/generate` | POST | ✅ |

### Users Module (`/users`)
| Endpoint | Method | Status |
|----------|--------|--------|
| `/users/team` | GET | ✅ |
| `/users/:id/role` | PATCH | ✅ |
| `/users/:id` | DELETE | ✅ |

### Invites Module (`/invites`)
| Endpoint | Method | Status |
|----------|--------|--------|
| `/invites` | GET/POST | ✅ |
| `/invites/:token/accept` | POST | ✅ |
| `/invites/:id` | DELETE | ✅ |

### Subscriptions Module (`/subscriptions`)
| Endpoint | Method | Status |
|----------|--------|--------|
| `/subscriptions` | GET | ✅ |
| `/subscriptions/tenant/:id` | GET | ✅ |
| `/subscriptions/tenant/:id/plan` | PATCH | ✅ |
| `/subscriptions/tenant/:id/cancel` | POST | ✅ |

### Plans Module (`/plans`)
| Endpoint | Method | Status |
|----------|--------|--------|
| `/plans` | GET | ✅ |
| `/plans/:id` | GET | ✅ |

---

## 🖥️ Frontend Pages Status

### Auth Pages
| Page | File | Status |
|------|------|--------|
| Login | `LoginPage.tsx` | ✅ |
| Signup | `SignupPage.tsx` | ✅ |
| Forgot Password | `ForgotPasswordPage.tsx` | ✅ UI only |

### User Panel (`/app/*`)
| Page | File | Status | Issue |
|------|------|--------|-------|
| Dashboard | `DashboardPage.tsx` | ⚠️ | Stats hardcoded |
| Prospecting | `ProspectingPage.tsx` | ⚠️ | No real search |
| Leads | `LeadsManagementPage.tsx` | ✅ | Connected to API |
| Lead Detail | `LeadDetailPage.tsx` | ✅ | Connected to API |
| New Lead | `NewLeadPage.tsx` | ✅ | Connected to API |
| Lead Import | `LeadImportPage.tsx` | ✅ | Connected to API |
| Lists | `ListsPage.tsx` | ✅ | Connected to API |
| List Detail | `ListDetailPage.tsx` | ✅ | Connected to API |
| WhatsApp | `WhatsAppMessagesPage.tsx` | ⚠️ | UI only, no API |
| Team | `TeamPage.tsx` | ⚠️ | Uses Zustand, not API |
| Settings | `SettingsPage.tsx` | ⚠️ | Uses Zustand, not API |
| Integrations | `IntegrationsPage.tsx` | ⚠️ | UI only |
| Audit Logs | `AuditLogsPage.tsx` | ⚠️ | Mock data |

### Admin Panel (`/admin/*`)
| Page | File | Status |
|------|------|--------|
| Dashboard | `AdminDashboard.tsx` | ✅ |
| Tenants | `AdminTenants.tsx` | ✅ |
| Tenant Detail | `AdminTenantDetail.tsx` | ✅ |
| Users | `AdminUsers.tsx` | ✅ |
| Data Bank | `AdminDataBank.tsx` | ✅ |
| Plans | `AdminPlans.tsx` | ✅ |
| Subscriptions | `AdminSubscriptions.tsx` | ✅ |
| Settings | `AdminSettings.tsx` | ✅ |

---

## 🔐 الأدوار والصلاحيات

### User Roles
| Role | Description |
|------|-------------|
| `OWNER` | مالك المنظمة - كل الصلاحيات |
| `ADMIN` | مدير - معظم الصلاحيات |
| `MANAGER` | مدير فريق - صلاحيات محدودة |
| `SALES` | مندوب مبيعات - صلاحيات أساسية |

### Super Admin
- `isSuperAdmin: true` في جدول Users
- وصول كامل لـ `/admin/*`
- لا يحتاج لعضوية في أي منظمة

---

## 🗄️ Database Models

| Model | Records | Status |
|-------|---------|--------|
| Tenant | 2+ | ✅ |
| User | 5+ | ✅ |
| Membership | 5+ | ✅ |
| Lead | 773+ | ✅ |
| List | 1+ | ✅ |
| Job | 50+ | ✅ |
| Plan | 3 | ✅ |
| Subscription | 2+ | ✅ |
| Report | 0 | ⚠️ |
| Invite | 0 | ⚠️ |
| AuditLog | 0 | ⚠️ |

---

## 🚀 بيانات الاختبار

### Super Admin
```
Email: admin@optarget.com
Password: Admin@123
```

### Regular User
```
Email: testuser123@test.com
Password: Test@123
```

---

## 📁 هيكل المشروع

```
leedz/
├── api/                    # Backend (NestJS)
│   ├── src/
│   │   ├── admin/         # Super Admin APIs
│   │   ├── auth/          # Authentication
│   │   ├── leads/         # Leads CRUD
│   │   ├── lists/         # Lists CRUD
│   │   ├── jobs/          # Background Jobs
│   │   ├── users/         # User Management
│   │   ├── tenants/       # Tenant Management
│   │   ├── plans/         # Subscription Plans
│   │   ├── subscriptions/ # Subscriptions
│   │   ├── reports/       # AI Reports
│   │   ├── invites/       # Team Invites
│   │   └── common/        # Guards, Decorators
│   └── prisma/            # Database Schema
├── web/                    # Frontend (React)
│   ├── pages/
│   │   ├── admin/         # Super Admin Pages
│   │   └── *.tsx          # User Pages
│   ├── components/        # Shared Components
│   ├── lib/               # API Client
│   └── store/             # Zustand Store
├── extension/             # Chrome Extension
└── docs/                  # Documentation
```
