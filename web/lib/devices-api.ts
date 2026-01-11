/**
 * Devices API Client
 */

import { apiRequest } from './api';

// Types
export type DeviceStatus = 'ONLINE' | 'OFFLINE';

export interface DeviceAgent {
  id: string;
  name: string;
  clientId?: string;
  client?: {
    id: string;
    name: string;
    logoUrl?: string;
  };
  status: DeviceStatus;
  lastSeenAt?: string;
  capabilities?: {
    assistMode?: boolean;
    autoMode?: boolean;
    platforms?: string[];
  };
  userAgent?: string;
  version?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterDeviceDto {
  name: string;
  clientId?: string;
  capabilities?: Record<string, any>;
  userAgent?: string;
  version?: string;
}

export interface UpdateDeviceDto {
  name?: string;
  clientId?: string;
  capabilities?: Record<string, any>;
}

export interface HeartbeatDto {
  clientId?: string;
  capabilities?: Record<string, any>;
  userAgent?: string;
  version?: string;
}

// API Response wrapper
interface ApiResponse<T> {
  data: T;
}

// ==================== DEVICES API ====================

export async function getDevices(): Promise<DeviceAgent[]> {
  const response = await apiRequest<ApiResponse<DeviceAgent[]>>('/devices');
  return response.data;
}

export async function getDevice(id: string): Promise<DeviceAgent> {
  const response = await apiRequest<ApiResponse<DeviceAgent>>(`/devices/${id}`);
  return response.data;
}

export async function registerDevice(dto: RegisterDeviceDto): Promise<DeviceAgent> {
  const response = await apiRequest<ApiResponse<DeviceAgent>>('/devices/register', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
  return response.data;
}

export async function heartbeat(deviceId: string, dto: HeartbeatDto): Promise<DeviceAgent> {
  const response = await apiRequest<ApiResponse<DeviceAgent>>(`/devices/${deviceId}/heartbeat`, {
    method: 'POST',
    body: JSON.stringify(dto),
  });
  return response.data;
}

export async function updateDevice(id: string, dto: UpdateDeviceDto): Promise<DeviceAgent> {
  const response = await apiRequest<ApiResponse<DeviceAgent>>(`/devices/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(dto),
  });
  return response.data;
}

export async function deleteDevice(id: string): Promise<void> {
  await apiRequest<ApiResponse<{ success: boolean }>>(`/devices/${id}`, {
    method: 'DELETE',
  });
}
