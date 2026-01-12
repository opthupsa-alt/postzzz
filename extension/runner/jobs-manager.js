/**
 * Postzzz Extension - Jobs Manager
 * Handles claiming, starting, and completing publishing jobs
 */

// ==================== Jobs State ====================
const jobsState = {
  claimedJobs: [],
  activeJob: null,
  isPolling: false,
  pollInterval: null,
};

// ==================== Job Claiming ====================

async function claimJobs(apiUrl, token, deviceId, limit = 5) {
  if (!deviceId) {
    console.log('[Postzzz Jobs] No device ID, cannot claim jobs');
    return [];
  }
  
  try {
    const response = await fetch(`${apiUrl}/api/publishing/jobs/claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        deviceId,
        limit,
      }),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `HTTP ${response.status}`);
    }
    
    const result = await response.json();
    const jobs = result.data || [];
    
    if (jobs.length > 0) {
      console.log('[Postzzz Jobs] Claimed jobs:', jobs.length);
      jobsState.claimedJobs = [...jobsState.claimedJobs, ...jobs];
      
      // Save to storage
      await chrome.storage.local.set({
        postzzz_claimed_jobs: jobsState.claimedJobs,
      });
    }
    
    return jobs;
  } catch (error) {
    console.error('[Postzzz Jobs] Claim failed:', error);
    return [];
  }
}

// ==================== Job Lifecycle ====================

async function startJob(apiUrl, token, jobId, deviceId) {
  try {
    const response = await fetch(`${apiUrl}/api/publishing/jobs/${jobId}/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        deviceId,
      }),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `HTTP ${response.status}`);
    }
    
    const result = await response.json();
    console.log('[Postzzz Jobs] Job started:', jobId);
    
    // Update active job
    jobsState.activeJob = jobsState.claimedJobs.find(j => j.id === jobId) || null;
    
    return result.data;
  } catch (error) {
    console.error('[Postzzz Jobs] Start failed:', error);
    throw error;
  }
}

async function completeJob(apiUrl, token, jobId, completionData) {
  try {
    const response = await fetch(`${apiUrl}/api/publishing/jobs/${jobId}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(completionData),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `HTTP ${response.status}`);
    }
    
    const result = await response.json();
    console.log('[Postzzz Jobs] Job completed:', jobId, completionData.status);
    
    // Remove from claimed jobs
    jobsState.claimedJobs = jobsState.claimedJobs.filter(j => j.id !== jobId);
    jobsState.activeJob = null;
    
    // Update storage
    await chrome.storage.local.set({
      postzzz_claimed_jobs: jobsState.claimedJobs,
    });
    
    return result.data;
  } catch (error) {
    console.error('[Postzzz Jobs] Complete failed:', error);
    throw error;
  }
}

async function cancelJob(apiUrl, token, jobId) {
  try {
    const response = await fetch(`${apiUrl}/api/publishing/jobs/${jobId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `HTTP ${response.status}`);
    }
    
    console.log('[Postzzz Jobs] Job cancelled:', jobId);
    
    // Remove from claimed jobs
    jobsState.claimedJobs = jobsState.claimedJobs.filter(j => j.id !== jobId);
    if (jobsState.activeJob?.id === jobId) {
      jobsState.activeJob = null;
    }
    
    // Update storage
    await chrome.storage.local.set({
      postzzz_claimed_jobs: jobsState.claimedJobs,
    });
    
    return { success: true };
  } catch (error) {
    console.error('[Postzzz Jobs] Cancel failed:', error);
    throw error;
  }
}

// ==================== Job Polling ====================

function startJobPolling(apiUrl, token, deviceId, intervalMs = 15000) {
  if (jobsState.isPolling) return;
  
  jobsState.isPolling = true;
  
  // Poll immediately
  claimJobs(apiUrl, token, deviceId, 3);
  
  // Then poll periodically
  jobsState.pollInterval = setInterval(() => {
    // Only poll if no active job
    if (!jobsState.activeJob) {
      claimJobs(apiUrl, token, deviceId, 3);
    }
  }, intervalMs);
  
  console.log('[Postzzz Jobs] Polling started');
}

function stopJobPolling() {
  if (jobsState.pollInterval) {
    clearInterval(jobsState.pollInterval);
    jobsState.pollInterval = null;
  }
  jobsState.isPolling = false;
  console.log('[Postzzz Jobs] Polling stopped');
}

// ==================== Load from Storage ====================

async function loadClaimedJobs() {
  const data = await chrome.storage.local.get('postzzz_claimed_jobs');
  jobsState.claimedJobs = data.postzzz_claimed_jobs || [];
  return jobsState.claimedJobs;
}

// ==================== Export ====================

if (typeof globalThis !== 'undefined') {
  globalThis.PostzzzJobs = {
    state: jobsState,
    claimJobs,
    startJob,
    completeJob,
    cancelJob,
    startJobPolling,
    stopJobPolling,
    loadClaimedJobs,
  };
}
