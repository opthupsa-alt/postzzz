# Development Workflow - Postzzz

> **Created**: 2026-01-12  
> **Status**: Active Development

---

## 🎯 طريقة العمل المتفق عليها

### البيئة المحلية (Local Development)
- **Backend (API)**: يعمل محلياً على `http://localhost:3001`
- **Frontend (Web)**: يعمل محلياً على `http://localhost:3000`
- **قاعدة البيانات**: **أونلاين** - Neon PostgreSQL (misty-waterfall-02005284)

### قاعدة ذهبية
```
┌─────────────────────────────────────────────────────────────────┐
│  🔴 لا ندفع Backend أو Frontend إلا بعد اكتمال المشروع         │
│  🟢 قاعدة البيانات أونلاين طوال الوقت                          │
│  🟢 التطوير محلي 100%                                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🗄️ قاعدة البيانات

### الجديدة (نستخدمها الآن)
- **Project**: `misty-waterfall-02005284`
- **Host**: `ep-old-snow-ahbyqmkf`
- **Console**: https://console.neon.tech/app/projects/misty-waterfall-02005284

### القديمة (ممنوع لمسها)
- **Host**: `ep-patient-forest-a4000zkv`
- ⚠️ **لا تستخدم هذه القاعدة أبداً**

---

## 🚀 تشغيل المشروع محلياً

### الطريقة السريعة
```powershell
cd d:\projects\postzzz
.\ops\sync-and-start.ps1
```

### الطريقة اليدوية

#### 1. Backend
```powershell
cd api
npm run dev
# يعمل على http://localhost:3001
```

#### 2. Frontend
```powershell
cd web
npm run dev
# يعمل على http://localhost:3000
```

---

## 📁 ملفات البيئة

| الملف | الغرض |
|-------|-------|
| `.env.master` | المصدر الرئيسي - Single Source of Truth |
| `api/.env` | إعدادات Backend |
| `web/.env.local` | إعدادات Frontend |

### المتغيرات الأساسية

```env
# Database (Online - Neon)
DATABASE_URL=postgresql://...@ep-old-snow-ahbyqmkf-pooler...
DATABASE_URL_UNPOOLED=postgresql://...@ep-old-snow-ahbyqmkf...

# API
API_PORT=3001
JWT_SECRET=...

# Web
VITE_API_BASE_URL=http://localhost:3001
```

---

## 🔄 Deployment (لاحقاً)

### عند اكتمال المشروع فقط:

| Service | Provider | Status |
|---------|----------|--------|
| Database | Neon | ✅ جاهز ومتصل |
| Backend | Render | ⏸️ ينتظر الاكتمال |
| Frontend | Vercel | ⏸️ ينتظر الاكتمال |
| Repo | GitHub | ✅ `opthupsa-alt/postzzz` |

### روابط الخدمات
- **Neon**: https://console.neon.tech/app/projects/misty-waterfall-02005284
- **Render**: https://dashboard.render.com/web/srv-d5i175q4d50c739d8h10
- **Vercel**: https://vercel.com/opthupsa-5935s-projects/postzzz
- **GitHub**: https://github.com/opthupsa-alt/postzzz

---

## ✅ Smoke Test Results (2026-01-12)

| Test | Status | Notes |
|------|--------|-------|
| Database Connection | ✅ | Neon misty-waterfall متصل |
| API Health | ✅ | http://localhost:3001/health |
| Web Loading | ✅ | http://localhost:3000 |
| Schema Sync | ✅ | prisma db push successful |
| User Login | ✅ | test@postzzz.com / Test@123 |
| Super Admin | ✅ | admin@postzzz.com / Admin@123 |

## 👤 حسابات الاختبار

| الدور | البريد | كلمة المرور |
|-------|--------|-------------|
| Super Admin | admin@postzzz.com | Admin@123 |
| Test User | test@postzzz.com | Test@123 |

---

## 📝 ملاحظات مهمة

1. **لا تدفع للـ Render أو Vercel** حتى يكتمل المشروع
2. **قاعدة البيانات أونلاين** - أي تغيير في Schema يؤثر مباشرة
3. **استخدم `prisma db push`** للتغييرات السريعة
4. **استخدم `prisma migrate dev`** للتغييرات الرسمية
5. **احذف `RENDER_ENV_SETUP.txt`** بعد إعداد Render
