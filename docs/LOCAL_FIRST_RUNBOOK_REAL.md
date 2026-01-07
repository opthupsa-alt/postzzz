# Local-First Runbook (Reality Version)
> Generated: 2026-01-07 22:10 UTC+3
> Based on actual code inspection and live testing

## Prerequisites

| Tool | Required Version | Check Command |
|------|------------------|---------------|
| Node.js | v18+ (tested: v22.20.0) | `node -v` |
| npm | v9+ (tested: 10.9.3) | `npm -v` |
| Git | Any recent | `git --version` |

## Project Structure

```
D:\projects\leedz\
├── api/                 # NestJS Backend
│   ├── .env             # Local secrets (NOT in git)
│   ├── .env.example     # Template (in git)
│   ├── prisma/          # Database schema
│   └── src/             # Source code
├── web/                 # React + Vite Frontend
│   ├── .env.local       # Local secrets (NOT in git)
│   ├── .env.example     # Template (in git)
│   └── pages/           # Page components
└── leedz_extension chrome/  # Chrome Extension
```

---

## Step 1: Backend Setup

### 1.1 Navigate to API folder
```bash
cd D:\projects\leedz\api
```

### 1.2 Create .env file (if not exists)
Copy from template:
```bash
copy .env.example .env
```

### 1.3 Fill in .env values
```env
# Required - Get from Neon Dashboard
DATABASE_URL=postgresql://USER:PASS@HOST/neondb?sslmode=require
DATABASE_URL_UNPOOLED=postgresql://USER:PASS@HOST/neondb?sslmode=require

# Required - Generate a secure random string
JWT_SECRET=your-secure-random-string-here

# Optional
NODE_ENV=development
PORT=3001
```

> ⚠️ **NEVER commit .env to git!**

### 1.4 Install dependencies
```bash
npm ci
```

### 1.5 Generate Prisma Client
```bash
npx prisma generate
```

### 1.6 Check migration status
```bash
npx prisma migrate status
```

**Expected output:**
```
Database schema is up to date!
```

If migrations pending:
```bash
npx prisma migrate deploy
```

### 1.7 Start Backend
```bash
npm run dev
```

**Expected output:**
```
🚀 Leedz API running on port 3001
📚 Swagger docs: http://localhost:3001/api/docs
```

### 1.8 Verify Backend
```bash
curl http://localhost:3001/health
```

**Expected:**
```json
{"ok":true,"version":"1.0.0","timestamp":"...","environment":"development"}
```

---

## Step 2: Frontend Setup

### 2.1 Navigate to Web folder
```bash
cd D:\projects\leedz\web
```

### 2.2 Create .env.local (if not exists)
```bash
copy .env.example .env.local
```

### 2.3 Verify .env.local content
```env
VITE_API_BASE_URL=http://localhost:3001
```

### 2.4 Install dependencies
```bash
npm ci
```

### 2.5 Start Frontend
```bash
npm run dev
```

**Expected output:**
```
VITE v5.x.x ready in xxx ms
➜ Local: http://localhost:3000/
```

### 2.6 Verify Frontend
Open browser: http://localhost:3000

---

## Port Summary

| Service | Port | Bind Address | URL |
|---------|------|--------------|-----|
| Backend | 3001 | 0.0.0.0 | http://localhost:3001 |
| Frontend | 3000 | 0.0.0.0 | http://localhost:3000 |
| Prisma Studio | 5555 | localhost | http://localhost:5555 |

**Evidence:** `api/src/main.ts:92`
```typescript
await app.listen(port, '0.0.0.0');
```

---

## CORS Configuration

**File:** `api/src/main.ts:23-38`

Allowed origins:
- `http://localhost:5173`
- `http://localhost:3000`
- Chrome Extension (if EXTENSION_ID set)

---

## Common Issues & Solutions

### Issue: "Cannot connect to database"
**Cause:** DATABASE_URL not set or incorrect
**Solution:**
1. Check `api/.env` has correct DATABASE_URL
2. Verify Neon dashboard shows database is active
3. Test: `npx prisma db pull`

### Issue: "401 Unauthorized on login"
**Cause:** User doesn't exist or wrong password
**Solution:**
1. Create user via signup first
2. Verify password is correct
3. Check JWT_SECRET is set in .env

### Issue: "500 Internal Server Error"
**Cause:** Various - check logs
**Solution:**
1. Check terminal running `npm run dev`
2. Look for stack trace
3. Common: Missing env vars, DB connection

### Issue: "CORS error in browser"
**Cause:** Origin not in allowed list
**Solution:**
1. Verify frontend runs on port 3000 or 5173
2. Check `api/src/main.ts` CORS config
3. Restart backend after .env changes

### Issue: "Prisma Client not generated"
**Cause:** Forgot to run generate
**Solution:**
```bash
cd api
npx prisma generate
```

---

## Useful Commands

### View Database (Prisma Studio)
```bash
cd api
npx prisma studio
```
Opens browser at http://localhost:5555

### Reset Database (CAUTION!)
```bash
cd api
npx prisma migrate reset
```
⚠️ This deletes all data!

### Create New Migration
```bash
cd api
npx prisma migrate dev --name your_migration_name
```

### Check What's Running
```bash
netstat -ano | findstr ":3001 :3000"
```

### Kill Process on Port (Windows)
```bash
# Find PID
netstat -ano | findstr :3001
# Kill it
taskkill /PID <PID> /F
```

---

## Environment Files Summary

| File | Tracked | Purpose |
|------|---------|---------|
| `api/.env.example` | ✅ Yes | Template for developers |
| `api/.env` | ❌ No | Actual secrets |
| `web/.env.example` | ✅ Yes | Template for developers |
| `web/.env.local` | ❌ No | Actual config |

---

## Verification Checklist

- [ ] Backend responds to `GET /health`
- [ ] Frontend loads at http://localhost:3000
- [ ] Login page appears
- [ ] Can create user via signup
- [ ] Can login with created user
- [ ] Dashboard loads after login
- [ ] Jobs list loads (may be empty)
