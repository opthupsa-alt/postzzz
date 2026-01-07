# Leadzzz Chrome Extension (Dev Reference) — Side Panel

## تشغيل سريع
1) شغّل الـ Backend أولاً:
   - افتح `backend/` ثم: `node server.js`
   - تأكد أن: http://localhost:8787/health يعمل

2) افتح Chrome:
   - `chrome://extensions`
   - فعّل **Developer mode**
   - اختر **Load unpacked**
   - وحدد المجلد: `extension/dist`

3) اضغط على أي صفحة (LinkedIn أو أي موقع) ثم اضغط أيقونة Leadzzz لفتح الـ Side Panel.

## الدخول
داخل الـ Side Panel:
- email: `admin@leadz.local`
- password: `123456`
- API Base: `http://localhost:8787`

## ملاحظات
- Resolve يعتمد على URL فقط (لا scraping)
- Survey/WhatsApp تعمل كـ Jobs تجريبية وتكتمل تلقائياً
