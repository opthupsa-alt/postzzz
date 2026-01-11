/**
 * Clients & Platforms API Client
 */

import { apiRequest } from './api';

// Types
export type ClientStatus = 'ACTIVE' | 'ARCHIVED';
export type SocialPlatform = 'X' | 'INSTAGRAM' | 'TIKTOK' | 'SNAPCHAT' | 'LINKEDIN' | 'THREADS' | 'YOUTUBE' | 'FACEBOOK';

export interface Client {
  id: string;
  name: string;
  category?: string;
  industry?: string;
  description?: string;
  logoUrl?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  notes?: string;
  status: ClientStatus;
  platformsCount?: number;
  createdAt: string;
  updatedAt: string;
  platforms?: ClientPlatform[];
  createdBy?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface ClientPlatform {
  id: string;
  platform: SocialPlatform;
  handle?: string;
  profileUrl?: string;
  notes?: string;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClientDto {
  name: string;
  category?: string;
  industry?: string;
  description?: string;
  logoUrl?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  notes?: string;
}

export interface UpdateClientDto extends Partial<CreateClientDto> {
  status?: ClientStatus;
}

export interface CreatePlatformDto {
  platform: SocialPlatform;
  handle?: string;
  profileUrl?: string;
  notes?: string;
  isEnabled?: boolean;
}

export interface UpdatePlatformDto {
  handle?: string;
  profileUrl?: string;
  notes?: string;
  isEnabled?: boolean;
}

// API Response wrapper
interface ApiResponse<T> {
  data: T;
}

// ==================== CLIENTS API ====================

export async function getClients(options?: { search?: string; status?: ClientStatus }): Promise<Client[]> {
  const params = new URLSearchParams();
  if (options?.search) params.append('search', options.search);
  if (options?.status) params.append('status', options.status);
  
  const queryString = params.toString();
  const path = queryString ? `/clients?${queryString}` : '/clients';
  
  const response = await apiRequest<ApiResponse<Client[]>>(path);
  return response.data;
}

export async function getClient(id: string): Promise<Client> {
  const response = await apiRequest<ApiResponse<Client>>(`/clients/${id}`);
  return response.data;
}

export async function createClient(dto: CreateClientDto): Promise<Client> {
  const response = await apiRequest<ApiResponse<Client>>('/clients', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
  return response.data;
}

export async function updateClient(id: string, dto: UpdateClientDto): Promise<Client> {
  const response = await apiRequest<ApiResponse<Client>>(`/clients/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(dto),
  });
  return response.data;
}

export async function deleteClient(id: string): Promise<void> {
  await apiRequest<ApiResponse<{ success: boolean }>>(`/clients/${id}`, {
    method: 'DELETE',
  });
}

// ==================== PLATFORMS API ====================

export async function getClientPlatforms(clientId: string): Promise<ClientPlatform[]> {
  const response = await apiRequest<ApiResponse<ClientPlatform[]>>(`/clients/${clientId}/platforms`);
  return response.data;
}

export async function createPlatform(clientId: string, dto: CreatePlatformDto): Promise<ClientPlatform> {
  const response = await apiRequest<ApiResponse<ClientPlatform>>(`/clients/${clientId}/platforms`, {
    method: 'POST',
    body: JSON.stringify(dto),
  });
  return response.data;
}

export async function updatePlatform(platformId: string, dto: UpdatePlatformDto): Promise<ClientPlatform> {
  const response = await apiRequest<ApiResponse<ClientPlatform>>(`/clients/platforms/${platformId}`, {
    method: 'PATCH',
    body: JSON.stringify(dto),
  });
  return response.data;
}

export async function deletePlatform(platformId: string): Promise<void> {
  await apiRequest<ApiResponse<{ success: boolean }>>(`/clients/platforms/${platformId}`, {
    method: 'DELETE',
  });
}

// ==================== PLATFORM HELPERS ====================

export const PLATFORM_CONFIG: Record<SocialPlatform, { name: string; color: string; icon: string }> = {
  X: { name: 'X (تويتر)', color: 'from-gray-800 to-black', icon: 'Twitter' },
  INSTAGRAM: { name: 'انستقرام', color: 'from-pink-500 to-purple-500', icon: 'Instagram' },
  TIKTOK: { name: 'تيك توك', color: 'from-gray-900 to-gray-700', icon: 'Music2' },
  SNAPCHAT: { name: 'سناب شات', color: 'from-yellow-400 to-yellow-500', icon: 'Ghost' },
  LINKEDIN: { name: 'لينكدإن', color: 'from-blue-700 to-blue-800', icon: 'Linkedin' },
  THREADS: { name: 'ثريدز', color: 'from-gray-900 to-black', icon: 'AtSign' },
  YOUTUBE: { name: 'يوتيوب', color: 'from-red-600 to-red-700', icon: 'Youtube' },
  FACEBOOK: { name: 'فيسبوك', color: 'from-blue-600 to-blue-700', icon: 'Facebook' },
};

export const ALL_PLATFORMS: SocialPlatform[] = ['X', 'INSTAGRAM', 'TIKTOK', 'SNAPCHAT', 'LINKEDIN', 'THREADS', 'YOUTUBE', 'FACEBOOK'];
