# API Contract: Posts & Variants

## Base URL
```
/api/posts
```

## Authentication
All endpoints require JWT Bearer token.

---

## Posts Endpoints

### GET /api/posts
List posts with filters.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| clientId | uuid | Filter by client |
| from | ISO date | Scheduled after |
| to | ISO date | Scheduled before |
| status | PostStatus | Filter by status |

**PostStatus Enum:**
`DRAFT` | `PENDING_APPROVAL` | `APPROVED` | `SCHEDULED` | `PUBLISHING` | `PUBLISHED` | `FAILED` | `ARCHIVED`

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "منشور أرامكو",
      "scheduledAt": "2024-01-15T10:00:00Z",
      "timezone": "Asia/Riyadh",
      "status": "SCHEDULED",
      "client": {
        "id": "uuid",
        "name": "شركة أرامكو"
      },
      "platforms": ["X", "INSTAGRAM"],
      "variantsCount": 2,
      "createdBy": { "id": "uuid", "name": "أحمد" },
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

### GET /api/posts/:id
Get post with variants.

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "title": "منشور أرامكو",
    "scheduledAt": "2024-01-15T10:00:00Z",
    "timezone": "Asia/Riyadh",
    "status": "APPROVED",
    "client": { "id": "uuid", "name": "شركة أرامكو" },
    "variants": [
      {
        "id": "uuid",
        "platform": "X",
        "caption": "نص المنشور...",
        "hashtags": "#أرامكو #طاقة",
        "linkUrl": null,
        "mediaAssetIds": ["uuid1", "uuid2"],
        "extra": {}
      }
    ],
    "createdBy": { "id": "uuid", "name": "أحمد" },
    "approvedBy": { "id": "uuid", "name": "محمد" },
    "approvedAt": "2024-01-10T00:00:00Z"
  }
}
```

---

### POST /api/posts
Create new post.

**Request Body:**
```json
{
  "clientId": "uuid",
  "title": "منشور جديد",
  "scheduledAt": "2024-01-15T10:00:00Z",
  "timezone": "Asia/Riyadh",
  "variants": [
    {
      "platform": "X",
      "caption": "نص المنشور...",
      "hashtags": "#هاشتاق",
      "linkUrl": "https://example.com",
      "mediaAssetIds": ["uuid1"]
    }
  ]
}
```

**Required:** `clientId`

---

### PATCH /api/posts/:id
Update post.

**Request Body:**
```json
{
  "title": "عنوان محدث",
  "scheduledAt": "2024-01-20T10:00:00Z",
  "status": "DRAFT"
}
```

---

### DELETE /api/posts/:id
Soft delete (archives) post.

---

## Variants Endpoints

### GET /api/posts/:id/variants
List variants for a post.

---

### PUT /api/posts/:id/variants
Upsert variants (create or update).

**Request Body:**
```json
[
  {
    "platform": "X",
    "caption": "نص تويتر",
    "hashtags": "#تويتر"
  },
  {
    "platform": "INSTAGRAM",
    "caption": "نص انستقرام أطول...",
    "hashtags": "#انستقرام #صور"
  }
]
```

---

### PATCH /api/variants/:variantId
Update single variant.

---

### DELETE /api/variants/:variantId
Delete variant.

---

## Workflow Endpoints

### POST /api/posts/:id/submit-approval
Submit post for approval.

**Requires:** status = DRAFT
**Sets:** status = PENDING_APPROVAL

---

### POST /api/posts/:id/approve
Approve post.

**Requires:** status = DRAFT | PENDING_APPROVAL
**Sets:** status = APPROVED, approvedById, approvedAt
**RBAC:** Owner, Admin, Approver

---

### POST /api/posts/:id/schedule
Schedule approved post.

**Request Body (optional):**
```json
{
  "scheduledAt": "2024-01-15T10:00:00Z"
}
```

**Requires:** status = APPROVED (or DRAFT with bypass)
**Sets:** status = SCHEDULED

---

## Platform Rules

### GET /api/platform-rules
Get all platform rules (merged: defaults → global → tenant).

**Response:**
```json
{
  "data": [
    {
      "platform": "X",
      "maxCaptionLength": 280,
      "maxHashtags": 5,
      "allowLink": true,
      "maxMediaCount": 4,
      "allowedMediaTypes": ["IMAGE", "VIDEO"],
      "isDefault": true
    }
  ]
}
```

---

## Status Transitions

```
DRAFT → PENDING_APPROVAL → APPROVED → SCHEDULED → PUBLISHING → PUBLISHED
                                                            ↘ FAILED
Any → ARCHIVED (soft delete)
```

---

## RBAC

| Role | Create | Read | Update | Delete | Approve | Schedule |
|------|--------|------|--------|--------|---------|----------|
| Owner | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| ContentManager | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Approver | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Publisher | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Viewer | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## Platform Enum

`X` | `INSTAGRAM` | `TIKTOK` | `SNAPCHAT` | `LINKEDIN` | `THREADS` | `YOUTUBE` | `FACEBOOK`
