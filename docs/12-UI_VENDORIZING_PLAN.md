# 📦 خطة نقل UI للـ Extension - Analysis Pack v2

> **الإصدار:** 2.0.0  
> **تاريخ الإنشاء:** يناير 2026  
> **الحالة:** تصميم نهائي - جاهز للتنفيذ

---

## 📋 ملخص تنفيذي

هذا المستند يُعرّف خطة نقل/سحب UI الويب الحالي إلى الـ Extension مع الحفاظ على استقلالية الـ Extension الكاملة.

### الهدف

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              GOAL                                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  نفس الشكل/المظهر/المحتوى البصري                                        │
│  Same Look & Feel                                                        │
│                                                                          │
│  ┌─────────────────────┐         ┌─────────────────────┐               │
│  │                     │         │                     │               │
│  │    Web App UI       │   ═══   │   Extension UI      │               │
│  │                     │         │                     │               │
│  │  - Same colors      │         │  - Same colors      │               │
│  │  - Same fonts       │         │  - Same fonts       │               │
│  │  - Same components  │         │  - Same components  │               │
│  │  - Same RTL         │         │  - Same RTL         │               │
│  │                     │         │                     │               │
│  └─────────────────────┘         └─────────────────────┘               │
│                                                                          │
│  BUT: Extension is 100% independent at runtime                          │
│       No imports from webapp, no shared runtime                         │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Approach A: Vendoring at Build-time (Preferred)

### المفهوم

```
Build-time Copy:
webapp/src/components/* ──► extension/src/ui/components/*
webapp/src/styles/*     ──► extension/src/ui/styles/*
webapp/src/assets/*     ──► extension/src/ui/assets/*

Result: Extension has its own copy, no runtime dependency
```

### قائمة الملفات المطلوب نسخها

#### 1. Components (من `web/components/`)

| Component | File | Priority | Notes |
|-----------|------|----------|-------|
| PageHeader | `PageHeader.tsx` | HIGH | Used in all views |
| DataTable | `DataTable.tsx` | HIGH | For lists display |
| StatCard | `StatCard.tsx` | MEDIUM | For stats |
| WhatsAppModal | `WhatsAppModal.tsx` | HIGH | WhatsApp send |
| JobProgressWidget | `JobProgressWidget.tsx` | HIGH | Job status |
| NotificationToast | `NotificationToast.tsx` | HIGH | Toasts |
| Guard | `Guard.tsx` | HIGH | Permission checks |
| SmartFilters | `SmartFilters.tsx` | MEDIUM | Filtering |
| BulkActionsBar | `BulkActionsBar.tsx` | LOW | Bulk actions |

#### 2. Pages (من `web/pages/`)

| Page | File | Priority | Adaptation Needed |
|------|------|----------|-------------------|
| ExtensionSidePanel | `ExtensionSidePanel.tsx` | CRITICAL | Base for Side Panel |
| LeadDetailPage | `LeadDetailPage.tsx` | HIGH | Lead view (simplified) |
| - | - | - | Other pages NOT needed |

#### 3. Styles

| Item | Source | Notes |
|------|--------|-------|
| Design Tokens | Inline TailwindCSS | Extract to CSS variables |
| RTL Support | Inline styles | Keep as-is |
| Colors | Inline | Extract to theme file |
| Fonts | System fonts | No change needed |

#### 4. Assets

| Asset | Source | Notes |
|-------|--------|-------|
| Logo | `assets/logo.svg` | Copy |
| Icons | Lucide React | Keep dependency |
| i18n | `locales/*.json` | Copy if exists |

### Vendoring Script

```javascript
// scripts/vendor-ui.js
const fs = require('fs-extra');
const path = require('path');

const WEBAPP_SRC = path.resolve(__dirname, '../web');
const EXTENSION_UI = path.resolve(__dirname, '../extension/src/ui');

const ALLOWLIST = {
  components: [
    'PageHeader.tsx',
    'DataTable.tsx',
    'StatCard.tsx',
    'WhatsAppModal.tsx',
    'JobProgressWidget.tsx',
    'NotificationToast.tsx',
    'Guard.tsx',
    'SmartFilters.tsx'
  ],
  pages: [
    'ExtensionSidePanel.tsx'
  ],
  assets: [
    'logo.svg'
  ]
};

async function vendorUI() {
  console.log('🔄 Vendoring UI from webapp to extension...');
  
  // Clean destination
  await fs.emptyDir(EXTENSION_UI);
  
  // Copy components
  for (const file of ALLOWLIST.components) {
    const src = path.join(WEBAPP_SRC, 'components', file);
    const dest = path.join(EXTENSION_UI, 'components', file);
    
    if (await fs.pathExists(src)) {
      await fs.copy(src, dest);
      console.log(`  ✅ ${file}`);
    } else {
      console.log(`  ⚠️ ${file} not found`);
    }
  }
  
  // Copy pages
  for (const file of ALLOWLIST.pages) {
    const src = path.join(WEBAPP_SRC, 'pages', file);
    const dest = path.join(EXTENSION_UI, 'pages', file);
    
    if (await fs.pathExists(src)) {
      await fs.copy(src, dest);
      console.log(`  ✅ ${file}`);
    }
  }
  
  // Copy assets
  for (const file of ALLOWLIST.assets) {
    const src = path.join(WEBAPP_SRC, 'assets', file);
    const dest = path.join(EXTENSION_UI, 'assets', file);
    
    if (await fs.pathExists(src)) {
      await fs.copy(src, dest);
      console.log(`  ✅ ${file}`);
    }
  }
  
  console.log('✅ Vendoring complete!');
}

vendorUI().catch(console.error);
```

### Import Transformation

بعد النسخ، يجب تعديل imports:

```typescript
// BEFORE (in webapp)
import { useStore } from '../store/useStore';
import { showToast } from '../utils/toast';

// AFTER (in extension)
import { useExtensionStore } from '../store/useExtensionStore';
import { showToast } from '../utils/toast';
```

**Transformation Script:**

```javascript
// scripts/transform-imports.js
const replace = require('replace-in-file');

const TRANSFORMS = [
  {
    from: /from ['"]\.\.\/store\/useStore['"]/g,
    to: "from '../store/useExtensionStore'"
  },
  {
    from: /from ['"]\.\.\/\.\.\/store\/useStore['"]/g,
    to: "from '../../store/useExtensionStore'"
  },
  {
    from: /useNavigate\(\)/g,
    to: 'useExtensionNavigate()'
  },
  {
    from: /import \{ useNavigate \} from ['"]react-router-dom['"]/g,
    to: "import { useExtensionNavigate } from '../hooks/useExtensionNavigate'"
  }
];

async function transformImports() {
  for (const transform of TRANSFORMS) {
    await replace({
      files: 'extension/src/ui/**/*.tsx',
      from: transform.from,
      to: transform.to
    });
  }
}
```

### Extension Store (Replacement for Zustand)

```typescript
// extension/src/store/useExtensionStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface ExtensionState {
  // Auth
  auth: {
    token: string | null;
    user: User | null;
    tenant: Tenant | null;
  };
  
  // Current context
  currentLead: Lead | null;
  currentEvidence: Evidence[];
  currentReport: Report | null;
  
  // Jobs
  activeJobs: Job[];
  
  // UI
  sidePanel: {
    activeTab: 'overview' | 'contacts' | 'evidence' | 'activity';
    isRevealing: boolean;
    isSurveying: boolean;
  };
  
  // Actions
  setAuth: (auth: AuthState) => void;
  setCurrentLead: (lead: Lead | null) => void;
  addEvidence: (evidence: Evidence) => void;
  updateJob: (jobId: string, updates: Partial<Job>) => void;
  // ... more actions
}

export const useExtensionStore = create<ExtensionState>()(
  persist(
    (set, get) => ({
      // Initial state
      auth: { token: null, user: null, tenant: null },
      currentLead: null,
      currentEvidence: [],
      currentReport: null,
      activeJobs: [],
      sidePanel: {
        activeTab: 'overview',
        isRevealing: false,
        isSurveying: false
      },
      
      // Actions
      setAuth: (auth) => set({ auth }),
      setCurrentLead: (lead) => set({ currentLead: lead }),
      addEvidence: (evidence) => set((state) => ({
        currentEvidence: [...state.currentEvidence, evidence]
      })),
      updateJob: (jobId, updates) => set((state) => ({
        activeJobs: state.activeJobs.map(j => 
          j.id === jobId ? { ...j, ...updates } : j
        )
      }))
    }),
    {
      name: 'leedz-extension-storage',
      storage: createJSONStorage(() => ({
        getItem: async (name) => {
          const result = await chrome.storage.local.get(name);
          return result[name] || null;
        },
        setItem: async (name, value) => {
          await chrome.storage.local.set({ [name]: value });
        },
        removeItem: async (name) => {
          await chrome.storage.local.remove(name);
        }
      }))
    }
  )
);
```

### Build Configuration

```javascript
// extension/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        sidepanel: resolve(__dirname, 'sidepanel.html'),
        background: resolve(__dirname, 'src/background.ts'),
        content: resolve(__dirname, 'src/content.ts')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name].[hash].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    },
    
    // MV3 CSP compliance
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      format: {
        comments: false
      }
    }
  },
  
  // No eval() for CSP
  esbuild: {
    drop: ['console', 'debugger']
  }
});
```

---

## 🚧 Decision Gate: When to Switch to Approach B

### Blockers that Trigger Fallback

| Blocker | Description | Detection |
|---------|-------------|-----------|
| **MV3 CSP Violation** | React/Vite uses eval() or inline scripts | Build error or runtime CSP error |
| **Router Incompatibility** | React Router doesn't work in Side Panel | Navigation fails |
| **Bundle Size** | Vendored bundle > 5MB | Build output check |
| **Zustand Storage** | chrome.storage.local doesn't work with Zustand persist | Runtime error |
| **Lucide Icons** | Icons don't render in MV3 | Visual inspection |

### Detection Script

```javascript
// scripts/check-mv3-compatibility.js
const fs = require('fs');
const path = require('path');

async function checkCompatibility() {
  const issues = [];
  
  // Check bundle for eval()
  const bundle = fs.readFileSync('extension/dist/sidepanel.js', 'utf8');
  if (bundle.includes('eval(') || bundle.includes('new Function(')) {
    issues.push('CSP_VIOLATION: eval() or new Function() detected');
  }
  
  // Check bundle size
  const stats = fs.statSync('extension/dist/sidepanel.js');
  if (stats.size > 5 * 1024 * 1024) {
    issues.push(`BUNDLE_SIZE: ${(stats.size / 1024 / 1024).toFixed(2)}MB exceeds 5MB limit`);
  }
  
  // Check for inline scripts in HTML
  const html = fs.readFileSync('extension/dist/sidepanel.html', 'utf8');
  if (/<script[^>]*>(?!<\/script>)/.test(html)) {
    issues.push('CSP_VIOLATION: Inline script detected in HTML');
  }
  
  if (issues.length > 0) {
    console.log('❌ MV3 Compatibility Issues:');
    issues.forEach(i => console.log(`  - ${i}`));
    console.log('\n⚠️ Consider switching to Approach B (Pixel-perfect Rebuild)');
    process.exit(1);
  } else {
    console.log('✅ MV3 Compatibility Check Passed');
  }
}

checkCompatibility();
```

---

## 🔄 Approach B: Pixel-perfect Rebuild (Fallback)

### When to Use

```
Use Approach B if:
1. Vendoring fails due to MV3 CSP constraints
2. React Router doesn't work in Side Panel context
3. Bundle size is too large
4. Too many import transformations needed
```

### Rebuild Strategy

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      PIXEL-PERFECT REBUILD                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. Extract Design Tokens from Webapp                                   │
│     ├── Colors (primary, secondary, success, error, etc.)              │
│     ├── Typography (font sizes, weights, line heights)                 │
│     ├── Spacing (margins, paddings)                                    │
│     ├── Border radius                                                  │
│     └── Shadows                                                        │
│                                                                          │
│  2. Create Extension-native Components                                  │
│     ├── Use same visual design                                         │
│     ├── Simplified for Side Panel context (400px width)               │
│     ├── No React Router (use simple state-based navigation)           │
│     └── Direct chrome.* API integration                                │
│                                                                          │
│  3. Use Preact instead of React (smaller bundle)                       │
│     ├── 3KB vs 40KB                                                    │
│     ├── Same JSX syntax                                                │
│     └── MV3 compatible                                                 │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Design Tokens Extraction

```typescript
// extension/src/ui/tokens.ts
// Extracted from webapp inline styles

export const colors = {
  // Primary
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8'
  },
  
  // Success
  success: {
    50: '#f0fdf4',
    500: '#22c55e',
    600: '#16a34a'
  },
  
  // Error
  error: {
    50: '#fef2f2',
    500: '#ef4444',
    600: '#dc2626'
  },
  
  // Neutral
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827'
  }
};

export const typography = {
  fontFamily: {
    sans: 'system-ui, -apple-system, sans-serif',
    arabic: 'Tajawal, system-ui, sans-serif'
  },
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem'
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700'
  }
};

export const spacing = {
  0: '0',
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  8: '2rem'
};

export const borderRadius = {
  none: '0',
  sm: '0.125rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.75rem',
  full: '9999px'
};
```

### Simplified Navigation (No React Router)

```typescript
// extension/src/ui/navigation.ts
type View = 'login' | 'main' | 'lead-detail' | 'settings';

interface NavigationState {
  currentView: View;
  params: Record<string, string>;
  history: View[];
}

// Simple state-based navigation
export function useExtensionNavigate() {
  const [nav, setNav] = useExtensionStore(state => state.navigation);
  
  const navigate = (view: View, params?: Record<string, string>) => {
    setNav({
      currentView: view,
      params: params || {},
      history: [...nav.history, nav.currentView]
    });
  };
  
  const goBack = () => {
    const history = [...nav.history];
    const previousView = history.pop() || 'main';
    setNav({
      currentView: previousView,
      params: {},
      history
    });
  };
  
  return { navigate, goBack, currentView: nav.currentView, params: nav.params };
}
```

### Component Rebuild Example

```tsx
// extension/src/ui/components/Button.tsx
// Rebuilt to match webapp Button exactly

import { colors, borderRadius, typography } from '../tokens';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

export function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  children,
  onClick
}: ButtonProps) {
  const baseStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
    fontWeight: typography.fontWeight.medium,
    transition: 'all 150ms',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1
  };
  
  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: { padding: '0.5rem 1rem', fontSize: typography.fontSize.sm },
    md: { padding: '0.75rem 1.5rem', fontSize: typography.fontSize.base },
    lg: { padding: '1rem 2rem', fontSize: typography.fontSize.lg }
  };
  
  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      backgroundColor: colors.primary[600],
      color: 'white',
      border: 'none'
    },
    secondary: {
      backgroundColor: 'white',
      color: colors.gray[700],
      border: `1px solid ${colors.gray[300]}`
    },
    ghost: {
      backgroundColor: 'transparent',
      color: colors.gray[600],
      border: 'none'
    },
    danger: {
      backgroundColor: colors.error[600],
      color: 'white',
      border: 'none'
    }
  };
  
  return (
    <button
      style={{
        ...baseStyles,
        ...sizeStyles[size],
        ...variantStyles[variant]
      }}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}
```

---

## 📋 Constraints Summary

### ✅ Allowed

| Item | Reason |
|------|--------|
| Copy files at build-time | No runtime dependency |
| Transform imports | Adapt to extension context |
| Use same Lucide icons | Already in webapp |
| Use Zustand | Already in webapp |
| Use TailwindCSS (build) | Already in webapp |

### ❌ Not Allowed

| Item | Reason |
|------|--------|
| Runtime imports from webapp | Extension must be independent |
| New UI libraries | Constraint from requirements |
| Shared node_modules | Separate builds |
| Dynamic imports from webapp | CSP violation risk |

### ⚠️ Conditional (Needs Justification)

| Item | Condition |
|------|-----------|
| Preact instead of React | Only if React bundle too large |
| CSS-in-JS library | Only if TailwindCSS fails in MV3 |
| State management change | Only if Zustand fails with chrome.storage |

---

## 📊 File Structure

### After Vendoring (Approach A)

```
extension/
├── manifest.json
├── sidepanel.html
├── src/
│   ├── background.ts           # Service worker
│   ├── content.ts              # Content script
│   ├── ui/                     # Vendored from webapp
│   │   ├── components/
│   │   │   ├── PageHeader.tsx
│   │   │   ├── DataTable.tsx
│   │   │   ├── WhatsAppModal.tsx
│   │   │   └── ...
│   │   ├── pages/
│   │   │   └── SidePanel.tsx   # Main side panel
│   │   ├── assets/
│   │   │   └── logo.svg
│   │   └── styles/
│   │       └── index.css
│   ├── store/
│   │   └── useExtensionStore.ts
│   ├── hooks/
│   │   ├── useExtensionNavigate.ts
│   │   └── useWebSocket.ts
│   ├── api/
│   │   └── client.ts
│   └── utils/
│       └── toast.ts
├── scripts/
│   ├── vendor-ui.js
│   └── transform-imports.js
└── vite.config.ts
```

### After Rebuild (Approach B)

```
extension/
├── manifest.json
├── sidepanel.html
├── src/
│   ├── background.ts
│   ├── content.ts
│   ├── ui/
│   │   ├── components/         # Rebuilt components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   └── ...
│   │   ├── views/              # Rebuilt views
│   │   │   ├── LoginView.tsx
│   │   │   ├── MainView.tsx
│   │   │   ├── LeadView.tsx
│   │   │   └── SettingsView.tsx
│   │   ├── tokens.ts           # Design tokens
│   │   └── navigation.ts       # Simple navigation
│   ├── store/
│   ├── hooks/
│   ├── api/
│   └── utils/
└── vite.config.ts
```

---

## 🔄 Migration Process

### Phase 1: Preparation

```
Week 1:
├── Set up extension project structure
├── Configure Vite for MV3
├── Create vendoring scripts
├── Create transformation scripts
└── Set up CI for extension build
```

### Phase 2: Vendoring Attempt

```
Week 2:
├── Run vendor-ui.js
├── Run transform-imports.js
├── Fix import errors manually
├── Build extension
├── Run MV3 compatibility check
└── Decision: Continue with A or switch to B
```

### Phase 3A: Complete Vendoring (if successful)

```
Week 3:
├── Create useExtensionStore
├── Integrate with chrome.* APIs
├── Test all components
├── Fix styling issues
└── Final build and test
```

### Phase 3B: Pixel-perfect Rebuild (if needed)

```
Week 3-4:
├── Extract design tokens
├── Rebuild core components
├── Rebuild views
├── Integrate with chrome.* APIs
└── Visual comparison testing
```

---

## 🔄 CI Sync Check (CF-10 fix)

### GitHub Action

```yaml
# .github/workflows/extension-ui-sync.yml
name: Extension UI Sync Check

on:
  push:
    paths:
      - 'web/src/components/**'
      - 'web/src/pages/ExtensionSidePanel.tsx'
      - 'extension/src/ui/**'
  pull_request:
    paths:
      - 'web/src/components/**'
      - 'web/src/pages/ExtensionSidePanel.tsx'
      - 'extension/src/ui/**'

jobs:
  check-sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run vendor script in check mode
        run: node scripts/vendor-ui.js --check-only
        
      - name: Fail if out of sync
        run: |
          if [ -f .ui-out-of-sync ]; then
            echo "❌ Extension UI is out of sync with Web UI"
            echo "Run: npm run vendor-ui"
            cat .ui-out-of-sync
            exit 1
          fi
          echo "✅ Extension UI is in sync"
```

### Check-only Mode Implementation

```javascript
// scripts/vendor-ui.js

const CHECK_ONLY = process.argv.includes('--check-only');

async function main() {
  const diffs = [];
  
  for (const [webPath, extPath] of FILE_MAPPINGS) {
    const webContent = await fs.readFile(webPath, 'utf-8').catch(() => null);
    const extContent = await fs.readFile(extPath, 'utf-8').catch(() => null);
    
    if (!webContent) {
      console.warn(`⚠️ Web file not found: ${webPath}`);
      continue;
    }
    
    if (!extContent) {
      diffs.push(`MISSING: ${extPath} (source: ${webPath})`);
      continue;
    }
    
    // Compare after normalizing imports
    const normalizedWeb = normalizeImports(webContent);
    const normalizedExt = normalizeImports(extContent);
    
    if (normalizedWeb !== normalizedExt) {
      diffs.push(`CHANGED: ${webPath} → ${extPath}`);
    }
  }
  
  if (CHECK_ONLY) {
    if (diffs.length > 0) {
      await fs.writeFile('.ui-out-of-sync', diffs.join('\n'));
      console.error(`❌ ${diffs.length} files out of sync`);
      process.exit(1);
    }
    console.log('✅ All files in sync');
    process.exit(0);
  }
  
  // Normal mode: copy files
  await copyFiles();
}
```

### Pre-commit Hook (Optional)

```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Check if any vendored files changed
if git diff --cached --name-only | grep -q "^web/src/components/"; then
  echo "🔍 Checking Extension UI sync..."
  npm run vendor-ui:check || {
    echo "❌ Extension UI out of sync. Run: npm run vendor-ui"
    exit 1
  }
fi
```

### Package.json Scripts

```json
{
  "scripts": {
    "vendor-ui": "node scripts/vendor-ui.js",
    "vendor-ui:check": "node scripts/vendor-ui.js --check-only",
    "vendor-ui:watch": "node scripts/vendor-ui.js --watch"
  }
}
```

---

## ❓ Open Questions

| # | Question | Verification Method |
|---|----------|---------------------|
| 1 | هل TailwindCSS يعمل مع MV3 CSP؟ | Build and test |
| 2 | هل Zustand persist يعمل مع chrome.storage؟ | Runtime test |
| 3 | ما حجم Bundle المقبول للـ Extension؟ | Chrome Web Store guidelines |
| 4 | هل نحتاج i18n في الـ Extension؟ | Product decision |
| 5 | هل نستخدم نفس الـ fonts أم system fonts؟ | Design decision |

---

## 📝 Documentation of Failures (If Approach B Used)

> **ملاحظة:** هذا القسم يُملأ فقط إذا فشل Approach A

### Failure Log Template

```markdown
## Vendoring Failure Report

**Date:** [DATE]
**Attempted By:** [NAME]

### What Failed
[Description of the failure]

### Error Messages
```
[Paste error messages here]
```

### Root Cause
[Analysis of why it failed]

### Components Affected
- [ ] Component 1
- [ ] Component 2

### Decision
Switch to Approach B because: [Reason]

### What Was Rebuilt
| Component | Original | Rebuilt | Differences |
|-----------|----------|---------|-------------|
| Button | webapp/Button.tsx | extension/Button.tsx | Simplified props |
```

---

> **الوثيقة التالية:** [13-EXTENSION_API_MAPPING.md](./13-EXTENSION_API_MAPPING.md)
