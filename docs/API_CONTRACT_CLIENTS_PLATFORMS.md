# API Contract: Clients & Platforms

## Base URL
```
/api/clients
```

## Authentication
All endpoints require JWT Bearer token.

---

## Clients Endpoints

### GET /api/clients
List all clients for current tenant.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| search | string | Search by name, industry, category |
| status | ACTIVE \| ARCHIVED | Filter by status |

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "شركة أرامكو",
      "industry": "النفط والغاز",
      "category": "شركات كبرى",
      "status": "ACTIVE",
      "platformsCount": 3,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

### GET /api/clients/:id
Get client details with platforms.

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "name": "شركة أرامكو",
    "industry": "النفط والغاز",
    "category": "شركات كبرى",
    "description": "...",
    "contactName": "أحمد الغامدي",
    "contactEmail": "ahmed@aramco.com",
    "contactPhone": "+966501234567",
    "website": "https://www.aramco.com",
    "status": "ACTIVE",
    "platforms": [
      {
        "id": "uuid",
        "platform": "X",
        "handle": "aramco",
        "profileUrl": "https://x.com/aramco",
        "isEnabled": true
      }
    ],
    "createdBy": {
      "id": "uuid",
      "name": "Test User",
      "email": "test@postzzz.com"
    },
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

---

### POST /api/clients
Create new client.

**Request Body:**
```json
{
  "name": "شركة جديدة",
  "industry": "التقنية",
  "category": "شركات ناشئة",
  "description": "وصف الشركة",
  "contactName": "محمد",
  "contactEmail": "m@company.com",
  "contactPhone": "+966500000000",
  "website": "https://company.com"
}
```

**Required:** `name`

**Response:** Same as GET /api/clients/:id

---

### PATCH /api/clients/:id
Update client.

**Request Body:** Same as POST (all fields optional)

**Additional Field:**
```json
{
  "status": "ARCHIVED"
}
```

---

### DELETE /api/clients/:id
Soft delete (archives) client.

**Response:**
```json
{
  "data": { "success": true }
}
```

---

## Platforms Endpoints

### GET /api/clients/:id/platforms
List platforms for a client.

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "platform": "X",
      "handle": "aramco",
      "profileUrl": "https://x.com/aramco",
      "notes": "",
      "isEnabled": true,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

### POST /api/clients/:id/platforms
Add platform to client.

**Request Body:**
```json
{
  "platform": "INSTAGRAM",
  "handle": "aramco",
  "profileUrl": "https://instagram.com/aramco",
  "notes": "الحساب الرسمي"
}
```

**Required:** `platform`

**Platform Enum:**
- X
- INSTAGRAM
- TIKTOK
- SNAPCHAT
- LINKEDIN
- THREADS
- YOUTUBE
- FACEBOOK

**Error (409 Conflict):** Platform already exists for this client.

---

### PATCH /api/platforms/:platformId
Update platform.

**Request Body:**
```json
{
  "handle": "new_handle",
  "profileUrl": "https://...",
  "notes": "...",
  "isEnabled": false
}
```

---

### DELETE /api/platforms/:platformId
Delete platform.

**Response:**
```json
{
  "data": { "success": true }
}
```

---

## Error Responses

```json
{
  "statusCode": 404,
  "message": "Client not found",
  "error": "Not Found"
}
```

```json
{
  "statusCode": 409,
  "message": "Platform INSTAGRAM already exists for this client",
  "error": "Conflict"
}
```

---

## RBAC

| Role | Read | Create | Update | Delete |
|------|------|--------|--------|--------|
| Owner | ✅ | ✅ | ✅ | ✅ |
| Admin | ✅ | ✅ | ✅ | ✅ |
| ContentManager | ✅ | ✅ | ✅ | ❌ |
| Approver | ✅ | ❌ | ❌ | ❌ |
| Publisher | ✅ | ❌ | ❌ | ❌ |
| Viewer | ✅ | ❌ | ❌ | ❌ |
