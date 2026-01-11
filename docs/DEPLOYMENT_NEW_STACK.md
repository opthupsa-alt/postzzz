# Deployment - New Stack (postzzz)

> **Created**: 2026-01-12  
> **Status**: Production Ready

---

## 1. Infrastructure Overview

| Service | Provider | Project/Service Name |
|---------|----------|---------------------|
| Repository | GitHub | `opthupsa-alt/postzzz` |
| Database | Neon | `misty-waterfall-02005284` |
| Backend API | Render | `postzzz-api` |
| Frontend | Vercel | `postzzz` |

---

## 2. Required Environment Variables

### Backend (Render)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Neon pooled connection | `postgresql://...@...-pooler.../neondb?sslmode=require` |
| `DATABASE_URL_UNPOOLED` | Neon direct connection | `postgresql://...@.../neondb?sslmode=require` |
| `JWT_SECRET` | JWT signing secret | `your-secret-key-min-32-chars` |
| `JWT_EXPIRES_IN` | Token expiration | `7d` |
| `NODE_ENV` | Environment | `production` |
| `PORT` | Server port | `3001` |
| `CORS_ORIGINS` | Allowed origins | `https://postzzz.vercel.app` |
| `SWAGGER_ENABLED` | Enable Swagger | `1` |
| `SWAGGER_USER` | Swagger auth user | `admin` |
| `SWAGGER_PASS` | Swagger auth password | `********` |

### Frontend (Vercel)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Backend API URL | `https://postzzz-api.onrender.com` |

---

## 3. Deployment Steps

### A) Database (Neon)

```bash
# From api/ directory with DATABASE_URL set
npx prisma db push
# OR for production migrations:
npx prisma migrate deploy
```

### B) Backend (Render)

1. Connect Render to GitHub repo `opthupsa-alt/postzzz`
2. Configure:
   - **Root Directory**: `api`
   - **Build Command**: `npm install && npx prisma generate`
   - **Start Command**: `npm run start:prod`
   - **Health Check Path**: `/health`
3. Add all environment variables from section 2
4. Deploy

### C) Frontend (Vercel)

1. Connect Vercel to GitHub repo `opthupsa-alt/postzzz`
2. Configure:
   - **Root Directory**: `web`
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Add environment variables
4. Deploy

---

## 4. URLs

| Service | URL |
|---------|-----|
| Frontend | https://postzzz.vercel.app |
| Backend API | https://postzzz-api.onrender.com |
| API Health | https://postzzz-api.onrender.com/health |
| API Docs | https://postzzz-api.onrender.com/api/docs |

---

## 5. CORS Configuration

Backend must allow these origins:
- `https://postzzz.vercel.app`
- `https://*.vercel.app` (preview deployments)
- `http://localhost:3000` (local dev)
- `http://localhost:5173` (Vite dev)

---

## 6. Security Notes

- ⚠️ Never commit `.env` files
- ⚠️ Use strong JWT_SECRET (min 32 characters)
- ⚠️ Enable HTTPS only in production
- ⚠️ Swagger protected by Basic Auth in production
