/**
 * Postzzz Extension - Runner UI Controller
 * Handles UI interactions for the publishing runner
 */

// ==================== DOM Elements ====================
let runnerElements = null;

function initRunnerElements() {
  runnerElements = {
    // Debug section
    debugSection: document.getElementById('debugSection'),
    toggleDebugBtn: document.getElementById('toggleDebugBtn'),
    debugContent: document.getElementById('debugContent'),
    schedulerStatus: document.getElementById('schedulerStatus'),
    checkJobsBtn: document.getElementById('checkJobsBtn'),
    startSchedulerBtn: document.getElementById('startSchedulerBtn'),
    stopSchedulerBtn: document.getElementById('stopSchedulerBtn'),
    debugLog: document.getElementById('debugLog'),
    
    // Mode section
    modeSection: document.getElementById('runnerModeSection'),
    modeAssistBtn: document.getElementById('modeAssistBtn'),
    modeAutoBtn: document.getElementById('modeAutoBtn'),
    
    // Device status
    deviceStatusDot: document.getElementById('deviceStatusDot'),
    deviceStatusText: document.getElementById('deviceStatusText'),
    
    // Client binding
    clientSelect: document.getElementById('clientSelect'),
    
    // Platform login status
    platformLoginStatus: document.getElementById('platformLoginStatus'),
    checkLoginsBtn: document.getElementById('checkLoginsBtn'),
    
    // Jobs inbox
    jobsInboxSection: document.getElementById('jobsInboxSection'),
    jobsCount: document.getElementById('jobsCount'),
    jobsList: document.getElementById('jobsList'),
    
    // Active job
    activeJobSection: document.getElementById('activePublishJobSection'),
    activeJobPlatform: document.getElementById('activeJobPlatform'),
    activeJobTitle: document.getElementById('activeJobTitle'),
    activeJobClient: document.getElementById('activeJobClient'),
    activeJobContent: document.getElementById('activeJobContent'),
    activeJobSteps: document.getElementById('activeJobSteps'),
    confirmPublishBtn: document.getElementById('confirmPublishBtn'),
    cancelJobBtn: document.getElementById('cancelJobBtn'),
  };
}

// ==================== State ====================
let runnerUIState = {
  isInitialized: false,
  clients: [],
  claimedJobs: [],
  activeJob: null,
  platformStatus: {},
};

// ==================== Initialization ====================

async function initRunnerUI() {
  if (runnerUIState.isInitialized) return;
  
  initRunnerElements();
  
  if (!runnerElements.modeSection) {
    console.log('[Runner UI] Runner elements not found in DOM');
    return;
  }
  
  // Show runner section
  runnerElements.modeSection.style.display = 'block';
  runnerElements.jobsInboxSection.style.display = 'block';
  
  // Load initial data
  await loadClients();
  await loadClaimedJobs();
  
  // Setup event listeners
  setupRunnerEventListeners();
  
  // Check device registration
  await checkDeviceRegistration();
  
  runnerUIState.isInitialized = true;
  console.log('[Runner UI] Initialized');
}

// ==================== Event Listeners ====================

function setupRunnerEventListeners() {
  // Debug section toggle
  if (runnerElements.toggleDebugBtn) {
    runnerElements.toggleDebugBtn.addEventListener('click', () => {
      const content = runnerElements.debugContent;
      if (content.style.display === 'none') {
        content.style.display = 'block';
        runnerElements.toggleDebugBtn.textContent = 'إخفاء';
      } else {
        content.style.display = 'none';
        runnerElements.toggleDebugBtn.textContent = 'إظهار';
      }
    });
  }
  
  // Check jobs button
  if (runnerElements.checkJobsBtn) {
    runnerElements.checkJobsBtn.addEventListener('click', async () => {
      addDebugLog('فحص المهام يدوياً...');
      const result = await sendRunnerMessage({ type: 'CHECK_SCHEDULED_JOBS' });
      addDebugLog('نتيجة الفحص: ' + JSON.stringify(result));
      await updateSchedulerStatus();
    });
  }
  
  // Start scheduler button
  if (runnerElements.startSchedulerBtn) {
    runnerElements.startSchedulerBtn.addEventListener('click', async () => {
      addDebugLog('تشغيل المجدول...');
      const result = await sendRunnerMessage({ type: 'START_SCHEDULER' });
      addDebugLog('نتيجة التشغيل: ' + JSON.stringify(result));
      await updateSchedulerStatus();
    });
  }
  
  // Stop scheduler button
  if (runnerElements.stopSchedulerBtn) {
    runnerElements.stopSchedulerBtn.addEventListener('click', async () => {
      addDebugLog('إيقاف المجدول...');
      const result = await sendRunnerMessage({ type: 'STOP_SCHEDULER' });
      addDebugLog('نتيجة الإيقاف: ' + JSON.stringify(result));
      await updateSchedulerStatus();
    });
  }
  
  // Client selection
  if (runnerElements.clientSelect) {
    runnerElements.clientSelect.addEventListener('change', async (e) => {
      const clientId = e.target.value;
      await sendRunnerMessage({ type: 'SET_SELECTED_CLIENT', clientId });
      console.log('[Runner UI] Client selected:', clientId);
    });
  }
  
  // Check logins button
  if (runnerElements.checkLoginsBtn) {
    runnerElements.checkLoginsBtn.addEventListener('click', async () => {
      await checkPlatformLogins();
    });
  }
  
  // Confirm publish button
  if (runnerElements.confirmPublishBtn) {
    runnerElements.confirmPublishBtn.addEventListener('click', async () => {
      await confirmPublish();
    });
  }
  
  // Cancel job button
  if (runnerElements.cancelJobBtn) {
    runnerElements.cancelJobBtn.addEventListener('click', async () => {
      await cancelActiveJob();
    });
  }
  
  // Update scheduler status periodically
  updateSchedulerStatus();
  setInterval(updateSchedulerStatus, 5000);
}

// ==================== Debug Functions ====================

async function updateSchedulerStatus() {
  try {
    const status = await sendRunnerMessage({ type: 'GET_SCHEDULER_STATUS' });
    if (runnerElements.schedulerStatus) {
      const running = status?.running ? '✅ يعمل' : '❌ متوقف';
      const heartbeat = status?.heartbeatRunning ? '✅' : '❌';
      runnerElements.schedulerStatus.innerHTML = `المجدول: ${running} | Heartbeat: ${heartbeat}`;
    }
  } catch (e) {
    if (runnerElements.schedulerStatus) {
      runnerElements.schedulerStatus.textContent = 'خطأ في جلب الحالة';
    }
  }
}

function addDebugLog(message) {
  if (runnerElements.debugLog) {
    const time = new Date().toLocaleTimeString('ar-SA');
    runnerElements.debugLog.textContent = `[${time}] ${message}\n` + runnerElements.debugLog.textContent;
    // Keep only last 50 lines
    const lines = runnerElements.debugLog.textContent.split('\n');
    if (lines.length > 50) {
      runnerElements.debugLog.textContent = lines.slice(0, 50).join('\n');
    }
  }
}

// ==================== Data Loading ====================

async function loadClients() {
  try {
    const response = await sendRunnerMessage({ type: 'GET_CLIENTS' });
    // Handle both direct array and wrapped response
    const clients = response?.clients || response?.data || response || [];
    runnerUIState.clients = Array.isArray(clients) ? clients : [];
    
    // Update dropdown
    if (runnerElements.clientSelect) {
      runnerElements.clientSelect.innerHTML = '<option value="">-- اختر عميل --</option>';
      runnerUIState.clients.forEach(client => {
        const option = document.createElement('option');
        option.value = client.id;
        option.textContent = client.name;
        runnerElements.clientSelect.appendChild(option);
      });
      
      // Set selected client if any
      if (response.selectedClientId) {
        runnerElements.clientSelect.value = response.selectedClientId;
      }
    }
  } catch (error) {
    console.error('[Runner UI] Failed to load clients:', error);
  }
}

async function loadClaimedJobs() {
  try {
    const response = await sendRunnerMessage({ type: 'GET_CLAIMED_JOBS' });
    // Handle both direct array and wrapped response
    const jobs = response?.jobs || response?.data || response || [];
    runnerUIState.claimedJobs = Array.isArray(jobs) ? jobs : [];
    updateJobsList();
  } catch (error) {
    console.error('[Runner UI] Failed to load jobs:', error);
  }
}

// ==================== Device Registration ====================

async function checkDeviceRegistration() {
  try {
    const response = await sendRunnerMessage({ type: 'GET_DEVICE_STATUS' });
    
    if (response.deviceId) {
      updateDeviceStatus('online', 'الجهاز متصل');
      console.log('[Runner UI] Device already registered:', response.deviceId);
    } else {
      updateDeviceStatus('offline', 'جاري تسجيل الجهاز...');
      // Register device only if not already registered
      const registerResult = await sendRunnerMessage({ type: 'REGISTER_DEVICE' });
      if (registerResult.success) {
        updateDeviceStatus('online', 'الجهاز متصل');
        console.log('[Runner UI] Device registered:', registerResult.device?.id);
      } else {
        updateDeviceStatus('error', 'فشل تسجيل الجهاز');
        console.error('[Runner UI] Device registration failed:', registerResult.error);
      }
    }
  } catch (error) {
    console.error('[Runner UI] Device check error:', error);
    updateDeviceStatus('error', 'خطأ في الاتصال');
  }
}

function updateDeviceStatus(status, text) {
  if (!runnerElements.deviceStatusDot || !runnerElements.deviceStatusText) return;
  
  const colors = {
    online: '#22c55e',
    offline: '#94a3b8',
    error: '#ef4444',
  };
  
  runnerElements.deviceStatusDot.style.background = colors[status] || colors.offline;
  runnerElements.deviceStatusText.textContent = text;
}

// ==================== Platform Login Status ====================

async function checkPlatformLogins() {
  if (runnerElements.checkLoginsBtn) {
    runnerElements.checkLoginsBtn.textContent = '⏳ جاري الفحص...';
    runnerElements.checkLoginsBtn.disabled = true;
  }
  
  try {
    const response = await sendRunnerMessage({ type: 'CHECK_PLATFORM_LOGINS' });
    runnerUIState.platformStatus = response.status || {};
    updatePlatformStatusUI();
  } catch (error) {
    console.error('[Runner UI] Failed to check logins:', error);
  } finally {
    if (runnerElements.checkLoginsBtn) {
      runnerElements.checkLoginsBtn.textContent = '🔄 فحص الحالة';
      runnerElements.checkLoginsBtn.disabled = false;
    }
  }
}

function updatePlatformStatusUI() {
  if (!runnerElements.platformLoginStatus) return;
  
  const platforms = runnerElements.platformLoginStatus.querySelectorAll('.platform-status');
  platforms.forEach(el => {
    const platform = el.dataset.platform;
    const status = runnerUIState.platformStatus[platform] || 'UNKNOWN';
    const stateEl = el.querySelector('.platform-state');
    
    if (stateEl) {
      stateEl.className = 'platform-state';
      
      if (status === 'LOGGED_IN') {
        stateEl.classList.add('logged-in');
        stateEl.textContent = '✓ متصل';
      } else if (status === 'NEEDS_LOGIN') {
        stateEl.classList.add('needs-login');
        stateEl.textContent = '✗ غير متصل';
      } else if (status === 'NO_TAB') {
        stateEl.classList.add('no-tab');
        stateEl.textContent = '📂 افتح المنصة';
      } else if (status === 'ERROR') {
        stateEl.classList.add('error');
        stateEl.textContent = '⚠️ خطأ';
      } else {
        stateEl.classList.add('unknown');
        stateEl.textContent = '? غير معروف';
      }
    }
  });
}

// ==================== Jobs List ====================

function updateJobsList() {
  if (!runnerElements.jobsList) return;
  
  const jobs = runnerUIState.claimedJobs;
  
  if (runnerElements.jobsCount) {
    runnerElements.jobsCount.textContent = jobs.length;
  }
  
  if (jobs.length === 0) {
    runnerElements.jobsList.innerHTML = `
      <div class="empty-jobs" style="text-align: center; padding: 20px; color: #94a3b8;">
        <div style="font-size: 32px; margin-bottom: 8px;">📭</div>
        <div>لا توجد مهام في الانتظار</div>
      </div>
    `;
    return;
  }
  
  const platformIcons = {
    X: '𝕏',
    INSTAGRAM: '📷',
    TIKTOK: '🎵',
    LINKEDIN: '💼',
    THREADS: '🧵',
    YOUTUBE: '▶️',
    FACEBOOK: '📘',
  };
  
  const jobsArray = Array.isArray(jobs) ? jobs : [];
  runnerElements.jobsList.innerHTML = jobsArray.map(job => `
    <div class="job-card" data-job-id="${job.id}">
      <div class="job-card-header">
        <span class="job-card-platform">${platformIcons[job.platform] || '📱'}</span>
        <div>
          <div class="job-card-title">${job.post?.title || 'منشور'}</div>
          <div class="job-card-client">${job.client?.name || ''}</div>
        </div>
      </div>
      <div class="job-card-time">
        ${formatJobTime(job.scheduledAt)}
      </div>
    </div>
  `).join('');
  
  // Add click handlers
  runnerElements.jobsList.querySelectorAll('.job-card').forEach(card => {
    card.addEventListener('click', () => {
      const jobId = card.dataset.jobId;
      startJob(jobId);
    });
  });
}

function formatJobTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleString('ar-SA', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ==================== Active Job ====================

async function startJob(jobId) {
  const job = runnerUIState.claimedJobs.find(j => j.id === jobId);
  if (!job) return;
  
  runnerUIState.activeJob = job;
  showActiveJob(job);
  
  try {
    await sendRunnerMessage({ type: 'START_JOB', jobId });
  } catch (error) {
    console.error('[Runner UI] Failed to start job:', error);
  }
}

function showActiveJob(job) {
  if (!runnerElements.activeJobSection) return;
  
  runnerElements.activeJobSection.style.display = 'block';
  
  const platformIcons = {
    X: '𝕏',
    INSTAGRAM: '📷',
    TIKTOK: '🎵',
    LINKEDIN: '💼',
  };
  
  if (runnerElements.activeJobPlatform) {
    runnerElements.activeJobPlatform.textContent = platformIcons[job.platform] || '📱';
  }
  
  if (runnerElements.activeJobTitle) {
    runnerElements.activeJobTitle.textContent = job.post?.title || 'منشور';
  }
  
  if (runnerElements.activeJobClient) {
    runnerElements.activeJobClient.textContent = job.client?.name || '';
  }
  
  // Get variant content
  const variant = job.post?.variants?.find(v => v.platform === job.platform);
  if (runnerElements.activeJobContent && variant) {
    runnerElements.activeJobContent.textContent = variant.caption || '';
  }
  
  // Reset steps
  updateJobSteps([]);
}

function updateJobSteps(completedSteps) {
  if (!runnerElements.activeJobSteps) return;
  
  const steps = runnerElements.activeJobSteps.querySelectorAll('.step-item');
  steps.forEach(step => {
    const stepId = step.dataset.step;
    const icon = step.querySelector('.step-icon');
    
    step.className = 'step-item';
    
    if (completedSteps.includes(stepId)) {
      step.classList.add('done');
      if (icon) icon.textContent = '✅';
    } else if (completedSteps.length > 0 && stepId === getNextStep(completedSteps)) {
      step.classList.add('active');
      if (icon) icon.textContent = '⏳';
    }
  });
}

function getNextStep(completedSteps) {
  const allSteps = ['check_login', 'open_composer', 'fill_content', 'wait_confirm'];
  for (const step of allSteps) {
    if (!completedSteps.includes(step)) return step;
  }
  return null;
}

function showConfirmButton() {
  if (runnerElements.confirmPublishBtn) {
    runnerElements.confirmPublishBtn.style.display = 'block';
  }
}

async function confirmPublish() {
  if (!runnerUIState.activeJob) return;
  
  if (runnerElements.confirmPublishBtn) {
    runnerElements.confirmPublishBtn.textContent = '⏳ جاري النشر...';
    runnerElements.confirmPublishBtn.disabled = true;
  }
  
  try {
    await sendRunnerMessage({ 
      type: 'CONFIRM_PUBLISH', 
      jobId: runnerUIState.activeJob.id 
    });
  } catch (error) {
    console.error('[Runner UI] Publish failed:', error);
  }
}

async function cancelActiveJob() {
  if (!runnerUIState.activeJob) return;
  
  try {
    await sendRunnerMessage({ 
      type: 'CANCEL_JOB', 
      jobId: runnerUIState.activeJob.id 
    });
    hideActiveJob();
  } catch (error) {
    console.error('[Runner UI] Cancel failed:', error);
  }
}

function hideActiveJob() {
  runnerUIState.activeJob = null;
  if (runnerElements.activeJobSection) {
    runnerElements.activeJobSection.style.display = 'none';
  }
  if (runnerElements.confirmPublishBtn) {
    runnerElements.confirmPublishBtn.style.display = 'none';
    runnerElements.confirmPublishBtn.textContent = '✅ تأكيد النشر';
    runnerElements.confirmPublishBtn.disabled = false;
  }
}

// ==================== Message Handling ====================

function sendRunnerMessage(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ ...message, source: 'runner' }, resolve);
  });
}

// Handle messages from background
function handleRunnerMessage(message) {
  switch (message.type) {
    case 'JOBS_UPDATED':
      runnerUIState.claimedJobs = message.jobs || [];
      updateJobsList();
      break;
      
    case 'JOB_STEP_COMPLETED':
      updateJobSteps(message.completedSteps || []);
      break;
      
    case 'JOB_AWAITING_CONFIRM':
      showConfirmButton();
      break;
      
    case 'JOB_COMPLETED':
      hideActiveJob();
      loadClaimedJobs();
      break;
      
    case 'DEVICE_STATUS_CHANGED':
      updateDeviceStatus(message.status, message.text);
      break;
      
    case 'PLATFORM_STATUS_UPDATED':
      runnerUIState.platformStatus = message.status || {};
      updatePlatformStatusUI();
      break;
  }
}

// Listen for messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target === 'runner-ui') {
    handleRunnerMessage(message);
  }
});

// ==================== Export ====================
if (typeof window !== 'undefined') {
  window.PostzzzRunnerUI = {
    init: initRunnerUI,
    loadClients,
    loadClaimedJobs,
    checkPlatformLogins,
    updateJobsList,
    handleMessage: handleRunnerMessage,
  };
}
