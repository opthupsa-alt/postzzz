# 🧩 مرجع المكونات - ليدززز (Leedz)

> **الإصدار:** 1.0.0  
> **تاريخ الإنشاء:** يناير 2026

---

## 📋 فهرس المكونات

| # | المكون | الملف | الوظيفة |
|---|--------|-------|---------|
| 1 | AppShell | `AppShell.tsx` | الهيكل الرئيسي للتطبيق |
| 2 | PageHeader | `PageHeader.tsx` | رأس الصفحة |
| 3 | DataTable | `DataTable.tsx` | جدول البيانات |
| 4 | BulkActionsBar | `BulkActionsBar.tsx` | شريط الإجراءات الجماعية |
| 5 | SmartFilters | `SmartFilters.tsx` | الفلاتر الذكية |
| 6 | WhatsAppModal | `WhatsAppModal.tsx` | مودال إرسال واتساب |
| 7 | EvidenceList | `EvidenceList.tsx` | قائمة الأدلة |
| 8 | ReportViewer | `ReportViewer.tsx` | عارض التقرير |
| 9 | JobProgressWidget | `JobProgressWidget.tsx` | ويدجت تقدم المهام |
| 10 | NotificationToast | `NotificationToast.tsx` | إشعارات Toast |
| 11 | LeadGridCard | `LeadGridCard.tsx` | بطاقة العميل (شبكة) |
| 12 | EmptyState | `EmptyState.tsx` | حالة فارغة |
| 13 | SkeletonBlocks | `SkeletonBlocks.tsx` | هياكل التحميل |
| 14 | Guard | `Guard.tsx` | حماية الصفحات |
| 15 | ErrorBoundary | `ErrorBoundary.tsx` | معالجة الأخطاء |

---

## 1️⃣ AppShell

### المعلومات الأساسية
- **الملف:** `components/AppShell.tsx`
- **الوظيفة:** الهيكل الرئيسي للتطبيق مع القائمة الجانبية والـ Header

### الواجهة (Props)
```typescript
interface AppShellProps {
  children: React.ReactNode;
}
```

### الهيكل
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ┌─────────────┐  ┌─────────────────────────────────────┐  │
│  │             │  │ Header                              │  │
│  │  Sidebar    │  │ [بحث] [لغة] [Extension] [🔔] [👤]   │  │
│  │             │  ├─────────────────────────────────────┤  │
│  │  - Dashboard│  │                                     │  │
│  │  - Prospect │  │                                     │  │
│  │  - Leads    │  │         {children}                  │  │
│  │  - Lists    │  │                                     │  │
│  │  - WhatsApp │  │                                     │  │
│  │  ─────────  │  │                                     │  │
│  │  - Team     │  │                                     │  │
│  │  - Integrat │  │                                     │  │
│  │  - Audit    │  │                                     │  │
│  │  ─────────  │  │                                     │  │
│  │  - Settings │  ├─────────────────────────────────────┤  │
│  │  - Logout   │  │ JobProgressWidget                   │  │
│  │             │  │                                     │  │
│  └─────────────┘  └─────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### الحالات الداخلية
```typescript
const [isSidebarOpen, setSidebarOpen] = useState(false);      // حالة القائمة (موبايل)
const [showNotifications, setShowNotifications] = useState(false); // قائمة الإشعارات
const [showCommandPalette, setShowCommandPalette] = useState(false); // Command Palette
```

### الميزات
| الميزة | الوصف |
|--------|-------|
| Responsive Sidebar | قائمة جانبية تختفي على الموبايل |
| Command Palette | بحث سريع (Ctrl+K) |
| Notifications Dropdown | قائمة الإشعارات المنسدلة |
| Language Toggle | تبديل العربية/الإنجليزية |
| Extension Link | رابط لمعاينة الـ Extension |
| System Status | حالة النظام في الـ Sidebar |

### المكونات الفرعية
```typescript
const SidebarLink = ({ to, icon, label, active, onClick }) => (
  // رابط في القائمة الجانبية
);
```

---

## 2️⃣ PageHeader

### المعلومات الأساسية
- **الملف:** `components/PageHeader.tsx`
- **الوظيفة:** رأس موحد للصفحات

### الواجهة (Props)
```typescript
interface PageHeaderProps {
  title: string;           // العنوان الرئيسي
  subtitle?: string;       // العنوان الفرعي
  actions?: React.ReactNode; // أزرار الإجراءات
}
```

### الاستخدام
```tsx
<PageHeader 
  title="إدارة العملاء (CRM)" 
  subtitle="متابعة رحلة البيع وإدارة قاعدة بيانات عملائك"
  actions={
    <>
      <button>استيراد CSV</button>
      <button>إضافة عميل</button>
    </>
  }
/>
```

---

## 3️⃣ DataTable

### المعلومات الأساسية
- **الملف:** `components/DataTable.tsx`
- **الوظيفة:** جدول بيانات قابل للتخصيص مع اختيار متعدد

### الواجهة (Props)
```typescript
interface Column<T> {
  header: string;                    // عنوان العمود
  accessor: (item: T) => React.ReactNode; // دالة استخراج القيمة
  className?: string;                // CSS class
}

interface DataTableProps<T> {
  data: T[];                         // البيانات
  columns: Column<T>[];              // تعريف الأعمدة
  onRowClick?: (item: T) => void;    // عند النقر على صف
  selectedIds?: string[];            // المعرفات المختارة
  onSelectionChange?: (ids: string[]) => void; // عند تغيير الاختيار
  actions?: (item: T) => React.ReactNode; // أزرار الإجراءات
}
```

### الاستخدام
```tsx
const columns = [
  {
    header: 'العميل',
    accessor: (l: Lead) => <div>{l.companyName}</div>
  },
  {
    header: 'الحالة',
    accessor: (l: Lead) => <span>{l.status}</span>
  }
];

<DataTable 
  data={leads}
  columns={columns}
  onRowClick={(l) => navigate(`/app/leads/${l.id}`)}
  selectedIds={selectedIds}
  onSelectionChange={setSelectedIds}
  actions={(l) => (
    <>
      <button onClick={() => deleteLead(l.id)}>حذف</button>
    </>
  )}
/>
```

---

## 4️⃣ BulkActionsBar

### المعلومات الأساسية
- **الملف:** `components/BulkActionsBar.tsx`
- **الوظيفة:** شريط يظهر عند اختيار عناصر متعددة

### الواجهة (Props)
```typescript
interface BulkActionsBarProps {
  count: number;                     // عدد العناصر المختارة
  onClear: () => void;               // إلغاء الاختيار
  onSaveToList?: () => void;         // حفظ في قائمة
  onBulkWhatsApp?: () => void;       // واتساب جماعي
  onBulkDelete?: () => void;         // حذف جماعي
  onBulkApprove?: () => void;        // موافقة/Reveal
}
```

### السلوك
- يظهر فقط عندما `count > 0`
- يظهر في أسفل الشاشة (fixed bottom)
- أنيميشن دخول/خروج

### الاستخدام
```tsx
<BulkActionsBar 
  count={selectedIds.length} 
  onClear={() => setSelectedIds([])} 
  onSaveToList={() => setShowSaveModal(true)}
  onBulkWhatsApp={() => setShowWhatsApp(true)}
  onBulkDelete={handleBulkDelete}
/>
```

---

## 5️⃣ SmartFilters

### المعلومات الأساسية
- **الملف:** `components/SmartFilters.tsx`
- **الوظيفة:** فلاتر سريعة على شكل chips

### الواجهة (Props)
```typescript
interface SmartFiltersProps {
  onFilterChange: (filters: any) => void;  // عند تغيير الفلاتر
  activeFilters: any;                       // الفلاتر النشطة
}
```

### الفلاتر المتاحة
| الفلتر | الوصف |
|--------|-------|
| hasPhone | يوجد رقم هاتف |
| hasWebsite | يوجد موقع إلكتروني |
| status | حالة العميل (NEW/CONTACTED/QUALIFIED) |

### الاستخدام
```tsx
const [activeFilters, setActiveFilters] = useState({});

<SmartFilters 
  onFilterChange={setActiveFilters} 
  activeFilters={activeFilters} 
/>
```

---

## 6️⃣ WhatsAppModal

### المعلومات الأساسية
- **الملف:** `components/WhatsAppModal.tsx`
- **الوظيفة:** مودال إرسال رسالة واتساب

### الواجهة (Props)
```typescript
interface WhatsAppModalProps {
  isOpen: boolean;           // حالة الظهور
  onClose: () => void;       // إغلاق المودال
  leadName: string;          // اسم العميل
  phone?: string;            // رقم الهاتف
}
```

### الحالات الداخلية
```typescript
const [message, setMessage] = useState('...');      // نص الرسالة
const [sending, setSending] = useState(false);      // جاري الإرسال
const [success, setSuccess] = useState(false);      // تم الإرسال
const [isAiFilling, setIsAiFilling] = useState(false); // كتابة AI
```

### الميزات
| الميزة | الوصف |
|--------|-------|
| اختيار قالب | تطبيق قالب جاهز |
| كتابة AI | توليد رسالة ذكية من التقرير |
| استبدال المتغيرات | ${name} → اسم العميل |
| تسجيل النشاط | إضافة Activity للعميل |

### الاستخدام
```tsx
<WhatsAppModal 
  isOpen={showWhatsApp} 
  onClose={() => setShowWhatsApp(false)} 
  leadName={lead.companyName}
  phone={lead.phone}
/>
```

---

## 7️⃣ EvidenceList

### المعلومات الأساسية
- **الملف:** `components/EvidenceList.tsx`
- **الوظيفة:** عرض قائمة الأدلة الرقمية

### الواجهة (Props)
```typescript
interface EvidenceListProps {
  evidence: Evidence[];              // قائمة الأدلة
  onRunSurvey: () => void;           // تشغيل الفحص
  isLoading: boolean;                // حالة التحميل
  onViewDetail: (ev: Evidence) => void; // عرض التفاصيل
}
```

### الحالات
- **فارغة:** عرض رسالة + زر تشغيل الفحص
- **بها أدلة:** عرض قائمة الأدلة مع إمكانية النقر

### أيقونات الأنواع
| النوع | الأيقونة |
|-------|----------|
| WEBSITE | Globe |
| SOCIAL | Users |
| NEWS | FileText |
| REVIEWS | Star |

---

## 8️⃣ ReportViewer

### المعلومات الأساسية
- **الملف:** `components/ReportViewer.tsx`
- **الوظيفة:** عرض التقرير الذكي

### الواجهة (Props)
```typescript
interface ReportViewerProps {
  report: Report | undefined;
}
```

### الحالات
- **لا يوجد تقرير:** عرض رسالة + زر تشغيل الفحص
- **يوجد تقرير:** عرض الملخص + الأقسام

### ألوان مستويات الثقة
| المستوى | اللون |
|---------|-------|
| HIGH | أخضر |
| MEDIUM | أصفر |
| LOW | رمادي |

---

## 9️⃣ JobProgressWidget

### المعلومات الأساسية
- **الملف:** `components/JobProgressWidget.tsx`
- **الوظيفة:** عرض حالة المهام الجارية

### السلوك
- يظهر في أسفل يسار الشاشة (fixed)
- يعرض المهمة النشطة فقط
- يختفي عند عدم وجود مهام جارية

### الحالات المعروضة
| الحالة | العرض |
|--------|-------|
| RUNNING | شريط تقدم متحرك |
| SUCCESS | أيقونة ✓ خضراء |
| FAILED | أيقونة ✗ حمراء |

### الاستخدام
```tsx
// يُضاف تلقائياً في AppShell
<JobProgressWidget />
```

---

## 🔟 NotificationToast

### المعلومات الأساسية
- **الملف:** `components/NotificationToast.tsx`
- **الوظيفة:** عرض إشعارات Toast

### الدالة المصدرة
```typescript
export const showToast = (
  type: 'SUCCESS' | 'ERROR' | 'INFO' | 'JOB',
  title: string,
  message: string
) => void;
```

### أنواع الإشعارات
| النوع | اللون | الأيقونة |
|-------|-------|----------|
| SUCCESS | أخضر | CheckCircle |
| ERROR | أحمر | XCircle |
| INFO | أزرق | Info |
| JOB | بنفسجي | Zap |

### الاستخدام
```tsx
import { showToast } from '../components/NotificationToast';

showToast('SUCCESS', 'تم الحفظ', 'تم حفظ العميل بنجاح');
showToast('ERROR', 'خطأ', 'حدث خطأ أثناء الحفظ');
showToast('JOB', 'بدء البحث', 'جاري البحث عن عملاء...');
```

---

## 1️⃣1️⃣ LeadGridCard

### المعلومات الأساسية
- **الملف:** `components/LeadGridCard.tsx`
- **الوظيفة:** بطاقة عميل في عرض الشبكة

### الواجهة (Props)
```typescript
interface LeadGridCardProps {
  lead: Lead;
  selected: boolean;
  onClick: () => void;
  onSelect: (e: React.MouseEvent) => void;
}
```

### المحتوى
- Checkbox للاختيار
- أيقونة الشركة (الحرف الأول)
- اسم الشركة
- النشاط + المدينة
- أيقونات التواصل (هاتف/موقع)
- الوسوم (Tags)

---

## 1️⃣2️⃣ EmptyState

### المعلومات الأساسية
- **الملف:** `components/EmptyState.tsx`
- **الوظيفة:** عرض حالة فارغة

### الواجهة (Props)
```typescript
interface EmptyStateProps {
  icon: React.ComponentType<any>;  // أيقونة
  title: string;                    // العنوان
  description: string;              // الوصف
  action?: React.ReactNode;         // زر الإجراء
}
```

### الاستخدام
```tsx
<EmptyState 
  icon={Users} 
  title="لا يوجد عملاء مطابقين" 
  description="جرب تغيير كلمات البحث أو الفلاتر"
  action={
    <button onClick={() => navigate('/app/prospecting')}>
      بدء بحث جديد
    </button>
  }
/>
```

---

## 1️⃣3️⃣ SkeletonBlocks

### المعلومات الأساسية
- **الملف:** `components/SkeletonBlocks.tsx`
- **الوظيفة:** هياكل تحميل (Loading Skeletons)

### المكونات المصدرة
```typescript
export const TableSkeleton = () => (
  // هيكل تحميل للجدول
);

export const CardSkeleton = () => (
  // هيكل تحميل للبطاقة
);
```

### الاستخدام
```tsx
{isLoading ? <TableSkeleton /> : <DataTable ... />}
```

---

## 1️⃣4️⃣ Guard

### المعلومات الأساسية
- **الملف:** `components/Guard.tsx`
- **الوظيفة:** حماية الصفحات بناءً على الصلاحيات

### الواجهة (Props)
```typescript
interface GuardProps {
  role: 'ADMIN' | 'SALES';
  children: React.ReactNode;
}
```

### السلوك
- يتحقق من دور المستخدم الحالي
- يعرض المحتوى إذا كان مصرحاً
- يعرض رسالة "غير مصرح" إذا لم يكن مصرحاً

### الاستخدام
```tsx
<Guard role="ADMIN">
  <TeamPage />
</Guard>
```

---

## 1️⃣5️⃣ ErrorBoundary

### المعلومات الأساسية
- **الملف:** `components/ErrorBoundary.tsx`
- **الوظيفة:** التقاط وعرض الأخطاء

### الواجهة (Props)
```typescript
interface ErrorBoundaryProps {
  children: React.ReactNode;
}
```

### السلوك
- يلتقط أخطاء JavaScript في المكونات الفرعية
- يعرض واجهة خطأ بدلاً من تعطل التطبيق
- يوفر زر "إعادة المحاولة"

---

## 🎨 أنماط التصميم المشتركة

### الزوايا المستديرة
```css
rounded-xl      /* 0.75rem - صغير */
rounded-2xl     /* 1rem - متوسط */
rounded-3xl     /* 1.5rem - كبير */
rounded-[2rem]  /* 2rem - كبير جداً */
rounded-[2.5rem]/* 2.5rem - ضخم */
rounded-[3rem]  /* 3rem - ضخم جداً */
```

### الظلال
```css
shadow-sm                    /* ظل خفيف */
shadow-xl shadow-blue-100    /* ظل مع لون */
shadow-2xl                   /* ظل كبير */
```

### الخطوط
```css
font-bold       /* عريض */
font-black      /* أعرض */
text-xs         /* صغير جداً */
text-sm         /* صغير */
text-lg         /* كبير */
text-xl         /* كبير جداً */
text-2xl        /* ضخم */
text-3xl        /* ضخم جداً */
```

### الألوان الأساسية
```css
/* الأزرق - الإجراءات الرئيسية */
bg-blue-600 text-white
bg-blue-50 text-blue-600

/* الأخضر - النجاح، واتساب */
bg-green-600 text-white
bg-green-50 text-green-600

/* الأحمر - الحذف، الخطأ */
bg-red-600 text-white
bg-red-50 text-red-600

/* الرمادي - الخلفيات، النصوص الثانوية */
bg-gray-50 text-gray-600
bg-gray-900 text-white
```

### الأنيميشن
```css
animate-in fade-in duration-500
animate-in slide-in-from-bottom-4
animate-in zoom-in duration-300
animate-pulse
animate-spin
animate-bounce
```

---

## 📦 الاعتماديات

### الأيقونات (Lucide React)
```typescript
import { 
  Search, Users, MessageSquare, Settings, 
  Zap, ShieldCheck, Globe, Phone, Mail,
  CheckCircle2, XCircle, Info, Trash2,
  // ... المزيد
} from 'lucide-react';
```

### إدارة الحالة (Zustand)
```typescript
import { useStore } from '../store/useStore';

const { leads, addJob, updateJob } = useStore();
```

### التنقل (React Router)
```typescript
import { useNavigate, useParams, Link } from 'react-router-dom';

const navigate = useNavigate();
const { id } = useParams();
```

---

> **الوثيقة التالية:** [06-API-REQUIREMENTS.md](./06-API-REQUIREMENTS.md) - متطلبات الـ API
