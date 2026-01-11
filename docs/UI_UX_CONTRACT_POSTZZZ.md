# UI/UX Contract - Postzzz Social Ops

> **Version**: 1.0  
> **Created**: 2026-01-12  
> **Purpose**: Single Source of Truth لمنع التضارب

---

## 1. Design System Snapshot

### UI Libraries
| Library | Version | Path |
|---------|---------|------|
| React | 19 | `web/package.json` |
| Tailwind CSS | 3 | `web/tailwind.config.js` |
| Lucide React | Latest | Icons throughout |
| React Router | 6 | HashRouter in `web/App.tsx` |
| Zustand | Latest | `web/store/useStore.ts` |

### Core Components

| Component | Path | Purpose |
|-----------|------|---------|
| `AppShell` | `web/components/AppShell.tsx` | Main layout + sidebar |
| `AdminLayout` | `web/components/AdminLayout.tsx` | Admin panel layout |
| `DataTable` | `web/components/DataTable.tsx` | Generic table with selection |
| `EmptyState` | `web/components/EmptyState.tsx` | Empty state placeholder |
| `PageHeader` | `web/components/PageHeader.tsx` | Page title + actions |
| `UserRoute` | `web/components/UserRoute.tsx` | Auth guard |
| `SuperAdminRoute` | `web/components/SuperAdminRoute.tsx` | Super admin guard |
| `NotificationToast` | `web/components/NotificationToast.tsx` | Toast notifications |
| `JobProgressWidget` | `web/components/JobProgressWidget.tsx` | Floating job progress |

### UI Patterns

```typescript
// Card
"bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-6"

// Button Primary
"bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors"

// Button Secondary
"bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-bold hover:bg-gray-200"

// Input
"w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"

// Badge
"px-3 py-1 rounded-full text-xs font-bold"

// Table Header
"text-[10px] font-black text-gray-400 uppercase tracking-widest"

// Section Title
"text-[10px] font-black text-gray-400 uppercase tracking-widest"
```

---

## 2. Naming Dictionary (قاموس إلزامي)

| English | Arabic | DB Table | Notes |
|---------|--------|----------|-------|
| **Tenant** | الوكالة | `tenants` | = Agency (multi-tenant) |
| **Client** | العميل | `clients` | Client of the agency |
| **Platform** | المنصة | `client_platforms` | Social platform account |
| **Post** | المنشور | `posts` | Content to publish |
| **Variant** | النسخة | `post_variants` | Platform-specific version |
| **Media Asset** | الوسائط | `media_assets` | Images/Videos |
| **Publishing Job** | مهمة النشر | `publishing_jobs` | Scheduled publish task |
| **Publishing Run** | محاولة النشر | `publishing_runs` | Single attempt |
| **Device Agent** | جهاز النشر | `device_agents` | Chrome extension instance |
| **Approval** | الموافقة | - | Workflow status |
| **Lead** | العميل المحتمل | `leads` | (Legacy - search) |

### Platform Names (ثابتة)

| Code | Arabic | Icon |
|------|--------|------|
| `INSTAGRAM` | انستقرام | Instagram |
| `FACEBOOK` | فيسبوك | Facebook |
| `TWITTER` | تويتر/إكس | Twitter |
| `LINKEDIN` | لينكدإن | Linkedin |
| `TIKTOK` | تيك توك | - |
| `SNAPCHAT` | سناب شات | - |

### Status Names

| English | Arabic | Color |
|---------|--------|-------|
| `DRAFT` | مسودة | gray |
| `PENDING_APPROVAL` | بانتظار الموافقة | yellow |
| `APPROVED` | معتمد | blue |
| `SCHEDULED` | مجدول | purple |
| `PUBLISHING` | جاري النشر | orange |
| `PUBLISHED` | منشور | green |
| `FAILED` | فشل | red |
| `CANCELLED` | ملغي | gray |

---

## 3. Routes Map (خريطة إلزامية)

### Admin Routes (`/admin/*`)
```
/admin                    → AdminDashboard
/admin/tenants            → AdminTenants (list agencies)
/admin/tenants/:id        → AdminTenantDetail
/admin/users              → AdminUsers
/admin/plans              → AdminPlans
/admin/settings           → AdminSettings
```

### App Routes (`/app/*`)
```
/app/dashboard            → DashboardPage (overview)

# Clients
/app/clients              → ClientsPage (list)
/app/clients/new          → ClientFormPage (create)
/app/clients/:clientId    → ClientDetailPage (tabs)
/app/clients/:clientId/edit → ClientFormPage (edit)

# Posts & Calendar
/app/posts                → CalendarPage (calendar view)
/app/posts/new            → PostEditorPage (create)
/app/posts/:postId        → PostDetailPage (view)
/app/posts/:postId/edit   → PostEditorPage (edit)

# Publishing
/app/publishing           → PublishingPage (queue + runs)
/app/devices              → DevicesPage (agents list)

# Team & Settings
/app/team                 → TeamPage
/app/settings             → SettingsPage
/app/audit-logs           → AuditLogsPage

# Legacy (hidden when searchDisabled=true)
/app/prospecting          → ProspectingPage
/app/leads                → LeadsManagementPage
/app/lists                → ListsPage
```

---

## 4. RBAC Matrix

### Roles

| Role | Code | Description |
|------|------|-------------|
| Owner | `OWNER` | Full access |
| Admin | `ADMIN` | Manage team + settings |
| Content Manager | `MANAGER` | Create/edit posts |
| Approver | `APPROVER` | Approve posts (future) |
| Publisher | `PUBLISHER` | Run publishing (future) |
| Viewer | `SALES` | View only |

### Permissions Matrix

| Route | OWNER | ADMIN | MANAGER | SALES |
|-------|-------|-------|---------|-------|
| `/app/dashboard` | ✅ | ✅ | ✅ | ✅ |
| `/app/clients` | ✅ | ✅ | ✅ | 👁️ |
| `/app/clients/new` | ✅ | ✅ | ❌ | ❌ |
| `/app/clients/:id` | ✅ | ✅ | ✅ | 👁️ |
| `/app/posts` | ✅ | ✅ | ✅ | 👁️ |
| `/app/posts/new` | ✅ | ✅ | ✅ | ❌ |
| `/app/posts/:id/edit` | ✅ | ✅ | ✅* | ❌ |
| `/app/publishing` | ✅ | ✅ | 👁️ | 👁️ |
| `/app/devices` | ✅ | ✅ | ❌ | ❌ |
| `/app/team` | ✅ | ✅ | ❌ | ❌ |
| `/app/settings` | ✅ | ✅ | ❌ | ❌ |

**Legend**: ✅ Full | 👁️ View Only | ❌ No Access | * Own posts only

---

## 5. Sidebar Navigation (New)

```typescript
// Social Ops Navigation (replaces search-related items)
const socialOpsNav = [
  { to: '/app/dashboard', icon: LayoutDashboard, label: 'لوحة التحكم' },
  { to: '/app/clients', icon: Building2, label: 'العملاء' },
  { to: '/app/posts', icon: Calendar, label: 'التقويم' },
  { to: '/app/publishing', icon: Send, label: 'النشر' },
  { to: '/app/devices', icon: Smartphone, label: 'الأجهزة' },
];

const teamNav = [
  { to: '/app/team', icon: Users, label: 'الفريق' },
  { to: '/app/settings', icon: Settings, label: 'الإعدادات' },
  { to: '/app/audit-logs', icon: ShieldAlert, label: 'سجل الرقابة' },
];
```

---

## 6. Page Structure Template

Every new page MUST follow this structure:

```tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import EmptyState from '../components/EmptyState';

const ExamplePage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // API call
    setLoading(false);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <PageHeader 
        title="عنوان الصفحة"
        subtitle="وصف مختصر"
        actions={
          <button 
            onClick={() => navigate('/app/example/new')}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus size={20} />
            إضافة جديد
          </button>
        }
      />

      {data.length === 0 ? (
        <EmptyState 
          icon={Search}
          title="لا توجد بيانات"
          description="ابدأ بإضافة عنصر جديد"
          action={<button>إضافة</button>}
        />
      ) : (
        <DataTable 
          data={data}
          columns={[...]}
          onRowClick={(item) => navigate(`/app/example/${item.id}`)}
        />
      )}
    </div>
  );
};

export default ExamplePage;
```

---

## 7. API Service Pattern

```typescript
// web/lib/api.ts - Add new functions following this pattern

// === CLIENTS ===
export async function getClients(): Promise<Client[]> {
  const response = await fetch(`${API_BASE_URL}/clients`, {
    headers: getHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch clients');
  return response.json();
}

export async function getClient(id: string): Promise<Client> {
  const response = await fetch(`${API_BASE_URL}/clients/${id}`, {
    headers: getHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch client');
  return response.json();
}

export async function createClient(data: CreateClientDto): Promise<Client> {
  const response = await fetch(`${API_BASE_URL}/clients`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create client');
  return response.json();
}
```

---

## 8. Acceptance Criteria - Step 1

- [ ] All routes defined above work without errors
- [ ] No duplicate naming (check this document)
- [ ] UI consistent with existing design (same components)
- [ ] RBAC guards applied (at least basic UserRoute)
- [ ] Sidebar updated with Social Ops navigation
- [ ] Empty states for all new pages
