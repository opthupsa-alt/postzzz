# E2E Smoke Test Runbook

## Preconditions

### 1. Test Environment
- [ ] API running on `localhost:3001`
- [ ] Web running on `localhost:3000`
- [ ] Database accessible (Neon PostgreSQL)

### 2. Test Data
- [ ] Test tenant exists (your account)
- [ ] One client exists with platforms: **X** + **INSTAGRAM** (detector-only)
- [ ] Client has at least one platform handle configured

### 3. Extension Setup
- [ ] Extension installed in Chrome
- [ ] Logged in to Postzzz (same account)
- [ ] Device registered (check `/app/devices` - should show ONLINE)
- [ ] Client bound to device (select from dropdown in extension)

### 4. Platform Sessions
- [ ] Logged in to X (twitter.com) in same browser
- [ ] Extension login check shows X as "متصل" (LOGGED_IN)

---

## Test Flow (10 minutes)

### Step 1: Create Post Draft (2 min)
```
1. Go to /app/posts/new
2. Select test client
3. Add title: "Smoke Test [timestamp]"
4. Select platform: X
5. Fill variant content:
   - Caption: "This is a smoke test post #postzzz"
   - Hashtags: "#test #automation"
6. Click "حفظ المنشور" (Save)
7. Verify: Post created with status DRAFT
```

### Step 2: Workflow (1 min)
```
1. Click "إرسال للموافقة" (Submit for Approval)
2. Verify: Status changes to PENDING_APPROVAL
3. Click "الموافقة" (Approve)
4. Verify: Status changes to APPROVED
```

### Step 3: Schedule (1 min)
```
1. Set scheduledAt to NOW + 2 minutes
2. Click "جدولة المنشور" (Schedule)
3. Verify: Status changes to SCHEDULED
4. Go to /app/publishing
5. Verify: Job created with status QUEUED
```

### Step 4: Extension Claims Job (2 min)
```
1. Open extension side panel
2. Wait for job polling (15 seconds)
3. Verify: Job appears in "المهام الواردة" (Jobs Inbox)
4. Click on job card
5. Verify: Job status changes to CLAIMED then RUNNING
6. Verify: Extension shows "المهمة الحالية" (Active Job)
```

### Step 5: Assist Mode Execution (2 min)
```
1. Extension opens X composer tab
2. Verify: Content filled in composer
3. Verify: Extension shows "انتظار التأكيد" (Awaiting Confirm)
4. Verify: "تأكيد النشر" button appears
5. Click "تأكيد النشر" (Confirm Publish)
```

### Step 6: Verify Results (2 min)
```
1. Verify: Tweet posted on X
2. Verify: Proof screenshot captured
3. Go to /app/publishing
4. Verify: Job status = SUCCEEDED
5. Verify: Run created with:
   - proofScreenshotAssetId (not null)
   - publishedUrl (if extractable, otherwise null)
6. Go to /app/posts
7. Verify: Post status = PUBLISHED
```

---

## Expected Results

| Check | Expected | Actual |
|-------|----------|--------|
| Post created | DRAFT | |
| Submit approval | PENDING_APPROVAL | |
| Approve | APPROVED | |
| Schedule | SCHEDULED + Job QUEUED | |
| Claim | Job CLAIMED | |
| Start | Job RUNNING, Post PUBLISHING | |
| Confirm | Tweet posted | |
| Complete | Job SUCCEEDED, Post PUBLISHED | |
| Proof | Screenshot asset exists | |

---

## Cleanup
```
1. Delete test tweet from X (manual)
2. Archive test post in /app/posts (optional)
```

---

## Pass Criteria
- [ ] All steps complete without errors
- [ ] No stuck jobs after 5 minutes
- [ ] Proof screenshot visible in /app/publishing
- [ ] Run this test **twice consecutively** with success
