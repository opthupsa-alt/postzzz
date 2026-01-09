# Local-First Runbook
> How to run Leedz locally with Neon DB

## Prerequisites

- Node.js 18+
- npm or pnpm
- Chrome browser (for extension)

## Environment Variables

### API (`api/.env`)
```env
DATABASE_URL="postgresql://USER:PASS@HOST/neondb?sslmode=require"
DATABASE_URL_UNPOOLED="postgresql://USER:PASS@HOST/neondb?sslmode=require"
JWT_SECRET="your-secret-key"
```

### Web (`web/.env.local`)
```env
VITE_API_BASE_URL=http://localhost:3001
```

> ⚠️ Never commit `.env` files to Git!

---

## Step 1: Start Backend API

```bash
cd D:\projects\leedz\api
npm ci
npm run dev
```

**Expected Output:**
```
[Nest] LOG [NestApplication] Nest application successfully started
API running on http://0.0.0.0:3001
```

**Verify:**
```bash
curl http://localhost:3001/health
# Should return: {"ok":true,"version":"1.0.0",...}
```

---

## Step 2: Start Frontend Web

```bash
cd D:\projects\leedz\web
npm ci
npm run dev
```

**Expected Output:**
```
VITE v5.x.x ready in xxx ms
➜ Local: http://localhost:3000/
```

**Verify:**
Open http://localhost:3000 in browser.

---

## Step 3: Verify Database Connection

```bash
cd D:\projects\leedz\api
npx prisma migrate status
```

**Expected Output:**
```
Database schema is up to date!
```

If migrations are pending:
```bash
npx prisma migrate deploy
```

---

## Step 4: Create Test User

**Option A: Via API**
```bash
curl -X POST http://localhost:3001/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"Test123!"}'
```

**Option B: Via Web UI**
1. Open http://localhost:3000/#/signup
2. Fill in the form
3. Submit

---

## Step 5: Test Login

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'
```

**Expected:** JSON with `token`, `user`, `role`, `tenantId`

---

## Step 6: Load Extension (Optional)

1. Open Chrome → `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select: `D:\projects\leedz\leedz_extension chrome\extension\dist`
5. Click extension icon to open side panel

---

## Ports Summary

| Service | Port | URL |
|---------|------|-----|
| API | 3001 | http://localhost:3001 |
| Web | 3000 | http://localhost:3000 |
| Prisma Studio | 5555 | http://localhost:5555 |

---

## Useful Commands

### View Database (Prisma Studio)
```bash
cd api
npx prisma studio
```

### Reset Database (CAUTION!)
```bash
cd api
npx prisma migrate reset
```

### Generate Prisma Client
```bash
cd api
npx prisma generate
```

### Create New Migration
```bash
cd api
npx prisma migrate dev --name your_migration_name
```

---

## Troubleshooting

### "Cannot connect to database"
- Check `DATABASE_URL` in `api/.env`
- Verify Neon dashboard shows database is active
- Try: `npx prisma db push`

### "401 Unauthorized on login"
- User may not exist - try signup first
- Check password is correct
- Verify JWT_SECRET is set

### "CORS error"
- API must be running on port 3001
- Check `api/src/main.ts` CORS config

### "Token not persisting after refresh"
- Check browser localStorage for `leedz_token`
- Clear localStorage and login again
