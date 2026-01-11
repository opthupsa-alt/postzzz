# 04_UI_STACK_GUIDE.md - دليل واجهة المستخدم

> **Generated**: 2026-01-12  
> **Source**: `web/`  
> **Purpose**: Phase 0 - فهم المشروع من الكود

---

## 1. Technology Stack

| Library | Version | Purpose |
|---------|---------|---------|
| **React** | 19 | UI Framework |
| **React Router** | 6 | Routing (HashRouter) |
| **Zustand** | Latest | State Management |
| **Tailwind CSS** | 3 | Styling |
| **Lucide React** | Latest | Icons |
| **Vite** | 6 | Build Tool |

---

## 2. Project Structure

```
web/
├── App.tsx              # Main router
├── index.tsx            # Entry point
├── index.css            # Global styles
├── index.html           # HTML template
├── components/          # Reusable components
│   ├── AppShell.tsx     # Main layout
│   ├── AdminLayout.tsx  # Admin panel layout
│   ├── UserRoute.tsx    # Auth guard
│   ├── SuperAdminRoute.tsx
│   └── ...
├── pages/               # Page components
│   ├── DashboardPage.tsx
│   ├── ProspectingPage.tsx
│   ├── LeadsManagementPage.tsx
│   ├── admin/           # Admin pages
│   └── ...
├── lib/                 # Utilities
│   └── api.ts           # API client
├── store/               # State management
│   └── useStore.ts      # Zustand store
└── types.ts             # TypeScript types
```

---

## 3. Routing

**Path**: `web/App.tsx:39-95`

### Router Type
```typescript
import { HashRouter as Router } from 'react-router-dom';
```

Uses **HashRouter** (`/#/path`) for compatibility with static hosting.

### Route Structure

```typescript
<Router>
  <Routes>
    {/* Public Routes */}
    <Route path="/login" element={<LoginPage />} />
    <Route path="/signup" element={<SignupPage />} />
    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
    <Route path="/reset-password" element={<ResetPasswordPage />} />
    <Route path="/invite/:token" element={<AcceptInvitePage />} />
    
    {/* Redirect */}
    <Route path="/" element={<Navigate to="/app/dashboard" replace />} />
    
    {/* Admin Routes - Super Admin Only */}
    <Route path="/admin" element={<SuperAdminRoute><AdminLayout /></SuperAdminRoute>}>
      <Route index element={<AdminDashboard />} />
      <Route path="tenants" element={<AdminTenants />} />
      {/* ... */}
    </Route>
    
    {/* User Routes - Regular Users */}
    <Route path="/app/*" element={<UserRoute><AppShell>...</AppShell></UserRoute>}>
      <Route path="dashboard" element={<DashboardPage />} />
      <Route path="prospecting" element={<ProspectingPage />} />
      {/* ... */}
    </Route>
  </Routes>
</Router>
```

---

## 4. State Management (Zustand)

**Path**: `web/store/useStore.ts`

### Store Structure

```typescript
interface AppState {
  // Auth
  user: User | null;
  token: string | null;
  tenant: Tenant | null;
  role: string | null;
  
  // UI
  language: 'ar' | 'en';
  sidebarOpen: boolean;
  notifications: Notification[];
  
  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setTenant: (tenant: Tenant | null) => void;
  toggleLanguage: () => void;
  addNotification: (notification: Notification) => void;
  clearNotifications: () => void;
}

export const useStore = create<AppState>((set) => ({
  // Initial state
  user: null,
  token: null,
  tenant: null,
  role: null,
  language: 'ar',
  sidebarOpen: true,
  notifications: [],
  
  // Actions
  setUser: (user) => set({ user }),
  setToken: (token) => set({ token }),
  // ...
}));
```

### Usage

```typescript
import { useStore } from '../store/useStore';

const MyComponent = () => {
  const { user, language, toggleLanguage } = useStore();
  // ...
};
```

---

## 5. API Client

**Path**: `web/lib/api.ts`

### Base Configuration

```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

const getHeaders = () => {
  const token = localStorage.getItem('leedz_token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};
```

### API Functions Pattern

```typescript
// Example: Get leads
export async function getLeads(params?: LeadsParams): Promise<Lead[]> {
  const query = new URLSearchParams(params as any).toString();
  const response = await fetch(`${API_BASE_URL}/leads?${query}`, {
    headers: getHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch leads');
  return response.json();
}

// Example: Create lead
export async function createLead(data: CreateLeadDto): Promise<Lead> {
  const response = await fetch(`${API_BASE_URL}/leads`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create lead');
  return response.json();
}
```

### Auth Functions
**Path**: `web/lib/api.ts:1-50`

```typescript
export async function login(email: string, password: string) { ... }
export async function signup(data: SignupDto) { ... }
export function logout() { ... }
export function getStoredUser() { ... }
export function getStoredToken() { ... }
```

---

## 6. Main Layout (AppShell)

**Path**: `web/components/AppShell.tsx`

### Structure

```typescript
const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex min-h-screen bg-[#fcfcfd]" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Notification Toast */}
      <NotificationToast />
      
      {/* Mobile Overlay */}
      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 ..." />}
      
      {/* Command Palette (Cmd+K) */}
      {showCommandPalette && <CommandPalette />}
      
      {/* Sidebar */}
      <aside className="fixed right-0 top-0 h-screen w-72 ...">
        {/* Logo */}
        {/* Navigation Links */}
        {/* User Profile */}
      </aside>
      
      {/* Main Content */}
      <main className="flex-1 mr-72 ...">
        {/* Header */}
        {/* Page Content */}
        {children}
      </main>
      
      {/* Job Progress Widget */}
      <JobProgressWidget />
    </div>
  );
};
```

### Sidebar Links
**Path**: `web/components/AppShell.tsx:86-100`

```typescript
const navLinks = [
  { to: '/app/dashboard', icon: LayoutDashboard, label: 'لوحة التحكم' },
  { to: '/app/prospecting', icon: Search, label: 'البحث عن عملاء' },
  { to: '/app/leads', icon: Users, label: 'العملاء المحتملين' },
  { to: '/app/lists', icon: ListTodo, label: 'القوائم الذكية' },
  { to: '/app/whatsapp', icon: MessageSquare, label: 'رسائل واتساب' },
  { to: '/app/team', icon: ShieldCheck, label: 'الفريق' },
  { to: '/app/settings', icon: Settings, label: 'الإعدادات' },
];
```

---

## 7. Component Patterns

### Page Component

```typescript
// web/pages/ExamplePage.tsx
import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { getSomeData } from '../lib/api';

const ExamplePage: React.FC = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useStore();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const result = await getSomeData();
      setData(result);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Page Title</h1>
      {/* Content */}
    </div>
  );
};

export default ExamplePage;
```

### Reusable Component

```typescript
// web/components/Card.tsx
interface CardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ title, children, className = '' }) => (
  <div className={`bg-white rounded-2xl shadow-sm p-6 ${className}`}>
    <h3 className="text-lg font-bold mb-4">{title}</h3>
    {children}
  </div>
);
```

---

## 8. Styling Patterns

### Tailwind Classes

```typescript
// Common patterns used in the codebase

// Card
"bg-white rounded-2xl shadow-sm p-6"

// Button Primary
"bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors"

// Button Secondary
"bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors"

// Input
"w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"

// Table Header
"text-xs font-black text-gray-400 uppercase tracking-wider"

// Badge
"px-3 py-1 rounded-full text-xs font-bold"
```

### RTL Support

```typescript
// In AppShell.tsx
<div dir={language === 'ar' ? 'rtl' : 'ltr'}>

// Conditional classes
className={`${language === 'ar' ? 'font-arabic' : 'font-sans'}`}

// Margin/padding direction
"mr-72"  // margin-right for RTL sidebar
"ml-72"  // margin-left for LTR sidebar
```

---

## 9. Auth Guards

### UserRoute
**Path**: `web/components/UserRoute.tsx`

```typescript
const UserRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = getStoredToken();
  const user = getStoredUser();
  
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }
  
  // Super admins go to admin panel
  if (user.isSuperAdmin) {
    return <Navigate to="/admin" replace />;
  }
  
  return <>{children}</>;
};
```

### SuperAdminRoute
**Path**: `web/components/SuperAdminRoute.tsx`

```typescript
const SuperAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const user = getStoredUser();
  
  if (!user?.isSuperAdmin) {
    return <Navigate to="/app/dashboard" replace />;
  }
  
  return <>{children}</>;
};
```

---

## 10. Adding New Pages

### Steps

1. **Create Page Component**
   ```typescript
   // web/pages/NewPage.tsx
   const NewPage: React.FC = () => {
     return <div>New Page Content</div>;
   };
   export default NewPage;
   ```

2. **Add Route in App.tsx**
   ```typescript
   // web/App.tsx
   import NewPage from './pages/NewPage';
   
   // Inside Routes
   <Route path="new-page" element={<NewPage />} />
   ```

3. **Add Sidebar Link (if needed)**
   ```typescript
   // web/components/AppShell.tsx
   { to: '/app/new-page', icon: SomeIcon, label: 'صفحة جديدة' },
   ```

4. **Add API Functions (if needed)**
   ```typescript
   // web/lib/api.ts
   export async function getNewPageData() { ... }
   ```

---

## 11. Icons (Lucide)

**Import Pattern**:
```typescript
import { 
  LayoutDashboard, 
  Search, 
  Users, 
  Settings,
  // ... 
} from 'lucide-react';
```

**Usage**:
```typescript
<Search size={20} className="text-gray-400" />
```

---

## 12. Key Components

| Component | Path | Purpose |
|-----------|------|---------|
| `AppShell` | `components/AppShell.tsx` | Main layout with sidebar |
| `AdminLayout` | `components/AdminLayout.tsx` | Admin panel layout |
| `UserRoute` | `components/UserRoute.tsx` | Auth guard for users |
| `SuperAdminRoute` | `components/SuperAdminRoute.tsx` | Auth guard for admins |
| `JobProgressWidget` | `components/JobProgressWidget.tsx` | Floating job progress |
| `NotificationToast` | `components/NotificationToast.tsx` | Toast notifications |
| `ExtensionButton` | `components/ExtensionButton.tsx` | Extension status button |

---

## 13. For Social Ops - New Pages Needed

| Page | Route | Purpose |
|------|-------|---------|
| ClientsPage | `/app/clients` | Client management |
| ClientDetailPage | `/app/clients/:id` | Client details |
| PostsPage | `/app/posts` | Posts management |
| PostEditorPage | `/app/posts/new` | Create/edit post |
| CalendarPage | `/app/calendar` | Content calendar |
| PublishingPage | `/app/publishing` | Publishing jobs |
| DevicesPage | `/app/devices` | Device agents |
