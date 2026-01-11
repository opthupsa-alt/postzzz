/**
 * Posts & Variants API Client
 */

import { apiRequest } from './api';
import { SocialPlatform } from './clients-api';

// Types
export type PostStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'SCHEDULED' | 'PUBLISHING' | 'PUBLISHED' | 'FAILED' | 'ARCHIVED';

export interface PostVariant {
  id: string;
  platform: SocialPlatform;
  caption?: string;
  hashtags?: string;
  linkUrl?: string;
  mediaAssetIds?: string[];
  extra?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface Post {
  id: string;
  title?: string;
  scheduledAt?: string;
  timezone: string;
  status: PostStatus;
  client: {
    id: string;
    name: string;
    logoUrl?: string;
  };
  variants?: PostVariant[];
  platforms?: SocialPlatform[];
  variantsCount?: number;
  createdBy?: {
    id: string;
    name: string;
    email?: string;
  };
  approvedBy?: {
    id: string;
    name: string;
    email?: string;
  };
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVariantDto {
  platform: SocialPlatform;
  caption?: string;
  hashtags?: string;
  linkUrl?: string;
  mediaAssetIds?: string[];
  extra?: Record<string, any>;
}

export interface CreatePostDto {
  clientId: string;
  title?: string;
  scheduledAt?: string;
  timezone?: string;
  variants?: CreateVariantDto[];
}

export interface UpdatePostDto {
  title?: string;
  scheduledAt?: string;
  timezone?: string;
  status?: PostStatus;
}

export interface UpdateVariantDto {
  caption?: string;
  hashtags?: string;
  linkUrl?: string;
  mediaAssetIds?: string[];
  extra?: Record<string, any>;
}

export interface PlatformRule {
  platform: SocialPlatform;
  maxCaptionLength?: number;
  maxHashtags?: number;
  allowLink: boolean;
  allowedMediaTypes?: string[];
  maxMediaCount?: number;
  notes?: string;
  isDefault?: boolean;
}

// API Response wrapper
interface ApiResponse<T> {
  data: T;
}

// ==================== POSTS API ====================

export async function getPosts(options?: { 
  clientId?: string; 
  from?: string; 
  to?: string; 
  status?: PostStatus;
}): Promise<Post[]> {
  const params = new URLSearchParams();
  if (options?.clientId) params.append('clientId', options.clientId);
  if (options?.from) params.append('from', options.from);
  if (options?.to) params.append('to', options.to);
  if (options?.status) params.append('status', options.status);
  
  const queryString = params.toString();
  const path = queryString ? `/posts?${queryString}` : '/posts';
  
  const response = await apiRequest<ApiResponse<Post[]>>(path);
  return response.data;
}

export async function getPost(id: string): Promise<Post> {
  const response = await apiRequest<ApiResponse<Post>>(`/posts/${id}`);
  return response.data;
}

export async function createPost(dto: CreatePostDto): Promise<Post> {
  const response = await apiRequest<ApiResponse<Post>>('/posts', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
  return response.data;
}

export async function updatePost(id: string, dto: UpdatePostDto): Promise<Post> {
  const response = await apiRequest<ApiResponse<Post>>(`/posts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(dto),
  });
  return response.data;
}

export async function deletePost(id: string): Promise<void> {
  await apiRequest<ApiResponse<{ success: boolean }>>(`/posts/${id}`, {
    method: 'DELETE',
  });
}

// ==================== VARIANTS API ====================

export async function getPostVariants(postId: string): Promise<PostVariant[]> {
  const response = await apiRequest<ApiResponse<PostVariant[]>>(`/posts/${postId}/variants`);
  return response.data;
}

export async function upsertVariants(postId: string, variants: CreateVariantDto[]): Promise<PostVariant[]> {
  const response = await apiRequest<ApiResponse<PostVariant[]>>(`/posts/${postId}/variants`, {
    method: 'PUT',
    body: JSON.stringify(variants),
  });
  return response.data;
}

export async function updateVariant(variantId: string, dto: UpdateVariantDto): Promise<PostVariant> {
  const response = await apiRequest<ApiResponse<PostVariant>>(`/posts/variants/${variantId}`, {
    method: 'PATCH',
    body: JSON.stringify(dto),
  });
  return response.data;
}

export async function deleteVariant(variantId: string): Promise<void> {
  await apiRequest<ApiResponse<{ success: boolean }>>(`/posts/variants/${variantId}`, {
    method: 'DELETE',
  });
}

// ==================== WORKFLOW API ====================

export async function submitForApproval(postId: string): Promise<Post> {
  const response = await apiRequest<ApiResponse<Post>>(`/posts/${postId}/submit-approval`, {
    method: 'POST',
  });
  return response.data;
}

export async function approvePost(postId: string): Promise<Post> {
  const response = await apiRequest<ApiResponse<Post>>(`/posts/${postId}/approve`, {
    method: 'POST',
  });
  return response.data;
}

export async function schedulePost(postId: string, scheduledAt?: string): Promise<Post> {
  const response = await apiRequest<ApiResponse<Post>>(`/posts/${postId}/schedule`, {
    method: 'POST',
    body: JSON.stringify({ scheduledAt }),
  });
  return response.data;
}

// ==================== PLATFORM RULES API ====================

export async function getPlatformRules(): Promise<PlatformRule[]> {
  const response = await apiRequest<ApiResponse<PlatformRule[]>>('/platform-rules');
  return response.data;
}

// ==================== STATUS HELPERS ====================

export const POST_STATUS_CONFIG: Record<PostStatus, { label: string; color: string }> = {
  DRAFT: { label: 'مسودة', color: 'bg-gray-100 text-gray-600' },
  PENDING_APPROVAL: { label: 'بانتظار الموافقة', color: 'bg-yellow-50 text-yellow-600' },
  APPROVED: { label: 'تمت الموافقة', color: 'bg-green-50 text-green-600' },
  SCHEDULED: { label: 'مجدول', color: 'bg-blue-50 text-blue-600' },
  PUBLISHING: { label: 'جاري النشر', color: 'bg-purple-50 text-purple-600' },
  PUBLISHED: { label: 'تم النشر', color: 'bg-green-100 text-green-700' },
  FAILED: { label: 'فشل', color: 'bg-red-50 text-red-600' },
  ARCHIVED: { label: 'مؤرشف', color: 'bg-gray-50 text-gray-500' },
};

export const ALL_POST_STATUSES: PostStatus[] = [
  'DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'FAILED', 'ARCHIVED'
];
