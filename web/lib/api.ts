/**
 * Leedz API Client
 * Handles all API communication with token management
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// Token storage keys
const TOKEN_KEY = 'leedz_token';
const USER_KEY = 'leedz_user';

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  defaultTenantId?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  role: string;
  tenantId: string;
}

export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}

// Token Management
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredUser(): User | null {
  const userStr = localStorage.getItem(USER_KEY);
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

export function setStoredUser(user: User): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

// API Request Helper
export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  // Handle 401 - clear token and redirect
  if (response.status === 401) {
    removeToken();
    // Don't redirect here, let the caller handle it
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error: ApiError = {
      message: data?.message || `HTTP Error ${response.status}`,
      statusCode: response.status,
      error: data?.error,
    };
    throw error;
  }

  return data as T;
}

// Auth API
export async function login(email: string, password: string): Promise<AuthResponse> {
  const data = await apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  
  setToken(data.token);
  setStoredUser(data.user);
  
  return data;
}

export async function signup(name: string, email: string, password: string): Promise<AuthResponse> {
  const data = await apiRequest<AuthResponse>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
  
  setToken(data.token);
  setStoredUser(data.user);
  
  return data;
}

export async function getMe(): Promise<{ user: User; role: string; tenantId: string }> {
  return apiRequest('/auth/me');
}

export function logout(): void {
  removeToken();
  window.location.href = '/#/login';
}

// Jobs API
export interface Job {
  id: string;
  type: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  progress: number;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: Record<string, unknown>;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export async function getJobs(): Promise<Job[]> {
  return apiRequest('/jobs');
}

export async function getJob(id: string): Promise<Job> {
  return apiRequest(`/jobs/${id}`);
}

export async function createJob(type: string, input?: Record<string, unknown>): Promise<Job> {
  return apiRequest('/jobs', {
    method: 'POST',
    body: JSON.stringify({ type, input }),
  });
}

export async function cancelJob(id: string): Promise<Job> {
  return apiRequest(`/jobs/${id}/cancel`, {
    method: 'POST',
  });
}

// Health API
export async function healthCheck(): Promise<{ ok: boolean; version: string }> {
  return apiRequest('/health');
}

// Leads API
export interface Lead {
  id: string;
  companyName: string;
  industry?: string;
  city?: string;
  phone?: string;
  email?: string;
  website?: string;
  status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST';
  source?: string;
  notes?: string;
  jobId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLeadDto {
  companyName: string;
  industry?: string;
  city?: string;
  phone?: string;
  email?: string;
  website?: string;
  status?: Lead['status'];
  source?: string;
  notes?: string;
  jobId?: string;
}

export async function getLeads(options?: { status?: string; limit?: number; offset?: number }): Promise<Lead[]> {
  const params = new URLSearchParams();
  if (options?.status) params.append('status', options.status);
  if (options?.limit) params.append('limit', options.limit.toString());
  if (options?.offset) params.append('offset', options.offset.toString());
  const query = params.toString();
  return apiRequest(`/leads${query ? `?${query}` : ''}`);
}

export async function getLead(id: string): Promise<Lead> {
  return apiRequest(`/leads/${id}`);
}

export async function createLead(data: CreateLeadDto): Promise<Lead> {
  return apiRequest('/leads', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function bulkCreateLeads(leads: CreateLeadDto[]): Promise<{ count: number }> {
  return apiRequest('/leads/bulk', {
    method: 'POST',
    body: JSON.stringify(leads),
  });
}

export async function updateLead(id: string, data: Partial<CreateLeadDto>): Promise<Lead> {
  return apiRequest(`/leads/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteLead(id: string): Promise<Lead> {
  return apiRequest(`/leads/${id}`, {
    method: 'DELETE',
  });
}

export async function getLeadsCount(status?: string): Promise<{ count: number }> {
  const query = status ? `?status=${status}` : '';
  return apiRequest(`/leads/count${query}`);
}

// Lists API
export interface List {
  id: string;
  name: string;
  description?: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
  _count?: { leads: number };
}

export interface CreateListDto {
  name: string;
  description?: string;
  color?: string;
}

export async function getLists(): Promise<List[]> {
  return apiRequest('/lists');
}

export async function getList(id: string): Promise<List> {
  return apiRequest(`/lists/${id}`);
}

export async function createList(data: CreateListDto): Promise<List> {
  return apiRequest('/lists', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateList(id: string, data: Partial<CreateListDto>): Promise<List> {
  return apiRequest(`/lists/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteList(id: string): Promise<List> {
  return apiRequest(`/lists/${id}`, {
    method: 'DELETE',
  });
}

export async function getLeadsInList(listId: string): Promise<Lead[]> {
  return apiRequest(`/lists/${listId}/leads`);
}

export async function addLeadsToList(listId: string, leadIds: string[]): Promise<{ count: number }> {
  return apiRequest(`/lists/${listId}/leads`, {
    method: 'POST',
    body: JSON.stringify({ leadIds }),
  });
}

export async function removeLeadFromList(listId: string, leadId: string): Promise<void> {
  return apiRequest(`/lists/${listId}/leads/${leadId}`, {
    method: 'DELETE',
  });
}
