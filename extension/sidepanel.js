/**
 * Leedz Extension - Side Panel Script
 * Extension receives commands from platform via WebSocket - no local search UI
 */

// ==================== Configuration ====================
// يتم تحميل الإعدادات من config.js - الافتراضي هو الإنتاج
const CONFIG = typeof LEEDZ_CONFIG !== 'undefined' ? LEEDZ_CONFIG : {
  API_URL: 'https://leedz-api.onrender.com',
  WEB_URL: 'https://leedz.vercel.app'
};

// ==================== DOM Elements ====================

const loadingContainer = document.getElementById('loadingContainer');
const loginContainer = document.getElementById('loginContainer');
const appContainer = document.getElementById('appContainer');
const loadingStatus = document.getElementById('loadingStatus');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const loginBtn = document.getElementById('loginBtn');
const loginBtnText = document.getElementById('loginBtnText');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const userName = document.getElementById('userName');
const userAvatar = document.getElementById('userAvatar');
const connectionStatus = document.getElementById('connectionStatus');
const logoutBtn = document.getElementById('logoutBtn');
const autoLoginSection = document.getElementById('autoLoginSection');
const autoLoginBtn = document.getElementById('autoLoginBtn');
const autoLoginBtnText = document.getElementById('autoLoginBtnText');
const openPlatformBtn = document.getElementById('openPlatformBtn');

// Job status elements
const activeJobSection = document.getElementById('activeJobSection');
const jobType = document.getElementById('jobType');
const jobProgress = document.getElementById('jobProgress');
const jobProgressBar = document.getElementById('jobProgressBar');
const recentResultsSection = document.getElementById('recentResultsSection');
const resultsCount = document.getElementById('resultsCount');
const resultsList = document.getElementById('resultsList');

// ==================== State ====================

let isLoading = false;
let platformConfig = null;
let currentJob = null;
let extensionSettings = null;
let currentSearchType = 'BULK'; // Track search type for display
let cachedResults = []; // Cache results locally

// ==================== Helpers ====================

function sendMessage(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, resolve);
  });
}

function showError(message) {
  loginError.textContent = message;
  loginError.classList.add('show');
}

function hideError() {
  loginError.classList.remove('show');
}

function setLoading(loading) {
  isLoading = loading;
  loginBtn.disabled = loading;
  loginBtnText.innerHTML = loading 
    ? '<span class="spinner"></span>' 
    : 'تسجيل الدخول';
}

function showLoadingScreen(message) {
  loadingContainer.classList.remove('hide');
  loginContainer.classList.add('hide');
  appContainer.classList.remove('show');
  if (message) loadingStatus.textContent = message;
}

function hideLoadingScreen() {
  loadingContainer.classList.add('hide');
}

function showApp(user) {
  hideLoadingScreen();
  loginContainer.classList.add('hide');
  appContainer.classList.add('show');
  
  if (user) {
    userName.textContent = user.name || user.email || 'المستخدم';
    userAvatar.textContent = (user.name || user.email || 'م').charAt(0).toUpperCase();
  }
  
  // Connect WebSocket after showing app
  sendMessage({ type: 'CONNECT_WEBSOCKET' });
  updateConnectionStatus();
}

function showLogin() {
  hideLoadingScreen();
  loginContainer.classList.remove('hide');
  appContainer.classList.remove('show');
  emailInput.value = '';
  passwordInput.value = '';
  hideError();
  
  // Show auto-login button if enabled
  if (platformConfig?.extensionAutoLogin) {
    autoLoginSection.style.display = 'block';
  }
}

async function updateConnectionStatus() {
  try {
    const response = await sendMessage({ type: 'GET_WS_STATUS' });
    if (response?.connected) {
      connectionStatus.className = 'status-badge connected';
      connectionStatus.innerHTML = '<span>●</span> متصل بالمنصة';
    } else {
      connectionStatus.className = 'status-badge disconnected';
      connectionStatus.innerHTML = '<span>●</span> غير متصل';
    }
  } catch (error) {
    connectionStatus.className = 'status-badge disconnected';
    connectionStatus.innerHTML = '<span>●</span> خطأ في الاتصال';
  }
}

// ==================== Job Status Display ====================

function showActiveJob(job) {
  currentJob = job;
  if (activeJobSection) activeJobSection.style.display = 'block';
  
  const typeLabels = {
    'SEARCH_SINGLE': '🔍 بحث عن شركة',
    'SEARCH_BULK': '🔍 بحث متعدد',
    'google_maps': '🗺️ بحث Google Maps',
  };
  
  if (jobType) jobType.textContent = typeLabels[job.type] || job.type;
  if (jobProgress) jobProgress.textContent = job.status === 'RUNNING' ? 'جاري التنفيذ...' : job.status;
  if (jobProgressBar) jobProgressBar.style.width = `${job.progress || 0}%`;
  
  // إظهار زر الإيقاف
  const stopBtn = document.getElementById('stopSearchBtn');
  if (stopBtn) stopBtn.style.display = 'flex';
}

function hideActiveJob() {
  currentJob = null;
  if (activeJobSection) activeJobSection.style.display = 'none';
  // إخفاء زر الإيقاف
  const stopBtn = document.getElementById('stopSearchBtn');
  if (stopBtn) stopBtn.style.display = 'none';
}

function showResults(results, searchType = null) {
  if (recentResultsSection) recentResultsSection.style.display = 'block';
  if (resultsCount) resultsCount.textContent = results.length;
  
  // Update search type if provided
  if (searchType) {
    currentSearchType = searchType;
  }
  
  // Cache results in memory and storage
  cachedResults = results;
  saveResultsToStorage(results, currentSearchType);
  
  if (!resultsList) return;
  
  if (results.length === 0) {
    resultsList.innerHTML = '<div style="text-align: center; padding: 16px; color: #64748b;">لم يتم العثور على نتائج</div>';
    return;
  }
  
  // Show search type indicator
  const searchTypeLabel = currentSearchType === 'SINGLE' ? '🏢 نتيجة البحث عن شركة' : '📋 نتائج البحث المتعدد';
  
  resultsList.innerHTML = `<div style="font-size: 12px; color: #3b82f6; margin-bottom: 8px; font-weight: 600;">${searchTypeLabel}</div>`;
  
  resultsList.innerHTML += results.slice(0, 10).map(r => `
    <div style="background: #f8fafc; border-radius: 8px; padding: 10px; margin-bottom: 6px;">
      <div style="font-weight: 600; color: #1e293b; font-size: 13px;">${r.name || 'بدون اسم'}</div>
      ${r.type ? `<div style="font-size: 11px; color: #64748b;">${r.type}</div>` : ''}
      ${r.address ? `<div style="font-size: 11px; color: #64748b;">📍 ${r.address.substring(0, 50)}${r.address.length > 50 ? '...' : ''}</div>` : ''}
      ${r.phone ? `<div style="font-size: 11px; color: #10b981;">📞 ${r.phone}</div>` : ''}
      ${r.rating ? `<div style="font-size: 11px; color: #f59e0b;">⭐ ${r.rating} ${r.reviews ? `(${r.reviews})` : ''}</div>` : ''}
      ${r.matchScore ? `<div style="font-size: 10px; color: #8b5cf6;">مطابقة: ${Math.round(r.matchScore)}%</div>` : ''}
    </div>
  `).join('');
  
  if (results.length > 10) {
    resultsList.innerHTML += `<div style="text-align: center; padding: 8px; color: #3b82f6; font-size: 12px;">+ ${results.length - 10} نتيجة أخرى في المنصة</div>`;
  }
}

// ==================== Results Persistence ====================

/**
 * Save results to chrome.storage.local for persistence
 */
async function saveResultsToStorage(results, searchType) {
  try {
    await chrome.storage.local.set({
      leedz_cached_results: {
        results,
        searchType,
        timestamp: Date.now(),
      }
    });
    console.log('[Leedz] Results saved to storage:', results.length);
  } catch (error) {
    console.error('[Leedz] Failed to save results:', error);
  }
}

/**
 * Load cached results from chrome.storage.local or from API
 */
async function loadResultsFromStorage() {
  try {
    // First try chrome.storage.local
    const data = await chrome.storage.local.get('leedz_cached_results');
    const cached = data.leedz_cached_results;
    
    if (cached && cached.results && cached.results.length > 0) {
      // Check if results are not too old (24 hours)
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      if (Date.now() - cached.timestamp < maxAge) {
        console.log('[Leedz] Loaded cached results from storage:', cached.results.length);
        cachedResults = cached.results;
        currentSearchType = cached.searchType || 'BULK';
        displayCachedResults(cached.results, cached.searchType, cached.query);
        return true;
      } else {
        console.log('[Leedz] Cached results expired, clearing...');
        await clearCachedResults();
      }
    }
    
    // If no local cache, try to load from API (database)
    console.log('[Leedz] No local cache, trying to load from API...');
    const loaded = await loadResultsFromAPI();
    return loaded;
  } catch (error) {
    console.error('[Leedz] Failed to load cached results:', error);
    return false;
  }
}

/**
 * Load last search results from API (database)
 */
async function loadResultsFromAPI() {
  try {
    const response = await sendMessage({ type: 'GET_RECENT_SEARCH' });
    
    if (response?.success && response.search && response.search.results) {
      const search = response.search;
      const results = search.results || [];
      
      if (results.length > 0) {
        console.log('[Leedz] Loaded results from API:', results.length);
        cachedResults = results;
        currentSearchType = search.searchType || 'BULK';
        
        // Cache locally for faster access
        await chrome.storage.local.set({
          leedz_cached_results: {
            results,
            searchType: search.searchType,
            timestamp: new Date(search.createdAt).getTime(),
            query: search.query,
            city: search.city,
          }
        });
        
        displayCachedResults(results, search.searchType, search.query);
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('[Leedz] Failed to load results from API:', error);
    return false;
  }
}

/**
 * Display cached results without re-saving
 */
function displayCachedResults(results, searchType, query = null) {
  if (recentResultsSection) recentResultsSection.style.display = 'block';
  if (resultsCount) resultsCount.textContent = results.length;
  
  if (!resultsList) return;
  
  if (results.length === 0) {
    resultsList.innerHTML = '<div style="text-align: center; padding: 16px; color: #64748b;">لم يتم العثور على نتائج</div>';
    return;
  }
  
  const searchTypeLabel = searchType === 'SINGLE' ? '🏢 نتيجة البحث عن شركة' : '📋 نتائج البحث المتعدد';
  
  resultsList.innerHTML = `
    <div style="font-size: 12px; color: #3b82f6; margin-bottom: 8px; font-weight: 600;">${searchTypeLabel}</div>
    <div style="font-size: 10px; color: #94a3b8; margin-bottom: 8px;">📌 نتائج محفوظة</div>
  `;
  
  resultsList.innerHTML += results.slice(0, 10).map(r => `
    <div style="background: #f8fafc; border-radius: 8px; padding: 10px; margin-bottom: 6px;">
      <div style="font-weight: 600; color: #1e293b; font-size: 13px;">${r.name || 'بدون اسم'}</div>
      ${r.type ? `<div style="font-size: 11px; color: #64748b;">${r.type}</div>` : ''}
      ${r.address ? `<div style="font-size: 11px; color: #64748b;">📍 ${r.address.substring(0, 50)}${r.address.length > 50 ? '...' : ''}</div>` : ''}
      ${r.phone ? `<div style="font-size: 11px; color: #10b981;">📞 ${r.phone}</div>` : ''}
      ${r.rating ? `<div style="font-size: 11px; color: #f59e0b;">⭐ ${r.rating} ${r.reviews ? `(${r.reviews})` : ''}</div>` : ''}
      ${r.matchScore ? `<div style="font-size: 10px; color: #8b5cf6;">مطابقة: ${Math.round(r.matchScore)}%</div>` : ''}
    </div>
  `).join('');
  
  if (results.length > 10) {
    resultsList.innerHTML += `<div style="text-align: center; padding: 8px; color: #3b82f6; font-size: 12px;">+ ${results.length - 10} نتيجة أخرى في المنصة</div>`;
  }
}

/**
 * Clear cached results
 */
async function clearCachedResults() {
  try {
    await chrome.storage.local.remove('leedz_cached_results');
    cachedResults = [];
    if (recentResultsSection) recentResultsSection.style.display = 'none';
    console.log('[Leedz] Cached results cleared');
  } catch (error) {
    console.error('[Leedz] Failed to clear cached results:', error);
  }
}

// Listen for messages from background
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'WS_CONNECTED' || message.type === 'WS_AUTHENTICATED' || message.type === 'POLLING_STARTED') {
    connectionStatus.className = 'status-badge connected';
    connectionStatus.innerHTML = '<span>●</span> متصل بالمنصة';
  } else if (message.type === 'WS_DISCONNECTED' || message.type === 'POLLING_STOPPED') {
    // Only show disconnected if polling also stopped
    if (message.type === 'POLLING_STOPPED') {
      connectionStatus.className = 'status-badge disconnected';
      connectionStatus.innerHTML = '<span>●</span> غير متصل';
    }
  } else if (message.type === 'JOB_STARTED') {
    showActiveJob(message.job);
  } else if (message.type === 'JOB_PROGRESS') {
    if (currentJob && jobProgressBar) {
      jobProgressBar.style.width = `${message.progress}%`;
      if (jobProgress) jobProgress.textContent = message.status || 'جاري التنفيذ...';
    }
  } else if (message.type === 'JOB_COMPLETED') {
    hideActiveJob();
    if (message.results) {
      // Determine search type from job or message
      const searchType = message.searchType || (message.results.length === 1 ? 'SINGLE' : 'BULK');
      showResults(message.results, searchType);
    }
  } else if (message.type === 'JOB_FAILED') {
    hideActiveJob();
    if (jobProgress) jobProgress.textContent = 'فشل: ' + (message.error || 'خطأ غير معروف');
  }
});

// ==================== Auth ====================

async function checkAuth() {
  showLoadingScreen('جاري التحقق من حالة تسجيل الدخول...');
  
  // Get platform config
  platformConfig = await sendMessage({ type: 'GET_PLATFORM_CONFIG' });
  
  // Check existing auth
  const response = await sendMessage({ type: 'GET_AUTH_STATE' });
  
  if (response?.isAuthenticated) {
    showLoadingScreen('جاري التحقق من صلاحية الجلسة...');
    const verifyResponse = await sendMessage({ type: 'VERIFY_TOKEN' });
    if (verifyResponse?.valid) {
      showApp(response.user);
      return;
    }
  }
  
  // Try auto-login from platform
  if (platformConfig?.extensionAutoLogin) {
    showLoadingScreen('جاري محاولة تسجيل الدخول التلقائي...');
    const autoLoginResult = await sendMessage({ type: 'CHECK_PLATFORM_LOGIN' });
    
    if (autoLoginResult?.success) {
      const authState = await sendMessage({ type: 'GET_AUTH_STATE' });
      showApp(authState.user);
      return;
    }
  }
  
  showLogin();
}

async function handleLogin(e) {
  e.preventDefault();
  
  if (isLoading) return;
  
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  
  if (!email || !password) {
    showError('الرجاء إدخال البريد الإلكتروني وكلمة المرور');
    return;
  }
  
  hideError();
  setLoading(true);
  
  try {
    const response = await sendMessage({
      type: 'LOGIN',
      email,
      password,
    });
    
    if (response?.error) {
      showError(response.error === 'Invalid credentials' 
        ? 'بيانات الدخول غير صحيحة' 
        : response.error);
      return;
    }
    
    if (response?.token) {
      showApp(response.user);
    } else {
      showError('حدث خطأ غير متوقع');
    }
  } catch (error) {
    showError('فشل الاتصال بالخادم');
    console.error('Login error:', error);
  } finally {
    setLoading(false);
  }
}

async function handleAutoLogin() {
  autoLoginBtn.disabled = true;
  autoLoginBtnText.innerHTML = '<span class="spinner"></span> جاري التحقق...';
  
  try {
    const result = await sendMessage({ type: 'CHECK_PLATFORM_LOGIN' });
    
    if (result?.success) {
      const authState = await sendMessage({ type: 'GET_AUTH_STATE' });
      showApp(authState.user);
    } else if (result?.reason === 'not_logged_in') {
      // Open platform for login
      showError('يرجى تسجيل الدخول في المنصة أولاً');
      await sendMessage({ type: 'OPEN_PLATFORM' });
    } else {
      showError('فشل تسجيل الدخول التلقائي: ' + (result?.error || result?.reason || 'خطأ غير معروف'));
    }
  } catch (error) {
    showError('فشل الاتصال');
    console.error('Auto-login error:', error);
  } finally {
    autoLoginBtn.disabled = false;
    autoLoginBtnText.innerHTML = '🔗 تسجيل الدخول من المنصة';
  }
}

async function handleLogout() {
  await sendMessage({ type: 'LOGOUT' });
  showLogin();
}

async function handleOpenPlatform() {
  await sendMessage({ type: 'OPEN_PLATFORM' });
}

// تحديث حالة طبقات البحث
function updateLayersStatus(settings) {
  const layerMaps = document.getElementById('layerGoogleMaps');
  const layerSearch = document.getElementById('layerGoogleSearch');
  const layerSocial = document.getElementById('layerSocialMedia');
  
  if (layerMaps) {
    layerMaps.className = 'layer-badge ' + (settings?.enableGoogleMaps !== false ? 'active' : '');
  }
  if (layerSearch) {
    layerSearch.className = 'layer-badge ' + (settings?.enableGoogleSearch !== false ? 'active' : '');
  }
  if (layerSocial) {
    layerSocial.className = 'layer-badge ' + (settings?.enableSocialMedia ? 'active' : '');
  }
}

// تحديث حالة الإضافة
function updateExtensionStatus(status, message) {
  const icon = document.getElementById('extensionStatusIcon');
  const text = document.getElementById('extensionStatusText');
  
  if (!icon || !text) return;
  
  switch (status) {
    case 'ready':
      icon.textContent = '✅';
      text.textContent = message || 'جاهز للعمل';
      text.style.color = '#16a34a';
      break;
    case 'busy':
      icon.textContent = '⏳';
      text.textContent = message || 'جاري العمل...';
      text.style.color = '#d97706';
      break;
    case 'error':
      icon.textContent = '❌';
      text.textContent = message || 'خطأ';
      text.style.color = '#dc2626';
      break;
    default:
      icon.textContent = '⚡';
      text.textContent = message || 'غير معروف';
      text.style.color = '#64748b';
  }
}

// تحميل الإعدادات
async function loadExtensionSettings() {
  try {
    const result = await sendMessage({ type: 'GET_SETTINGS' });
    if (result?.settings) {
      extensionSettings = result.settings;
      updateLayersStatus(extensionSettings);
    }
  } catch (error) {
    console.error('[Leedz] Failed to load settings:', error);
  }
}

// ==================== Event Listeners ====================

loginForm.addEventListener('submit', handleLogin);
logoutBtn.addEventListener('click', handleLogout);
autoLoginBtn?.addEventListener('click', handleAutoLogin);
openPlatformBtn?.addEventListener('click', handleOpenPlatform);

// Test Deep Search button
const testDeepSearchBtn = document.getElementById('testDeepSearchBtn');
testDeepSearchBtn?.addEventListener('click', handleTestDeepSearch);

// ==================== Deep Search Test ====================

async function handleTestDeepSearch() {
  const companyName = prompt('أدخل اسم الشركة للبحث:', 'مطعم البيك');
  if (!companyName) return;
  
  const city = prompt('أدخل المدينة (اختياري):', 'الرياض');
  
  const deepReportSection = document.getElementById('deepReportSection');
  const deepReportContainer = document.getElementById('deepReportContainer');
  
  if (!deepReportSection || !deepReportContainer) return;
  
  deepReportSection.style.display = 'block';
  deepReportContainer.innerHTML = `
    <div style="text-align: center; padding: 20px;">
      <div class="spinner" style="margin: 0 auto 12px; border-color: #3b82f6; border-top-color: #1d4ed8;"></div>
      <p style="color: #64748b; font-size: 13px;">جاري البحث الشامل...</p>
      <p id="deepSearchStatus" style="color: #3b82f6; font-size: 12px; margin-top: 8px;">بدء البحث...</p>
    </div>
  `;
  
  updateExtensionStatus('busy', 'جاري البحث الشامل...');
  
  try {
    // تنفيذ البحث الشامل
    const searchResult = await sendMessage({
      type: 'DEEP_SEARCH',
      companyData: {
        companyName,
        city: city || undefined,
      }
    });
    
    console.log('[Leedz] Deep search result:', searchResult);
    
    if (!searchResult || !searchResult.success) {
      throw new Error(searchResult?.error || 'فشل البحث');
    }
    
    // تحديث الحالة
    document.getElementById('deepSearchStatus').textContent = 'جاري تنسيق التقرير بالذكاء الاصطناعي...';
    
    // إرسال للـ API لتنسيق التقرير
    const authState = await sendMessage({ type: 'GET_AUTH_STATE' });
    const token = authState?.token;
    
    if (!token) {
      throw new Error('يجب تسجيل الدخول أولاً');
    }
    
    const formatResponse = await fetch(`${CONFIG.API_URL}/survey/format-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(searchResult),
    });
    
    if (!formatResponse.ok) {
      const errorText = await formatResponse.text();
      throw new Error(`API Error: ${formatResponse.status} - ${errorText}`);
    }
    
    const formattedReport = await formatResponse.json();
    console.log('[Leedz] Formatted report:', formattedReport);
    
    // عرض النتيجة
    displayFormattedReport(deepReportContainer, formattedReport, searchResult);
    updateExtensionStatus('ready', 'اكتمل التقرير');
    
  } catch (error) {
    console.error('[Leedz] Deep search error:', error);
    deepReportContainer.innerHTML = `
      <div style="text-align: center; padding: 20px; color: #dc2626;">
        <div style="font-size: 32px; margin-bottom: 12px;">❌</div>
        <p style="font-weight: bold;">حدث خطأ</p>
        <p style="font-size: 12px; margin-top: 8px;">${error.message}</p>
        <button onclick="document.getElementById('testDeepSearchBtn').click()" 
                style="margin-top: 16px; padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer;">
          🔄 إعادة المحاولة
        </button>
      </div>
    `;
    updateExtensionStatus('error', 'فشل البحث');
  }
}

function displayFormattedReport(container, report, searchResult) {
  const r = report;
  const sources = searchResult.sources || [];
  
  container.innerHTML = `
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 16px; color: white; margin-bottom: 16px;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="width: 60px; height: 60px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center;">
          <span style="font-size: 24px; font-weight: bold;">${r.executiveSummary?.overallScore || 0}</span>
          <span style="font-size: 10px;">%</span>
        </div>
        <div>
          <h4 style="margin: 0; font-size: 14px;">${r.executiveSummary?.headline || 'تقرير'}</h4>
          <p style="margin: 4px 0 0; font-size: 11px; opacity: 0.8;">المصادر: ${sources.join(', ') || 'لا يوجد'}</p>
        </div>
      </div>
    </div>
    
    <!-- Summary Points -->
    <div style="margin-bottom: 16px;">
      <h5 style="font-size: 12px; color: #64748b; margin-bottom: 8px;">📋 ملخص</h5>
      <ul style="margin: 0; padding: 0; list-style: none;">
        ${(r.executiveSummary?.points || []).map(p => `
          <li style="padding: 6px 0; padding-right: 16px; position: relative; font-size: 13px; color: #475569;">
            <span style="position: absolute; right: 0; color: #22c55e;">✓</span>
            ${p}
          </li>
        `).join('')}
      </ul>
    </div>
    
    <!-- Digital Presence -->
    <div style="margin-bottom: 16px;">
      <h5 style="font-size: 12px; color: #64748b; margin-bottom: 8px;">🌐 الحضور الرقمي</h5>
      <div style="display: flex; flex-direction: column; gap: 6px;">
        ${(r.digitalPresence?.breakdown || []).map(item => `
          <div style="display: flex; justify-content: space-between; padding: 8px 10px; background: ${getStatusBg(item.status)}; border-radius: 6px; font-size: 12px;">
            <span>${item.category}</span>
            <span>${getStatusLabel(item.status)}</span>
          </div>
        `).join('')}
      </div>
    </div>
    
    <!-- Social Media -->
    ${r.socialMedia?.platforms?.length > 0 ? `
      <div style="margin-bottom: 16px;">
        <h5 style="font-size: 12px; color: #64748b; margin-bottom: 8px;">📱 السوشيال ميديا</h5>
        <div style="display: flex; flex-wrap: wrap; gap: 6px;">
          ${r.socialMedia.platforms.map(p => `
            <a href="${p.url}" target="_blank" style="padding: 6px 10px; background: #f1f5f9; border-radius: 16px; text-decoration: none; color: #475569; font-size: 11px;">
              ${p.name} ${p.followers ? `(${p.followers})` : ''}
            </a>
          `).join('')}
        </div>
        ${r.socialMedia.totalFollowers > 0 ? `
          <p style="font-size: 11px; color: #64748b; margin-top: 8px;">إجمالي المتابعين: ${r.socialMedia.totalFollowers.toLocaleString()}</p>
        ` : ''}
      </div>
    ` : ''}
    
    <!-- Opportunities -->
    <div style="margin-bottom: 16px;">
      <h5 style="font-size: 12px; color: #64748b; margin-bottom: 8px;">💡 الفرص</h5>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        ${(r.opportunities || []).map(opp => `
          <div style="padding: 10px; background: #f9fafb; border-radius: 8px; border-right: 3px solid ${getPriorityColor(opp.priority)};">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span style="font-weight: 600; font-size: 12px;">${opp.title}</span>
              <span style="font-size: 10px;">${getPriorityLabel(opp.priority)}</span>
            </div>
            <p style="margin: 0; font-size: 11px; color: #64748b;">${opp.description}</p>
            ${opp.suggestedService ? `<span style="display: inline-block; margin-top: 6px; padding: 3px 8px; background: #667eea; color: white; border-radius: 10px; font-size: 10px;">💼 ${opp.suggestedService}</span>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
    
    <!-- Opening Script -->
    ${r.openingScript ? `
      <div style="margin-bottom: 16px;">
        <h5 style="font-size: 12px; color: #64748b; margin-bottom: 8px;">📝 سكريبت الافتتاح</h5>
        <div style="padding: 12px; background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 8px; border-right: 3px solid #22c55e;">
          <p style="margin: 0; font-size: 12px; color: #166534; line-height: 1.6;">"${r.openingScript}"</p>
        </div>
      </div>
    ` : ''}
    
    <!-- Qualifying Questions -->
    ${r.qualifyingQuestions?.length > 0 ? `
      <div style="margin-bottom: 16px;">
        <h5 style="font-size: 12px; color: #64748b; margin-bottom: 8px;">❓ أسئلة التأهيل</h5>
        <ul style="margin: 0; padding: 0; list-style: none;">
          ${r.qualifyingQuestions.map(q => `
            <li style="padding: 8px 10px; margin-bottom: 4px; background: #fef3c7; border-radius: 6px; font-size: 12px; color: #92400e;">
              ${q}
            </li>
          `).join('')}
        </ul>
      </div>
    ` : ''}
    
    <!-- Sales Tips -->
    <div style="margin-bottom: 16px;">
      <h5 style="font-size: 12px; color: #64748b; margin-bottom: 8px;">🎯 نصائح للمبيعات</h5>
      <ul style="margin: 0; padding: 0; list-style: none;">
        ${(r.salesTips || []).map((tip, i) => `
          <li style="display: flex; align-items: flex-start; gap: 8px; padding: 6px 0; font-size: 12px; color: #475569;">
            <span style="width: 20px; height: 20px; background: #667eea; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; flex-shrink: 0;">${i + 1}</span>
            ${tip}
          </li>
        `).join('')}
      </ul>
    </div>
    
    <!-- Contact Info -->
    ${r.contactInfo?.phone || r.contactInfo?.website ? `
      <div style="padding: 12px; background: #f1f5f9; border-radius: 8px; margin-bottom: 16px;">
        <h5 style="font-size: 12px; color: #64748b; margin-bottom: 8px;">📞 معلومات الاتصال</h5>
        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
          ${r.contactInfo.phone ? `<a href="tel:${r.contactInfo.phone}" style="padding: 6px 10px; background: white; border-radius: 6px; text-decoration: none; color: #475569; font-size: 11px;">📱 ${r.contactInfo.phone}</a>` : ''}
          ${r.contactInfo.website ? `<a href="${r.contactInfo.website}" target="_blank" style="padding: 6px 10px; background: white; border-radius: 6px; text-decoration: none; color: #475569; font-size: 11px;">🌐 الموقع</a>` : ''}
        </div>
        ${r.contactInfo.address ? `<p style="margin: 8px 0 0; font-size: 11px; color: #64748b;">📍 ${r.contactInfo.address}</p>` : ''}
      </div>
    ` : ''}
    
    <!-- Footer -->
    <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 12px; border-top: 1px solid #e2e8f0;">
      <span style="font-size: 10px; color: #94a3b8;">🪙 ${r.tokensUsed || 0} توكن</span>
      <button onclick="document.getElementById('testDeepSearchBtn').click()" 
              style="padding: 6px 12px; background: #667eea; color: white; border: none; border-radius: 6px; font-size: 11px; cursor: pointer;">
        🔄 تقرير جديد
      </button>
    </div>
  `;
}

function getStatusBg(status) {
  const colors = {
    excellent: '#dcfce7',
    good: '#dbeafe',
    needs_work: '#fef3c7',
    missing: '#fee2e2',
  };
  return colors[status] || '#f1f5f9';
}

function getStatusLabel(status) {
  const labels = {
    excellent: '✅ ممتاز',
    good: '👍 جيد',
    needs_work: '⚠️ يحتاج تحسين',
    missing: '❌ غائب',
  };
  return labels[status] || status;
}

function getPriorityColor(priority) {
  const colors = {
    high: '#ef4444',
    medium: '#f59e0b',
    low: '#22c55e',
  };
  return colors[priority] || '#94a3b8';
}

function getPriorityLabel(priority) {
  const labels = {
    high: '🔴 عالية',
    medium: '🟡 متوسطة',
    low: '🟢 منخفضة',
  };
  return labels[priority] || priority;
}

// Settings button
document.getElementById('settingsBtn')?.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// Stop Search button - زر إيقاف البحث
document.getElementById('stopSearchBtn')?.addEventListener('click', async () => {
  console.log('[Leedz] User clicked stop search');
  const stopBtn = document.getElementById('stopSearchBtn');
  if (stopBtn) {
    stopBtn.disabled = true;
    stopBtn.innerHTML = '⏳ جاري الإيقاف...';
  }
  
  try {
    const response = await sendMessage({ type: 'STOP_SEARCH' });
    console.log('[Leedz] Stop search response:', response);
    
    if (response?.success) {
      hideActiveJob();
      updateExtensionStatus('ready', 'تم إيقاف البحث');
    }
  } catch (error) {
    console.error('[Leedz] Stop search error:', error);
  } finally {
    if (stopBtn) {
      stopBtn.disabled = false;
      stopBtn.innerHTML = '⏹️ إيقاف البحث';
    }
  }
});

// Listen for messages from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'JOB_PROGRESS') {
    updateExtensionStatus('busy', message.message);
    if (jobProgressBar) {
      jobProgressBar.style.width = (message.progress || 0) + '%';
    }
    if (jobProgress) {
      jobProgress.textContent = message.message || 'جاري التنفيذ...';
    }
    if (activeJobSection) {
      activeJobSection.style.display = 'block';
    }
  } else if (message.type === 'JOB_COMPLETE') {
    updateExtensionStatus('ready', 'اكتمل البحث');
    if (activeJobSection) {
      activeJobSection.style.display = 'none';
    }
  } else if (message.type === 'SETTINGS_UPDATED') {
    extensionSettings = message.settings;
    updateLayersStatus(extensionSettings);
  }
});

// ==================== Initialize ====================

// Load cached results first, then check auth
loadResultsFromStorage().then(() => {
  checkAuth();
  loadExtensionSettings();
});

console.log('[Leedz Extension] Side panel initialized - Command receiver mode');
