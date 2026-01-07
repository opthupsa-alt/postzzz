# 🐛 BUGS AND FIXES - Leedz Project

> **تاريخ التحديث:** 2026-01-07
> **الغرض:** قائمة الأخطاء الحالية مع Root Cause وخطوات الإصلاح

---

## 🔴 Priority Legend

| Priority | Meaning |
|----------|---------|
| 🔴 P0 | Critical - يمنع العمل الأساسي |
| 🟠 P1 | High - يؤثر على الوظائف الرئيسية |
| 🟡 P2 | Medium - مشكلة ملحوظة لكن يمكن التجاوز |
| 🟢 P3 | Low - تحسين أو مشكلة طفيفة |

---

## 🐛 Bug #1: Frontend Login لا يتصل بـ API

| Field | Value |
|-------|-------|
| **Priority** | 🔴 P0 |
| **Status** | Open |
| **Component** | Frontend |

### خطوات إعادة الإنتاج
1. افتح http://localhost:3000
2. اذهب لـ /login
3. أدخل أي email/password
4. اضغط "ابدأ العمل الآن"
5. **النتيجة:** ينتقل للـ Dashboard بدون تحقق حقيقي

### Root Cause
```typescript
// web/pages/LoginPage.tsx:12-19
const handleLogin = (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);
  // Simulate auth  ← المشكلة هنا: mock فقط
  setTimeout(() => {
    setIsLoading(false);
    navigate('/app/dashboard');
  }, 1500);
};
```

### Fix المقترح
```typescript
// web/pages/LoginPage.tsx
const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);
  setError('');
  
  try {
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'فشل تسجيل الدخول');
    }
    
    const data = await res.json();
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    navigate('/app/dashboard');
  } catch (err) {
    setError(err.message);
  } finally {
    setIsLoading(false);
  }
};
```

---

## 🐛 Bug #2: لا يوجد Auth Guard على Routes

| Field | Value |
|-------|-------|
| **Priority** | 🔴 P0 |
| **Status** | Open |
| **Component** | Frontend |

### خطوات إعادة الإنتاج
1. افتح http://localhost:3000/#/app/dashboard مباشرة
2. **النتيجة:** يظهر Dashboard بدون تسجيل دخول

### Root Cause
```typescript
// web/App.tsx:33-52
<Route path="/app/*" element={
  <AppShell>  // ← لا يوجد تحقق من auth
    <Routes>
      <Route path="dashboard" element={<DashboardPage />} />
      ...
    </Routes>
  </AppShell>
} />
```

### Fix المقترح
```typescript
// web/components/ProtectedRoute.tsx (جديد)
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

// web/App.tsx
<Route path="/app/*" element={
  <ProtectedRoute>
    <AppShell>
      <Routes>...</Routes>
    </AppShell>
  </ProtectedRoute>
} />
```

---

## 🐛 Bug #3: Extension يشير لـ Port خاطئ

| Field | Value |
|-------|-------|
| **Priority** | 🟠 P1 |
| **Status** | Open |
| **Component** | Extension |

### خطوات إعادة الإنتاج
1. حمّل Extension في Chrome
2. افتح Side Panel
3. حاول تسجيل الدخول
4. **النتيجة:** فشل الاتصال (port 8787 غير موجود)

### Root Cause
```javascript
// leedz_extension chrome/extension/dist/background.js:7
const DEFAULT_API_BASE = "http://localhost:8787";  // ← خطأ
```

### Fix المقترح
```javascript
// leedz_extension chrome/extension/dist/background.js:7
const DEFAULT_API_BASE = "http://localhost:3001";  // ← صحيح
```

**ملاحظة:** يجب أيضاً تحديث `panel.js:4`:
```javascript
apiBase: "http://localhost:3001",
```

---

## 🐛 Bug #4: Zustand Store يستخدم Mock Data

| Field | Value |
|-------|-------|
| **Priority** | 🟠 P1 |
| **Status** | Open |
| **Component** | Frontend |

### خطوات إعادة الإنتاج
1. افتح Dashboard
2. **النتيجة:** يظهر بيانات ثابتة (أرامكو، بنك الراجحي، إلخ)

### Root Cause
```typescript
// web/store/useStore.ts:72-76
savedLeads: [
  { id: 'CRM-1', companyName: 'أرامكو السعودية', ... },  // ← Mock
  { id: 'CRM-2', companyName: 'بنك الراجحي', ... },
  { id: 'CRM-3', companyName: 'مطاعم الرومانسية', ... }
],
```

### Fix المقترح
1. إنشاء API client module
2. إضافة actions لجلب البيانات من API
3. استبدال mock data بـ empty arrays
4. استدعاء fetch عند mount

---

## 🐛 Bug #5: Token يُفقد عند Refresh

| Field | Value |
|-------|-------|
| **Priority** | 🟠 P1 |
| **Status** | Open |
| **Component** | Frontend |

### خطوات إعادة الإنتاج
1. سجّل دخول (حالياً mock)
2. اضغط F5 أو refresh
3. **النتيجة:** يجب إعادة تسجيل الدخول

### Root Cause
لا يوجد أي استخدام لـ `localStorage` أو `sessionStorage` في الكود:
```bash
grep -r "localStorage" web/  # → 0 results
```

### Fix المقترح
1. حفظ token في localStorage عند login
2. قراءة token عند app mount
3. إضافة token لكل API request

---

## 🐛 Bug #6: VITE_API_BASE_URL معرّف لكن غير مستخدم

| Field | Value |
|-------|-------|
| **Priority** | 🟡 P2 |
| **Status** | Open |
| **Component** | Frontend |

### خطوات إعادة الإنتاج
1. افحص الكود
2. **النتيجة:** لا يوجد استخدام للمتغير في أي component

### Root Cause
```typescript
// web/vite.config.ts:16
'process.env.VITE_API_BASE_URL': JSON.stringify(env.VITE_API_BASE_URL || 'http://localhost:3001'),
```
لكن لا يوجد `fetch` أو `axios` يستخدمه.

### Fix المقترح
إنشاء API client:
```typescript
// web/lib/api.ts
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export async function apiRequest(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };
  
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
}
```

---

## 🐛 Bug #7: Tailwind CDN في Production

| Field | Value |
|-------|-------|
| **Priority** | 🟡 P2 |
| **Status** | Open |
| **Component** | Frontend |

### خطوات إعادة الإنتاج
1. افحص `web/index.html`
2. **النتيجة:** يستخدم CDN بدلاً من PostCSS

### Root Cause
```html
<!-- web/index.html:9 -->
<script src="https://cdn.tailwindcss.com"></script>
```

### Fix المقترح
1. إصلاح PostCSS config (استخدام tailwindcss بدلاً من @tailwindcss/postcss)
2. إزالة CDN script
3. التأكد من import index.css في index.tsx

---

## 🐛 Bug #8: Dev و Prod يستخدمان نفس Database

| Field | Value |
|-------|-------|
| **Priority** | 🟡 P2 |
| **Status** | Open |
| **Component** | Database |

### خطوات إعادة الإنتاج
1. شغّل smoke tests محلياً
2. **النتيجة:** بيانات الاختبار تُضاف لقاعدة البيانات الرئيسية

### Root Cause
```
api/.env → DATABASE_URL يشير لـ main branch في Neon
```

### Fix المقترح
1. إنشاء Neon Branch جديد باسم `dev-local`
2. تحديث api/.env ليشير للـ branch الجديد
3. توثيق سياسة DB في CONNECTION_GUIDE.md

---

## ✅ Bugs Fixed

### Bug #F1: Secrets Tracked in Git

| Field | Value |
|-------|-------|
| **Priority** | 🔴 P0 |
| **Status** | ✅ Fixed |
| **Fixed Date** | 2026-01-07 |

**Root Cause:** `ops/render-env-vars.env` was tracked

**Fix Applied:**
```bash
git rm --cached ops/render-env-vars.env
# Added to .gitignore: ops/*.env
```

---

### Bug #F2: Auth Login Returns 500

| Field | Value |
|-------|-------|
| **Priority** | 🔴 P0 |
| **Status** | ✅ Fixed |
| **Fixed Date** | 2026-01-07 (previous session) |

**Root Cause:** `bcrypt.compare` called on null user

**Fix Applied:** Added null check before bcrypt.compare in `auth.service.ts`

---

## 📊 Summary

| Priority | Open | Fixed | Total |
|----------|------|-------|-------|
| 🔴 P0 | 2 | 2 | 4 |
| 🟠 P1 | 3 | 0 | 3 |
| 🟡 P2 | 3 | 0 | 3 |
| 🟢 P3 | 0 | 0 | 0 |
| **Total** | **8** | **2** | **10** |

---

> **آخر تحديث:** 2026-01-07
