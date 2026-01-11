/**
 * Publishing API Client
 */

import { apiRequest } from './api';
import { SocialPlatform } from './clients-api';

// Types
export type PublishingJobStatus = 'QUEUED' | 'CLAIMED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'NEEDS_LOGIN' | 'CANCELLED';
export type RunStatus = 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'NEEDS_LOGIN';

export interface PublishingRun {
  id: string;
  status: RunStatus;
  startedAt: string;
  finishedAt?: string;
  publishedUrl?: string;
  proofScreenshotAssetId?: string;
  proofScreenshot?: {
    id: string;
    url: string;
  };
  device?: {
    id: string;
    name: string;
  };
}

export interface PublishingJob {
  id: string;
  postId: string;
  clientId: string;
  platform: SocialPlatform;
  scheduledAt: string;
  status: PublishingJobStatus;
  priority: number;
  attemptCount: number;
  maxAttempts: number;
  lastErrorCode?: string;
  lastErrorMessage?: string;
  post?: {
    id: string;
    title?: string;
  };
  client?: {
    id: string;
    name: string;
    logoUrl?: string;
  };
  lockedByDevice?: {
    id: string;
    name: string;
  };
  lastRun?: PublishingRun;
  runs?: PublishingRun[];
  createdAt: string;
  updatedAt: string;
}

// API Response wrapper
interface ApiResponse<T> {
  data: T;
}

// ==================== PUBLISHING API ====================

export async function getPublishingJobs(options?: {
  status?: PublishingJobStatus;
  clientId?: string;
  from?: string;
  to?: string;
}): Promise<PublishingJob[]> {
  const params = new URLSearchParams();
  if (options?.status) params.append('status', options.status);
  if (options?.clientId) params.append('clientId', options.clientId);
  if (options?.from) params.append('from', options.from);
  if (options?.to) params.append('to', options.to);
  
  const queryString = params.toString();
  const path = queryString ? `/publishing/jobs?${queryString}` : '/publishing/jobs';
  
  const response = await apiRequest<ApiResponse<PublishingJob[]>>(path);
  return response.data;
}

export async function getPublishingJob(id: string): Promise<PublishingJob> {
  const response = await apiRequest<ApiResponse<PublishingJob>>(`/publishing/jobs/${id}`);
  return response.data;
}

export async function cancelJob(id: string): Promise<void> {
  await apiRequest<ApiResponse<{ success: boolean }>>(`/publishing/jobs/${id}/cancel`, {
    method: 'POST',
  });
}

// ==================== STATUS HELPERS ====================

export const JOB_STATUS_CONFIG: Record<PublishingJobStatus, { label: string; color: string }> = {
  QUEUED: { label: 'في الانتظار', color: 'bg-gray-100 text-gray-600' },
  CLAIMED: { label: 'تم الحجز', color: 'bg-blue-50 text-blue-600' },
  RUNNING: { label: 'جاري النشر', color: 'bg-purple-50 text-purple-600' },
  SUCCEEDED: { label: 'تم النشر', color: 'bg-green-100 text-green-700' },
  FAILED: { label: 'فشل', color: 'bg-red-50 text-red-600' },
  NEEDS_LOGIN: { label: 'يحتاج تسجيل دخول', color: 'bg-yellow-50 text-yellow-600' },
  CANCELLED: { label: 'ملغي', color: 'bg-gray-50 text-gray-500' },
};
