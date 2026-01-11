# API Contract: Publishing & Devices

## Devices Endpoints

### POST /api/devices/register
Register a new device (Chrome Extension).

**Request:**
```json
{
  "name": "Ahmed Chrome - PC Office",
  "clientId": "uuid (optional)",
  "capabilities": { "assistMode": true, "autoMode": false, "platforms": ["X", "INSTAGRAM"] },
  "userAgent": "Mozilla/5.0...",
  "version": "1.0.0"
}
```

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "name": "Ahmed Chrome - PC Office",
    "status": "ONLINE",
    "lastSeenAt": "2024-01-15T10:00:00Z"
  }
}
```

---

### POST /api/devices/:id/heartbeat
Update device status (call every 30-60 seconds).

**Request:**
```json
{
  "clientId": "uuid (optional)",
  "capabilities": { ... },
  "userAgent": "...",
  "version": "1.0.1"
}
```

---

### GET /api/devices
List all devices.

---

### PATCH /api/devices/:id
Update device (rename, bind client).

---

### DELETE /api/devices/:id
Delete device.

---

## Publishing Endpoints

### GET /api/publishing/jobs
List publishing jobs with filters.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| status | PublishingJobStatus | Filter by status |
| clientId | uuid | Filter by client |
| from | ISO date | Scheduled after |
| to | ISO date | Scheduled before |

**PublishingJobStatus Enum:**
`QUEUED` | `CLAIMED` | `RUNNING` | `SUCCEEDED` | `FAILED` | `NEEDS_LOGIN` | `CANCELLED`

---

### POST /api/publishing/jobs/claim
Claim jobs for a device (atomic lock).

**Request:**
```json
{
  "deviceId": "uuid",
  "limit": 5
}
```

**Response:**
```json
{
  "data": [
    {
      "id": "job-uuid",
      "postId": "post-uuid",
      "platform": "X",
      "scheduledAt": "2024-01-15T10:00:00Z",
      "post": {
        "variants": [{ "platform": "X", "caption": "...", "hashtags": "..." }]
      },
      "client": {
        "name": "شركة أرامكو",
        "platforms": [{ "platform": "X", "handle": "@aramco" }]
      }
    }
  ]
}
```

---

### POST /api/publishing/jobs/:id/start
Mark job as running (creates PublishingRun).

**Request:**
```json
{
  "deviceId": "uuid"
}
```

---

### POST /api/publishing/jobs/:id/complete
Complete job with result.

**Request:**
```json
{
  "status": "SUCCEEDED | FAILED | NEEDS_LOGIN",
  "logs": { ... },
  "proofScreenshotAssetId": "uuid (optional)",
  "publishedUrl": "https://x.com/...",
  "errorCode": "LOGIN_REQUIRED",
  "errorMessage": "Session expired"
}
```

---

### POST /api/publishing/jobs/:id/cancel
Cancel a queued/claimed job.

---

## Job Status Transitions

```
QUEUED → CLAIMED → RUNNING → SUCCEEDED
                          ↘ FAILED (retry if attemptCount < maxAttempts)
                          ↘ NEEDS_LOGIN (manual intervention)
Any → CANCELLED
```

---

## Post Status Updates

When jobs are scheduled/completed, Post.status updates automatically:
- Schedule → `SCHEDULED`
- Any job RUNNING → `PUBLISHING`
- All jobs SUCCEEDED → `PUBLISHED`
- Any job FAILED (max retries) → `FAILED`

---

## Device Status

- `ONLINE`: lastSeenAt < 2 minutes ago
- `OFFLINE`: lastSeenAt >= 2 minutes ago

---

## Idempotency

Jobs are created with idempotencyKey = `{postId}:{platform}:{scheduledAt}`.
Re-scheduling the same post updates existing jobs instead of creating duplicates.

---

## Claim Protocol (Atomic Lock)

1. Extension calls `/jobs/claim` with deviceId
2. Server finds QUEUED jobs where scheduledAt <= now
3. Server atomically updates status to CLAIMED + sets lockedByDeviceId
4. Returns claimed jobs with full payload
5. Extension calls `/jobs/:id/start` before publishing
6. Extension calls `/jobs/:id/complete` with result

---

## Retry Policy

- `maxAttempts`: 3 (default)
- On FAILED: if attemptCount < maxAttempts → back to QUEUED
- On max retries exhausted → terminal FAILED
