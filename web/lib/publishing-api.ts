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

// ==================== DASHBOARD STATS ====================

export interface PublishingStats {
  totalPosts: number;
  postsThisWeek: number;
  completedJobs: number;
  pendingJobs: number;
  activeClients: number;
  connectedDevices: number;
  recentJobs: PublishingJob[];
}

export async function getPublishingStats(): Promise<PublishingStats> {
  try {
    // Get jobs for stats
    const allJobs = await getPublishingJobs();
    const completedJobs = allJobs.filter(j => j.status === 'SUCCEEDED').length;
    const pendingJobs = allJobs.filter(j => ['QUEUED', 'CLAIMED'].includes(j.status)).length;
    
    // Get recent jobs
    const recentJobs = allJobs.slice(0, 5);
    
    // Get unique clients
    const uniqueClients = new Set(allJobs.map(j => j.clientId)).size;
    
    return {
      totalPosts: allJobs.length,
      postsThisWeek: allJobs.filter(j => {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return new Date(j.createdAt) > weekAgo;
      }).length,
      completedJobs,
      pendingJobs,
      activeClients: uniqueClients,
      connectedDevices: 0, // Will be fetched from devices API
      recentJobs,
    };
  } catch (error) {
    return {
      totalPosts: 0,
      postsThisWeek: 0,
      completedJobs: 0,
      pendingJobs: 0,
      activeClients: 0,
      connectedDevices: 0,
      recentJobs: [],
    };
  }
}
