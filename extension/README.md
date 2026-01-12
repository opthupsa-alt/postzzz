# Postzzz Chrome Extension

إضافة Chrome لمنصة Postzzz - نشر تلقائي على منصات التواصل الاجتماعي

## الميزات

- ✅ نشر على X (Twitter) - Assist Mode
- ✅ نشر على LinkedIn - Assist Mode
- ✅ التقاط screenshots كإثبات
- ✅ كشف تسجيل الدخول للمنصات
- ✅ WebSocket للتحديثات الفورية
- ✅ تسجيل دخول تلقائي من المنصة

## التثبيت

1. **شغّل المشروع:**
   ```powershell
   cd d:\projects\postzzz
   .\ops\sync-and-start.ps1
   ```

2. **حمّل الإضافة في Chrome:**
   - افتح `chrome://extensions`
   - فعّل **Developer mode**
   - اضغط **Load unpacked**
   - اختر مجلد `d:\projects\postzzz\extension`

3. **استخدم الإضافة:**
   - اضغط على أيقونة الإضافة لفتح Side Panel
   - سجل دخول أو استخدم تسجيل الدخول التلقائي

## هيكل الملفات

```
extension/
├── manifest.json          # إعدادات الإضافة (MV3)
├── background.js          # Service Worker
├── sidepanel.html         # واجهة المستخدم
├── sidepanel.js           # منطق الواجهة
├── content-script.js      # التواصل مع المنصة
├── config.js              # إعدادات التطوير المحلي
├── config.production.js   # إعدادات الإنتاج
├── icons/                 # أيقونات الإضافة
└── runner/                # محرك النشر
    ├── runner-state.js    # إدارة حالة الجهاز
    ├── jobs-manager.js    # إدارة مهام النشر
    ├── platform-detectors.js  # كشف تسجيل الدخول
    ├── proof-capture.js   # التقاط الإثبات
    ├── runner-ui.html     # واجهة النشر
    ├── runner-ui.js       # منطق واجهة النشر
    └── playbooks/         # سيناريوهات النشر
        ├── x-playbook.js      # X (Twitter)
        └── linkedin-playbook.js  # LinkedIn
```

## الإعدادات

الإعدادات تُقرأ من `config.js` (للتطوير) أو `config.production.js` (للإنتاج):

```javascript
const LEEDZ_CONFIG = {
  API_URL: 'http://localhost:3001',
  WEB_URL: 'http://localhost:3000',
  DEBUG_MODE: true
};
```

## وضع المساعدة (Assist Mode)

في هذا الوضع:
1. الإضافة تفتح المنصة وتملأ المحتوى
2. المستخدم يراجع ويضغط "تأكيد النشر"
3. الإضافة تلتقط screenshot كإثبات
4. يتم تحديث حالة المهمة في المنصة
