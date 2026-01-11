# Running Locally

> **Project**: postzzz  
> **Stack**: NestJS (API) + React/Vite (Web) + Chrome Extension

---

## Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- Git
- Chrome browser (for extension)

---

## 1. Clone & Setup

```bash
git clone https://github.com/opthupsa-alt/postzzz.git
cd postzzz
```

---

## 2. Backend (API)

```bash
cd api

# Install dependencies
npm install

# Create .env file (copy from .env.example)
cp .env.example .env
# Edit .env and add your DATABASE_URL, JWT_SECRET, etc.

# Generate Prisma client
npx prisma generate

# Push schema to database (development)
npx prisma db push

# OR run migrations (production-like)
npx prisma migrate deploy

# Start development server
npm run dev
```

**API runs on**: http://localhost:3001  
**Swagger docs**: http://localhost:3001/api/docs

---

## 3. Frontend (Web)

```bash
cd web

# Install dependencies
npm install

# Create .env.local file
echo "VITE_API_BASE_URL=http://localhost:3001" > .env.local

# Start development server
npm run dev
```

**Web runs on**: http://localhost:5173 (or http://localhost:3000)

---

## 4. Chrome Extension

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `extension/` folder
5. Extension will appear in toolbar

### Extension Config (Local Dev)

Create `extension/config.js`:
```javascript
window.LEEDZ_CONFIG = {
  API_URL: 'http://localhost:3001',
  WEB_URL: 'http://localhost:5173',
  DEBUG_MODE: true,
  SHOW_SEARCH_WINDOW: false
};
```

---

## 5. Quick Start Script (Windows)

If available, use the sync script:
```powershell
.\ops\sync-and-start.ps1
```

This will:
1. Sync environment variables
2. Start API on port 3001
3. Start Web on port 3000

---

## 6. Default Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@optarget.com | Admin@123 |
| Test User | testuser123@test.com | Test@123 |

---

## 7. Common Commands

### API
```bash
npm run dev          # Development with hot reload
npm run build        # Build for production
npm run start:prod   # Run production build
npm run lint         # Run linter
npm run test         # Run tests
```

### Web
```bash
npm run dev          # Development server
npm run build        # Production build
npm run preview      # Preview production build
```

### Prisma
```bash
npx prisma studio    # Open Prisma Studio (DB GUI)
npx prisma db push   # Push schema changes
npx prisma migrate dev --name <name>  # Create migration
npx prisma generate  # Regenerate client
```

---

## 8. Ports Summary

| Service | Port |
|---------|------|
| API | 3001 |
| Web (Vite) | 5173 |
| Web (via script) | 3000 |
| Prisma Studio | 5555 |

---

## 9. Troubleshooting

### Database connection error
- Check DATABASE_URL in `.env`
- Ensure Neon project is active
- Try DATABASE_URL_UNPOOLED for migrations

### CORS errors
- Check CORS_ORIGINS in API `.env`
- Ensure frontend URL is in allowed origins

### Extension not connecting
- Check `extension/config.js` has correct API_URL
- Reload extension after config changes
- Check browser console for errors
