/**
 * Media Upload API Client
 */

import { getToken } from './api';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export interface MediaAsset {
  id: string;
  type: 'IMAGE' | 'VIDEO';
  url: string;
  mimeType?: string;
  size?: number;
  createdAt: string;
}

export interface UploadResponse {
  data: MediaAsset;
}

/**
 * Upload a media file (image or video)
 */
export async function uploadMedia(file: File): Promise<MediaAsset> {
  const token = getToken();
  
  if (!token) {
    throw new Error('Not authenticated');
  }

  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/media/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Upload failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  const result: UploadResponse = await response.json();
  return result.data;
}

/**
 * Get media asset by ID
 */
export async function getMediaAsset(id: string): Promise<MediaAsset> {
  const token = getToken();
  
  const response = await fetch(`${API_BASE}/media/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get media: HTTP ${response.status}`);
  }

  const result: UploadResponse = await response.json();
  return result.data;
}
