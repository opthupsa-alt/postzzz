# E2E Smoke Test Results

## Gate Requirement
Before adding any new platform playbook, X Assist Mode must pass **2 consecutive runs**.

---

## X Platform - Assist Mode

### Run #1
| Field | Value |
|-------|-------|
| Date | [PENDING] |
| Result | [PENDING] |
| Duration | [PENDING] |
| Post ID | [PENDING] |
| Job ID | [PENDING] |
| Published URL | [PENDING] |
| Proof Asset ID | [PENDING] |
| Notes | [PENDING] |

### Run #2
| Field | Value |
|-------|-------|
| Date | [PENDING] |
| Result | [PENDING] |
| Duration | [PENDING] |
| Post ID | [PENDING] |
| Job ID | [PENDING] |
| Published URL | [PENDING] |
| Proof Asset ID | [PENDING] |
| Notes | [PENDING] |

---

## Gate Status

| Platform | Run 1 | Run 2 | Gate Passed |
|----------|-------|-------|-------------|
| X | ⏳ | ⏳ | ❌ |
| LinkedIn | ⏳ | ⏳ | ❌ |
| Instagram | - | - | ❌ |

---

## LinkedIn Platform - Assist Mode

### Run #1
| Field | Value |
|-------|-------|
| Date | [PENDING] |
| Result | [PENDING] |
| Duration | [PENDING] |
| Post ID | [PENDING] |
| Job ID | [PENDING] |
| Published URL | [PENDING] |
| Proof Asset ID | [PENDING] |
| Notes | [PENDING] |

### Run #2
| Field | Value |
|-------|-------|
| Date | [PENDING] |
| Result | [PENDING] |
| Duration | [PENDING] |
| Post ID | [PENDING] |
| Job ID | [PENDING] |
| Published URL | [PENDING] |
| Proof Asset ID | [PENDING] |
| Notes | [PENDING] |

---

## How to Run E2E Smoke Test

### Prerequisites
```powershell
# Start the project
.\ops\sync-and-start.ps1
```

### Test Steps
1. Follow `docs/E2E_SMOKE_RUNBOOK.md` exactly
2. Record results in this file
3. If FAIL: fix issue, re-run until PASS
4. Both runs must PASS before proceeding

### Recording Results
After each run, update the table above with:
- **Date**: Timestamp of test
- **Result**: PASS or FAIL
- **Duration**: Total time in minutes
- **Post ID**: UUID of test post
- **Job ID**: UUID of publishing job
- **Published URL**: Link to published content (or "N/A")
- **Proof Asset ID**: UUID of screenshot asset
- **Notes**: Any observations or issues

---

## Failure Log

### [Date] - [Platform] - [Run #]
```
Issue: [Description]
Root Cause: [Analysis]
Fix: [What was changed]
Commit: [Hash if applicable]
```
