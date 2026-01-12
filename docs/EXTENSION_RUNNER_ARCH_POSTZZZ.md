# Postzzz Extension Runner Architecture

## Overview
Chrome Extension (MV3) that acts as a publishing runner for social media posts.
Uses existing browser sessions - **no credential storage**.

## Mode
- **Assist Mode** (v1): Fill composer, wait for user confirmation before publish
- **Auto Mode** (future): Full automation after approval

## File Structure
```
extension/
├── manifest.json           # MV3 manifest
├── background.js           # Service worker (existing + runner integration)
├── sidepanel.html/js       # Side panel UI
├── runner/
│   ├── runner-state.js     # Device registration, heartbeat, client binding
│   ├── jobs-manager.js     # Job claiming, start, complete lifecycle
│   ├── platform-detectors.js # Login detection per platform
│   ├── proof-capture.js    # Screenshot capture and upload
│   ├── runner-ui.html      # Runner UI components
│   ├── runner-ui.js        # Runner UI controller
│   └── playbooks/
│       └── x-playbook.js   # X (Twitter) publishing steps
```

## Data Flow
```
1. User logs in to Postzzz web
2. Extension syncs auth token
3. Extension registers device → deviceId stored in chrome.storage.local
4. User selects client to bind
5. Heartbeat every 25s updates device status
6. Job polling every 15s claims available jobs
7. User clicks job → start → fill composer → wait confirm → publish
8. Screenshot proof captured and uploaded
9. Job marked complete with proof + publishedUrl
```

## Storage (chrome.storage.local)
```javascript
{
  postzzz_device_id: "uuid",
  postzzz_selected_client_id: "uuid",
  postzzz_runner_mode: "ASSIST",
  postzzz_platform_login_status: { X: "LOGGED_IN", ... },
  postzzz_claimed_jobs: [...]
}
```

## Security
- No passwords stored
- No cookies extracted
- Device token only (not user credentials)
- Relies on user's existing browser sessions

## Platform Support
| Platform | Login Check | Composer Fill | Publish |
|----------|-------------|---------------|---------|
| X        | ✅          | ✅            | ✅ (Assist) |
| Instagram| ✅          | 🔜            | 🔜      |
| LinkedIn | ✅          | 🔜            | 🔜      |
| TikTok   | ✅          | 🔜            | 🔜      |
| Threads  | ✅          | 🔜            | 🔜      |

## API Endpoints Used
- `POST /api/devices/register`
- `POST /api/devices/:id/heartbeat`
- `GET /api/clients`
- `POST /api/publishing/jobs/claim`
- `POST /api/publishing/jobs/:id/start`
- `POST /api/publishing/jobs/:id/complete`
- `POST /api/media/upload`
