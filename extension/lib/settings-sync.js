/**
 * Leedz Extension - Settings Sync
 * مزامنة الإعدادات بين الإضافة والـ Backend
 * 
 * @version 1.0.0
 * @lastUpdate 2026-01-08
 */

const SETTINGS_STORAGE_KEY = 'leedz_extension_settings';
const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Default settings
const DEFAULT_SETTINGS = {
  enableGoogleMaps: true,
  enableGoogleSearch: true,
  enableSocialMedia: false,
  matchThreshold: 90,
  maxResults: 30,
  searchDelay: 3,
  showSearchWindow: false,
  socialPlatforms: {},
  debugMode: false,
};

class SettingsSync {
  constructor(apiUrl, getAuthToken) {
    this.apiUrl = apiUrl;
    this.getAuthToken = getAuthToken;
    this.settings = { ...DEFAULT_SETTINGS };
    this.lastSync = null;
    this.syncInterval = null;
  }

  /**
   * تحميل الإعدادات من التخزين المحلي
   */
  async loadFromStorage() {
    try {
      const data = await chrome.storage.local.get(SETTINGS_STORAGE_KEY);
      if (data[SETTINGS_STORAGE_KEY]) {
        this.settings = { ...DEFAULT_SETTINGS, ...data[SETTINGS_STORAGE_KEY] };
      }
      return this.settings;
    } catch (error) {
      console.error('[SettingsSync] Failed to load from storage:', error);
      return this.settings;
    }
  }

  /**
   * حفظ الإعدادات في التخزين المحلي
   */
  async saveToStorage(settings) {
    try {
      this.settings = { ...this.settings, ...settings };
      await chrome.storage.local.set({ [SETTINGS_STORAGE_KEY]: this.settings });
      return true;
    } catch (error) {
      console.error('[SettingsSync] Failed to save to storage:', error);
      return false;
    }
  }

  /**
   * جلب الإعدادات من الـ Backend
   */
  async fetchFromBackend() {
    try {
      const token = await this.getAuthToken();
      if (!token) {
        console.log('[SettingsSync] No auth token, using local settings');
        return null;
      }

      const response = await fetch(`${this.apiUrl}/extension-settings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.settings;
    } catch (error) {
      console.error('[SettingsSync] Failed to fetch from backend:', error);
      return null;
    }
  }

  /**
   * إرسال الإعدادات للـ Backend
   */
  async pushToBackend(settings) {
    try {
      const token = await this.getAuthToken();
      if (!token) {
        console.log('[SettingsSync] No auth token, cannot push to backend');
        return false;
      }

      const response = await fetch(`${this.apiUrl}/extension-settings`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error('[SettingsSync] Failed to push to backend:', error);
      return false;
    }
  }

  /**
   * مزامنة الإعدادات (جلب من Backend وتحديث المحلي)
   */
  async sync() {
    console.log('[SettingsSync] Starting sync...');

    // جلب من Backend
    const backendSettings = await this.fetchFromBackend();

    if (backendSettings) {
      // تحديث المحلي بإعدادات Backend
      await this.saveToStorage(backendSettings);
      this.lastSync = Date.now();
      console.log('[SettingsSync] Synced from backend:', this.settings);
    } else {
      // استخدام المحلي
      await this.loadFromStorage();
      console.log('[SettingsSync] Using local settings:', this.settings);
    }

    return this.settings;
  }

  /**
   * تحديث إعداد معين
   */
  async updateSetting(key, value) {
    this.settings[key] = value;
    await this.saveToStorage(this.settings);
    
    // محاولة المزامنة مع Backend
    await this.pushToBackend({ [key]: value });

    return this.settings;
  }

  /**
   * تحديث عدة إعدادات
   */
  async updateSettings(updates) {
    this.settings = { ...this.settings, ...updates };
    await this.saveToStorage(this.settings);
    
    // محاولة المزامنة مع Backend
    await this.pushToBackend(updates);

    return this.settings;
  }

  /**
   * الحصول على الإعدادات الحالية
   */
  getSettings() {
    return { ...this.settings };
  }

  /**
   * الحصول على إعداد معين
   */
  getSetting(key) {
    return this.settings[key];
  }

  /**
   * إعادة تعيين الإعدادات
   */
  async resetSettings() {
    this.settings = { ...DEFAULT_SETTINGS };
    await this.saveToStorage(this.settings);
    
    // إرسال للـ Backend
    try {
      const token = await this.getAuthToken();
      if (token) {
        await fetch(`${this.apiUrl}/extension-settings/reset`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      console.error('[SettingsSync] Failed to reset on backend:', error);
    }

    return this.settings;
  }

  /**
   * بدء المزامنة الدورية
   */
  startAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(() => {
      this.sync();
    }, SYNC_INTERVAL);

    // مزامنة فورية
    this.sync();
  }

  /**
   * إيقاف المزامنة الدورية
   */
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
}

// تصدير
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SettingsSync, DEFAULT_SETTINGS };
}
