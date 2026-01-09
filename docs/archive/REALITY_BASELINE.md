# Reality Baseline
> Generated: 2026-01-07 22:35 UTC+3
> Branch: `reality-audit-local-first`
> Auditor: Senior Full-Stack Engineer + QA Lead + Release Manager

## Git State

| Item | Value |
|------|-------|
| **HEAD Commit** | `de22b10` |
| **Branch** | `reality-audit-local-first` |
| **Base Branch** | `main` |
| **Working Tree** | Clean |

### Last 5 Commits
```
de22b10 docs: add comprehensive Local-First Reality Audit reports
08c0c92 docs: add local-first reality reports with evidence
2eb1168 docs: add comprehensive Backend Status Report
c3acdfd feat: remove mock data and connect ProspectingPage to API
2b580af feat: complete frontend-API integration
```

## Versions

| Tool | Version |
|------|---------|
| **Node.js** | v22.20.0 |
| **npm** | 10.9.3 |

## Running Services (Local)

| Service | PID | Port | URL | Status |
|---------|-----|------|-----|--------|
| Backend (NestJS) | 96640 | 3001 | http://localhost:3001 | ✅ Running |
| Frontend (Vite) | 22072 | 3000 | http://localhost:3000 | ✅ Running |
| Database | - | - | Neon (Online) | ✅ Connected |

## Environment Variables Required

### API (`api/.env` or `api/.env.local`)
| Variable | Purpose | In Git? |
|----------|---------|--------|
| `DATABASE_URL` | Neon pooled connection | ❌ No |
| `DATABASE_URL_UNPOOLED` | Neon direct connection | ❌ No |
| `JWT_SECRET` | Token signing | ❌ No |
| `PORT` | API port (default: 3001) | ❌ No |
| `NODE_ENV` | Environment | ❌ No |

### Web (`web/.env.local`)
| Variable | Purpose | In Git? |
|----------|---------|--------|
| `VITE_API_BASE_URL` | API endpoint | ❌ No |

## Environment Files Status

| File | Exists | In .gitignore |
|------|--------|---------------|
| `api/.env` | ✅ Yes | ✅ Yes |
| `api/.env.local` | ❌ No | ✅ Yes |
| `web/.env.local` | ✅ Yes | ✅ Yes |
| `.gitignore` covers `.env` | ✅ Yes | - |
| `.gitignore` covers `.env.local` | ✅ Yes | - |

## What Works / What Doesn't / Uncertain

| Component | Status | Evidence |
|-----------|--------|----------|
| API Health | ✅ Works | `GET /health` → 200 |
| Auth Signup | ✅ Works | `POST /auth/signup` → 201 |
| Auth Login | ✅ Works | `POST /auth/login` → 200 |
| Auth Me | ✅ Works | `GET /auth/me` → 200 |
| Jobs CRUD | ✅ Works | `POST/GET /jobs` → 201/200 |
| **Leads CRUD** | ❌ Broken | No Lead model in schema |
| **Lists CRUD** | ❌ Broken | No List model in schema |
| Token Persistence | ✅ Works | localStorage `leedz_token` |
| Lead Persistence | ❌ Broken | Zustand only, no DB |

## Conclusion

- **Branch created:** `reality-audit-local-first`
- **Baseline captured**
- **No secrets in Git**
- **Both servers running locally**
- **P0 Bug identified:** Leads don't persist (no Lead model)
