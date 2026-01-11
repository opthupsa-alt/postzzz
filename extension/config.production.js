// ═══════════════════════════════════════════════════════════════════════════════
// Leedz Extension - Configuration (Production)
// ═══════════════════════════════════════════════════════════════════════════════
// هذا الملف للإنتاج - انسخه إلى config.js عند النشر على Chrome Web Store
// ═══════════════════════════════════════════════════════════════════════════════

const LEEDZ_CONFIG = {
  // URLs - Production
  API_URL: 'https://leedz-api.onrender.com',
  WEB_URL: 'https://leedz.vercel.app',

  // Extension Settings
  DEBUG_MODE: false,
  SHOW_SEARCH_WINDOW: false,
  MATCH_THRESHOLD: 90
};

// للاستخدام في background.js و sidepanel.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LEEDZ_CONFIG;
}
