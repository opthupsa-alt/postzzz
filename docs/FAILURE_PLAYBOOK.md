# Failure Playbook

## Common Failure Scenarios

---

## 1. NEEDS_LOGIN

### Symptoms
- Job status: `NEEDS_LOGIN`
- Extension shows: "يحتاج تسجيل دخول"
- Platform tab shows login page

### User Action
```
1. Open the platform (X, Instagram, etc.) in browser
2. Log in manually with your account
3. Return to extension
4. Click "🔄 فحص الحالة" to verify login
5. Job will be retried automatically (back to QUEUED)
```

### Server Recovery
- Job stays in `NEEDS_LOGIN` until manual intervention
- Does NOT auto-retry (requires user action)
- Post status remains `SCHEDULED`

### Prevention
- Check platform login status before scheduling
- Extension shows login status badges

---

## 2. Selector Fails (DOM Changed)

### Symptoms
- Job status: `FAILED`
- lastErrorMessage: "Composer textarea not found" or similar
- Proof screenshot shows unexpected page

### Diagnosis
```
1. Check proof screenshot in /app/publishing
2. Review job logs for step that failed
3. Compare expected selector vs actual DOM
```

### Fix (Developer)
```javascript
// Update selector in extension/runner/playbooks/x-playbook.js
selectors: {
  composerTextarea: '[data-testid="tweetTextarea_0"]', // Update this
}
```

### Temporary Workaround
- Cancel job
- Post manually
- Report selector issue

---

## 3. Job Stuck in CLAIMED

### Symptoms
- Job status: `CLAIMED` for > 5 minutes
- Extension may have crashed or closed
- lockedByDeviceId set but no progress

### Server Recovery (Automatic)
```
- Cron runs every 2 minutes
- CLAIMED jobs older than 5 minutes:
  - attemptCount++
  - if attemptCount < maxAttempts: back to QUEUED
  - else: FAILED
- Audit log: "JOB_STUCK_RECOVERY"
```

### Manual Recovery
```sql
-- If needed, run in database:
UPDATE publishing_jobs 
SET status = 'QUEUED', 
    locked_by_device_id = NULL, 
    locked_at = NULL,
    attempt_count = attempt_count + 1
WHERE status = 'CLAIMED' 
  AND locked_at < NOW() - INTERVAL '5 minutes';
```

---

## 4. Job Stuck in RUNNING

### Symptoms
- Job status: `RUNNING` for > 10 minutes
- Extension may have crashed mid-publish
- Run record exists but not completed

### Server Recovery (Automatic)
```
- Cron runs every 2 minutes
- RUNNING jobs older than 10 minutes:
  - attemptCount++
  - if attemptCount < maxAttempts: back to QUEUED
  - else: FAILED
- Run marked as FAILED with reason "Timeout"
```

### Manual Recovery
```sql
-- Mark job as failed:
UPDATE publishing_jobs 
SET status = 'FAILED',
    last_error_message = 'Timeout - job stuck in RUNNING'
WHERE status = 'RUNNING' 
  AND updated_at < NOW() - INTERVAL '10 minutes';
```

---

## 5. Double Publish Attempt

### Symptoms
- Same content posted twice
- Multiple jobs for same post/platform

### Prevention (Built-in)
```
- idempotencyKey = "{postId}:{platform}:{scheduledAt}"
- Unique constraint prevents duplicates
- Schedule endpoint uses UPSERT
- Complete endpoint ignores if already SUCCEEDED
```

### If It Happens
```
1. Check /app/publishing for duplicate jobs
2. Cancel extra jobs
3. Delete duplicate posts manually
4. Report bug with job IDs
```

---

## 6. Proof Screenshot Missing

### Symptoms
- Job SUCCEEDED but proofScreenshotAssetId is null
- No visual confirmation of publish

### Causes
- Screenshot capture failed (tab not visible)
- Upload failed (network error)
- Tab closed before capture

### Mitigation
```
- Proof captured at multiple points:
  1. Before confirm (AWAITING_CONFIRM)
  2. After publish attempt
  3. On failure
- Check job logs for capture errors
```

---

## 7. Post Status Mismatch

### Expected Status Flow
```
DRAFT → PENDING_APPROVAL → APPROVED → SCHEDULED → PUBLISHING → PUBLISHED
                                                            ↘ FAILED
```

### If Post Status Wrong
```
1. Check all jobs for this post in /app/publishing
2. Status should reflect:
   - Any RUNNING/CLAIMED → PUBLISHING
   - All SUCCEEDED → PUBLISHED
   - Any FAILED (terminal) → FAILED
   - Any NEEDS_LOGIN → SCHEDULED (with warning)
3. If mismatch, server cron will correct on next run
```

---

## Recovery Commands

### Force Job Retry
```bash
# API call to cancel and re-queue
POST /api/publishing/jobs/{jobId}/cancel
# Then re-schedule the post
POST /api/posts/{postId}/schedule
```

### Check Device Status
```bash
GET /api/devices
# Verify device is ONLINE (lastSeenAt < 2 minutes)
```

### View Job Logs
```bash
GET /api/publishing/jobs/{jobId}
# Response includes runs[].logs array
```

---

## Escalation

If none of the above resolves the issue:
1. Collect: jobId, postId, deviceId, timestamp
2. Export job logs and proof screenshots
3. Check server logs for errors
4. Report with full context
