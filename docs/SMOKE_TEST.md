# Smoke Test Checklist

> **Project**: postzzz  
> **Purpose**: Verify end-to-end system functionality after deployment

---

## 1. API Health Check

### Test
```bash
curl https://postzzz-api.onrender.com/health
```

### Expected Response
```json
{
  "ok": true,
  "version": "1.0.0",
  "timestamp": "2026-01-12T...",
  "environment": "production"
}
```

### Status
- [ ] Returns 200 OK
- [ ] Response contains `ok: true`

---

## 2. Database Connection

### Test
Access Prisma Studio or run:
```bash
cd api
npx prisma db pull
```

### Verify
- [ ] Schema matches expected tables
- [ ] No connection errors
- [ ] Tables exist: `tenants`, `users`, `memberships`, `jobs`, `leads`, etc.

---

## 3. Frontend Loading

### Test
Open https://postzzz.vercel.app

### Verify
- [ ] Page loads without errors
- [ ] Login page displays correctly
- [ ] No console errors (check DevTools)
- [ ] API URL is correct (check Network tab)

---

## 4. User Authentication

### Test: Login
1. Go to https://postzzz.vercel.app/#/login
2. Enter test credentials:
   - Email: `testuser123@test.com`
   - Password: `Test@123`
3. Click Login

### Verify
- [ ] Login request goes to correct API
- [ ] JWT token received
- [ ] Redirected to dashboard
- [ ] User info displayed correctly

### Test: Signup (if no test user exists)
1. Go to https://postzzz.vercel.app/#/signup
2. Create new account
3. Verify account created in database

---

## 5. API CORS

### Test
From browser console on frontend:
```javascript
fetch('https://postzzz-api.onrender.com/health')
  .then(r => r.json())
  .then(console.log)
```

### Verify
- [ ] No CORS errors
- [ ] Response received

---

## 6. Database Write Test

### Test
Create a new lead or list via the UI

### Verify
- [ ] Create operation succeeds
- [ ] Data appears in UI
- [ ] Data exists in Neon database (check via Prisma Studio)

---

## 7. Swagger Documentation

### Test
Open https://postzzz-api.onrender.com/api/docs

### Verify
- [ ] Basic Auth prompt appears
- [ ] Docs load after authentication
- [ ] Endpoints are listed
- [ ] Can test endpoints from Swagger UI

---

## 8. WebSocket Connection (Extension)

### Test
1. Install extension
2. Login via extension sidepanel
3. Check connection status

### Verify
- [ ] Extension connects to API
- [ ] Heartbeat working
- [ ] No connection errors

---

## 9. Results Summary

| Test | Status | Notes |
|------|--------|-------|
| API Health | ⬜ | |
| Database Connection | ⬜ | |
| Frontend Loading | ⬜ | |
| User Login | ⬜ | |
| CORS | ⬜ | |
| Database Write | ⬜ | |
| Swagger Docs | ⬜ | |
| WebSocket | ⬜ | |

**Legend**: ✅ Pass | ❌ Fail | ⬜ Not Tested

---

## 10. Common Issues & Fixes

### API returns 502/503
- Render service may be sleeping (free tier)
- Wait 30-60 seconds for cold start
- Check Render logs for errors

### CORS errors
- Verify `CORS_ORIGINS` includes frontend URL
- Check for trailing slashes in URLs

### Database connection timeout
- Neon project may be paused
- Check Neon dashboard
- Verify DATABASE_URL is correct

### Login fails
- Check JWT_SECRET is set
- Verify user exists in database
- Check API logs for errors

---

## 11. Test Execution Date

**Date**: _______________  
**Tester**: _______________  
**Environment**: Production / Staging / Local  
**Overall Result**: ⬜ PASS / ⬜ FAIL
