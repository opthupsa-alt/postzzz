# 🔐 مصفوفة الصلاحيات والأدوار - Analysis Pack v2.1

> **الإصدار:** 2.1.0  
> **تاريخ الإنشاء:** يناير 2026  
> **الغرض:** تعريف كامل لنظام RBAC مع مصفوفة الصلاحيات التفصيلية

---

## 📋 ملخص تنفيذي

هذا المستند يُعرّف نظام الأدوار والصلاحيات (RBAC) الكامل لنظام ليدززز SaaS Multi-tenant.

---

## 👥 الأدوار المعتمدة

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ROLE HIERARCHY                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│                          ┌─────────┐                                    │
│                          │  OWNER  │                                    │
│                          │ (واحد)  │                                    │
│                          └────┬────┘                                    │
│                               │                                          │
│                          ┌────▼────┐                                    │
│                          │  ADMIN  │                                    │
│                          │ (متعدد) │                                    │
│                          └────┬────┘                                    │
│                               │                                          │
│                          ┌────▼────┐                                    │
│                          │ MANAGER │                                    │
│                          │ (متعدد) │                                    │
│                          └────┬────┘                                    │
│                               │                                          │
│                          ┌────▼────┐                                    │
│                          │  SALES  │                                    │
│                          │ (متعدد) │                                    │
│                          └─────────┘                                    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### تعريف الأدوار

| الدور | الوصف | القيود | الحد الأقصى |
|-------|-------|--------|-------------|
| **OWNER** | مالك المنظمة، صلاحيات كاملة | واحد فقط لكل Tenant، لا يمكن حذفه | 1 |
| **ADMIN** | مدير كامل الصلاحيات | يمكن إدارة كل شيء عدا Billing | غير محدود |
| **MANAGER** | مدير فريق | يرى بيانات فريقه فقط | غير محدود |
| **SALES** | مندوب مبيعات | يرى بياناته فقط | حسب الباقة |

---

## 🔑 نطاقات البيانات (Data Scopes)

```typescript
type DataScope = 'all' | 'team' | 'own' | 'none';

// all  = جميع بيانات الـ Tenant
// team = بيانات الفريق (المستخدمين تحت إدارة الـ Manager)
// own  = بيانات المستخدم فقط
// none = لا وصول
```

### تطبيق النطاقات

```sql
-- Example: leads query with scope
SELECT * FROM leads 
WHERE tenant_id = :tenantId
  AND (
    -- OWNER/ADMIN: all
    :userRole IN ('OWNER', 'ADMIN')
    OR
    -- MANAGER: team (leads created by team members)
    (:userRole = 'MANAGER' AND created_by IN (
      SELECT user_id FROM memberships 
      WHERE tenant_id = :tenantId 
        AND manager_id = :userId
    ))
    OR
    -- SALES: own
    (:userRole = 'SALES' AND created_by = :userId)
  );
```

---

## 📊 مصفوفة الصلاحيات الكاملة

### Leads (العملاء المحتملين)

| Permission | OWNER | ADMIN | MANAGER | SALES | Notes |
|------------|:-----:|:-----:|:-------:|:-----:|-------|
| `leads:read` | all | all | team | own | قراءة بيانات العملاء |
| `leads:create` | ✓ | ✓ | ✓ | ✓ | إنشاء عميل جديد |
| `leads:update` | all | all | team | own | تعديل بيانات العميل |
| `leads:delete` | ✓ | ✓ | ✗ | ✗ | حذف عميل |
| `leads:export` | ✓ | ✓ | ✓ | ✗ | تصدير العملاء |
| `leads:import` | ✓ | ✓ | ✓ | ✗ | استيراد عملاء |
| `leads:bulk_actions` | ✓ | ✓ | ✓ | ✗ | إجراءات جماعية |
| `leads:assign` | ✓ | ✓ | team | ✗ | تعيين عميل لمستخدم |
| `leads:transfer` | ✓ | ✓ | ✗ | ✗ | نقل عميل بين مستخدمين |

---

### Lists (القوائم)

| Permission | OWNER | ADMIN | MANAGER | SALES | Notes |
|------------|:-----:|:-----:|:-------:|:-----:|-------|
| `lists:read` | all | all | team | own | قراءة القوائم |
| `lists:create` | ✓ | ✓ | ✓ | ✓ | إنشاء قائمة |
| `lists:update` | all | all | own | own | تعديل القائمة |
| `lists:delete` | all | all | own | own | حذف القائمة |
| `lists:share` | ✓ | ✓ | ✓ | ✗ | مشاركة القائمة |

---

### Evidence (الأدلة)

| Permission | OWNER | ADMIN | MANAGER | SALES | Notes |
|------------|:-----:|:-----:|:-------:|:-----:|-------|
| `evidence:read` | all | all | team | own | قراءة الأدلة |
| `evidence:create` | ✓ | ✓ | ✓ | ✓ | إنشاء دليل (عبر Survey) |
| `evidence:delete` | ✓ | ✓ | ✗ | ✗ | حذف دليل |
| `evidence:refresh` | ✓ | ✓ | ✓ | ✓ | تحديث الأدلة |

---

### Reports (التقارير)

| Permission | OWNER | ADMIN | MANAGER | SALES | Notes |
|------------|:-----:|:-----:|:-------:|:-----:|-------|
| `reports:read` | all | all | team | own | قراءة التقارير |
| `reports:generate` | ✓ | ✓ | ✓ | ✓ | توليد تقرير جديد |
| `reports:export` | ✓ | ✓ | ✓ | ✗ | تصدير التقرير |

---

### Jobs (المهام الخلفية)

| Permission | OWNER | ADMIN | MANAGER | SALES | Notes |
|------------|:-----:|:-----:|:-------:|:-----:|-------|
| `jobs:read` | all | all | team | own | قراءة حالة المهام |
| `jobs:create` | ✓ | ✓ | ✓ | ✓ | إنشاء مهمة |
| `jobs:cancel` | all | all | own | own | إلغاء مهمة |
| `jobs:retry` | ✓ | ✓ | own | own | إعادة محاولة |

---

### WhatsApp (الرسائل)

| Permission | OWNER | ADMIN | MANAGER | SALES | Notes |
|------------|:-----:|:-----:|:-------:|:-----:|-------|
| `whatsapp:send` | ✓ | ✓ | ✓ | ✓ | إرسال رسالة فردية |
| `whatsapp:bulk_send` | ✓ | ✓ | ✓ | ✗ | إرسال جماعي |
| `whatsapp:templates:read` | ✓ | ✓ | ✓ | ✓ | قراءة القوالب |
| `whatsapp:templates:manage` | ✓ | ✓ | ✗ | ✗ | إدارة القوالب |
| `whatsapp:logs:read` | all | all | team | own | سجل الرسائل |

---

### Search (البحث)

| Permission | OWNER | ADMIN | MANAGER | SALES | Notes |
|------------|:-----:|:-----:|:-------:|:-----:|-------|
| `search:execute` | ✓ | ✓ | ✓ | ✓ | تنفيذ بحث |
| `search:history` | all | all | own | own | تاريخ البحث |
| `search:save` | ✓ | ✓ | ✓ | ✓ | حفظ نتائج البحث |

---

### Team (الفريق)

| Permission | OWNER | ADMIN | MANAGER | SALES | Notes |
|------------|:-----:|:-----:|:-------:|:-----:|-------|
| `team:read` | ✓ | ✓ | team | ✗ | قراءة قائمة الفريق |
| `team:invite` | ✓ | ✓ | ✗ | ✗ | دعوة عضو جديد |
| `team:remove` | ✓ | ✓ | ✗ | ✗ | إزالة عضو |
| `team:change_role` | ✓ | ✓* | ✗ | ✗ | تغيير دور |
| `team:deactivate` | ✓ | ✓ | ✗ | ✗ | تعطيل عضو |

*ADMIN لا يمكنه تغيير دور OWNER أو ترقية أحد لـ OWNER

---

### Integrations (التكاملات)

| Permission | OWNER | ADMIN | MANAGER | SALES | Notes |
|------------|:-----:|:-----:|:-------:|:-----:|-------|
| `integrations:read` | ✓ | ✓ | ✗ | ✗ | قراءة التكاملات |
| `integrations:manage` | ✓ | ✓ | ✗ | ✗ | إدارة التكاملات |
| `api_keys:read` | ✓ | ✓ | ✗ | ✗ | قراءة مفاتيح API |
| `api_keys:manage` | ✓ | ✓ | ✗ | ✗ | إدارة مفاتيح API |

---

### Audit (سجل الرقابة)

| Permission | OWNER | ADMIN | MANAGER | SALES | Notes |
|------------|:-----:|:-----:|:-------:|:-----:|-------|
| `audit:read` | ✓ | ✓ | ✗ | ✗ | قراءة سجل الرقابة |
| `audit:export` | ✓ | ✓ | ✗ | ✗ | تصدير السجل |

---

### Organization Settings (إعدادات المنظمة)

| Permission | OWNER | ADMIN | MANAGER | SALES | Notes |
|------------|:-----:|:-----:|:-------:|:-----:|-------|
| `org:settings:read` | ✓ | ✓ | ✗ | ✗ | قراءة الإعدادات |
| `org:settings:update` | ✓ | ✓ | ✗ | ✗ | تعديل الإعدادات |
| `org:delete` | ✓ | ✗ | ✗ | ✗ | حذف المنظمة |
| `org:transfer` | ✓ | ✗ | ✗ | ✗ | نقل الملكية |

---

### Billing (الفوترة)

| Permission | OWNER | ADMIN | MANAGER | SALES | Notes |
|------------|:-----:|:-----:|:-------:|:-----:|-------|
| `billing:read` | ✓ | read* | ✗ | ✗ | قراءة معلومات الفوترة |
| `billing:manage` | ✓ | ✗ | ✗ | ✗ | إدارة الاشتراك |
| `billing:invoices` | ✓ | ✓ | ✗ | ✗ | عرض الفواتير |

*ADMIN يرى الباقة والاستخدام فقط، لا يرى تفاصيل الدفع

---

### Extension (الإضافة)

| Permission | OWNER | ADMIN | MANAGER | SALES | Notes |
|------------|:-----:|:-----:|:-------:|:-----:|-------|
| `extension:use` | ✓ | ✓ | ✓ | ✓ | استخدام الإضافة |
| `extension:resolve` | ✓ | ✓ | ✓ | ✓ | تحليل الصفحات |
| `extension:reveal` | ✓* | ✓* | ✓* | ✓* | كشف البيانات |
| `extension:survey` | ✓ | ✓ | ✓ | ✓ | فحص عميق |

*يعتمد على Feature Flag `feature_reveal`

---

## 🔒 قواعد خاصة

### 1. حماية OWNER

```typescript
// OWNER لا يمكن:
// - حذفه
// - تغيير دوره
// - تعطيله

function canModifyMember(actor: User, target: Membership): boolean {
  if (target.role === 'OWNER') {
    return false; // لا أحد يمكنه تعديل OWNER
  }
  
  if (actor.role === 'ADMIN' && target.role === 'ADMIN') {
    return false; // ADMIN لا يمكنه تعديل ADMIN آخر
  }
  
  return hasPermission(actor, 'team:change_role');
}
```

### 2. نقل الملكية

```typescript
// فقط OWNER يمكنه نقل الملكية
async function transferOwnership(
  currentOwner: User,
  newOwnerId: string
): Promise<void> {
  if (currentOwner.role !== 'OWNER') {
    throw new ForbiddenError('Only OWNER can transfer ownership');
  }
  
  // Transaction:
  // 1. Set new owner role to OWNER
  // 2. Set current owner role to ADMIN
  // 3. Log audit event
}
```

### 3. Self-demotion Prevention

```typescript
// لا يمكن للمستخدم تخفيض دوره بنفسه
function canChangeOwnRole(user: User, newRole: Role): boolean {
  const roleHierarchy = { OWNER: 4, ADMIN: 3, MANAGER: 2, SALES: 1 };
  
  if (roleHierarchy[newRole] < roleHierarchy[user.role]) {
    return false; // لا يمكن تخفيض الدور
  }
  
  return true;
}
```

### 4. Last Admin Protection

```typescript
// لا يمكن إزالة آخر ADMIN
async function canRemoveAdmin(tenantId: string): Promise<boolean> {
  const adminCount = await countAdmins(tenantId);
  return adminCount > 1; // يجب أن يبقى admin واحد على الأقل
}
```

---

## 🗄️ Database Schema

### Roles Table

```sql
CREATE TABLE roles (
  id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO roles (id, name, description) VALUES
  ('OWNER', 'مالك', 'مالك المنظمة - صلاحيات كاملة'),
  ('ADMIN', 'مدير', 'مدير كامل الصلاحيات'),
  ('MANAGER', 'مدير فريق', 'مدير فريق - يرى فريقه فقط'),
  ('SALES', 'مندوب', 'مندوب مبيعات - يرى بياناته فقط');
```

### Permissions Table

```sql
CREATE TABLE permissions (
  id VARCHAR(50) PRIMARY KEY,
  resource VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Example permissions
INSERT INTO permissions (id, resource, action) VALUES
  ('leads:read', 'leads', 'read'),
  ('leads:create', 'leads', 'create'),
  ('leads:update', 'leads', 'update'),
  ('leads:delete', 'leads', 'delete'),
  -- ... etc
```

### Role Permissions Table

```sql
CREATE TABLE role_permissions (
  role_id VARCHAR(20) REFERENCES roles(id),
  permission_id VARCHAR(50) REFERENCES permissions(id),
  scope VARCHAR(20) DEFAULT 'all',  -- all, team, own, none
  PRIMARY KEY (role_id, permission_id)
);

-- Example mappings
INSERT INTO role_permissions (role_id, permission_id, scope) VALUES
  ('OWNER', 'leads:read', 'all'),
  ('ADMIN', 'leads:read', 'all'),
  ('MANAGER', 'leads:read', 'team'),
  ('SALES', 'leads:read', 'own'),
  -- ... etc
```

---

## 🔍 Permission Check Implementation

```typescript
interface PermissionCheck {
  userId: string;
  tenantId: string;
  permission: string;
  resourceId?: string;  // For resource-level checks
}

async function hasPermission(check: PermissionCheck): Promise<boolean> {
  const membership = await getMembership(check.userId, check.tenantId);
  if (!membership || membership.status !== 'ACTIVE') {
    return false;
  }
  
  const rolePermission = await getRolePermission(
    membership.role,
    check.permission
  );
  
  if (!rolePermission) {
    return false;
  }
  
  // If no resource specified, just check permission exists
  if (!check.resourceId) {
    return true;
  }
  
  // Check scope
  switch (rolePermission.scope) {
    case 'all':
      return true;
      
    case 'team':
      return await isInTeam(check.userId, check.resourceId);
      
    case 'own':
      return await isOwner(check.userId, check.resourceId);
      
    case 'none':
      return false;
      
    default:
      return false;
  }
}
```

---

## 🎯 API Authorization Middleware

```typescript
// NestJS Guard Example
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.get<string>(
      'permission',
      context.getHandler()
    );
    
    if (!requiredPermission) {
      return true; // No permission required
    }
    
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const tenantId = request.headers['x-tenant-id'] || user.currentTenantId;
    
    return hasPermission({
      userId: user.id,
      tenantId,
      permission: requiredPermission,
      resourceId: request.params.id
    });
  }
}

// Usage
@Controller('leads')
export class LeadsController {
  @Get()
  @Permission('leads:read')
  async findAll() { ... }
  
  @Post()
  @Permission('leads:create')
  async create() { ... }
  
  @Delete(':id')
  @Permission('leads:delete')
  async delete() { ... }
}
```

---

## 📊 Permission Matrix Summary (Quick Reference)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PERMISSION MATRIX SUMMARY                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Resource      │ OWNER │ ADMIN │ MANAGER │ SALES │                      │
│  ──────────────┼───────┼───────┼─────────┼───────┤                      │
│  Leads         │ CRUD  │ CRUD  │ CRU(t)  │ CRU(o)│                      │
│  Lists         │ CRUD  │ CRUD  │ CRUD(o) │ CRUD(o)                      │
│  Evidence      │ CRD   │ CRD   │ CR(t)   │ CR(o) │                      │
│  Reports       │ CRE   │ CRE   │ CR(t)   │ CR(o) │                      │
│  Jobs          │ CRUD  │ CRUD  │ CRU(o)  │ CRU(o)│                      │
│  WhatsApp      │ Full  │ Full  │ Send    │ Send  │                      │
│  Team          │ Full  │ Full* │ Read(t) │ ✗     │                      │
│  Integrations  │ Full  │ Full  │ ✗       │ ✗     │                      │
│  Audit         │ Read  │ Read  │ ✗       │ ✗     │                      │
│  Org Settings  │ Full  │ RU    │ ✗       │ ✗     │                      │
│  Billing       │ Full  │ Read  │ ✗       │ ✗     │                      │
│                                                                          │
│  Legend:                                                                 │
│  C=Create, R=Read, U=Update, D=Delete, E=Export                         │
│  (t)=team scope, (o)=own scope                                          │
│  *ADMIN cannot modify OWNER                                              │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## ❓ Open Questions

| # | السؤال | طريقة التحقق |
|---|--------|--------------|
| 1 | هل نحتاج أدوار مخصصة (Custom Roles)؟ | Product decision |
| 2 | هل MANAGER يمكنه دعوة SALES؟ | Product decision |
| 3 | هل نحتاج Permission Groups؟ | Technical review |

---

> **الوثيقة السابقة:** [14-CONFLICTS_AND_FIXES.md](./14-CONFLICTS_AND_FIXES.md)  
> **الوثيقة التالية:** [16-SUBSCRIPTION_QUOTAS_FLAGS.md](./16-SUBSCRIPTION_QUOTAS_FLAGS.md)
