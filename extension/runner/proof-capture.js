/**
 * Postzzz Extension - Proof Screenshot Capture
 * Captures and uploads proof screenshots for publishing jobs
 */

// ==================== Screenshot Capture ====================

/**
 * Capture screenshot of visible tab
 */
async function captureScreenshot(tabId) {
  try {
    // Get the tab's window
    const tab = await chrome.tabs.get(tabId);
    
    // Capture the visible area
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: 'png',
      quality: 90,
    });
    
    console.log('[Postzzz Proof] Screenshot captured');
    return dataUrl;
  } catch (error) {
    console.error('[Postzzz Proof] Screenshot capture failed:', error);
    throw error;
  }
}

/**
 * Convert data URL to Blob
 */
function dataUrlToBlob(dataUrl) {
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)[1];
  const binary = atob(parts[1]);
  const array = new Uint8Array(binary.length);
  
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  
  return new Blob([array], { type: mime });
}

// ==================== Upload ====================

/**
 * Upload screenshot as MediaAsset
 */
async function uploadProofScreenshot(apiUrl, token, dataUrl, jobId) {
  try {
    const blob = dataUrlToBlob(dataUrl);
    const formData = new FormData();
    formData.append('file', blob, `proof-${jobId}-${Date.now()}.png`);
    formData.append('type', 'IMAGE');
    
    const response = await fetch(`${apiUrl}/api/media/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `HTTP ${response.status}`);
    }
    
    const result = await response.json();
    console.log('[Postzzz Proof] Screenshot uploaded:', result.data?.id);
    return result.data;
  } catch (error) {
    console.error('[Postzzz Proof] Upload failed:', error);
    throw error;
  }
}

/**
 * Capture and upload proof in one step
 */
async function captureAndUploadProof(apiUrl, token, tabId, jobId) {
  try {
    const dataUrl = await captureScreenshot(tabId);
    const asset = await uploadProofScreenshot(apiUrl, token, dataUrl, jobId);
    return asset;
  } catch (error) {
    console.error('[Postzzz Proof] Capture and upload failed:', error);
    return null;
  }
}

// ==================== Export ====================

if (typeof globalThis !== 'undefined') {
  globalThis.PostzzzProof = {
    capture: captureScreenshot,
    upload: uploadProofScreenshot,
    captureAndUpload: captureAndUploadProof,
    dataUrlToBlob,
  };
}
