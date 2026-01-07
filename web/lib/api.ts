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

// Reports API
export type ReportType = 'LEAD_ANALYSIS' | 'COMPANY_PROFILE' | 'MARKET_RESEARCH' | 'COMPETITOR_ANALYSIS';
export type ReportStatus = 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED';

export interface Report {
  id: string;
  title: string;
  type: ReportType;
  status: ReportStatus;
  leadId?: string;
  content?: Record<string, unknown>;
  pdfUrl?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  lead?: {
    id: string;
    companyName: string;
  };
}

export interface CreateReportDto {
  title: string;
  type: ReportType;
  leadId?: string;
}

export async function getReports(options?: { status?: string; leadId?: string; limit?: number; offset?: number }): Promise<Report[]> {
  const params = new URLSearchParams();
  if (options?.status) params.append('status', options.status);
  if (options?.leadId) params.append('leadId', options.leadId);
  if (options?.limit) params.append('limit', options.limit.toString());
  if (options?.offset) params.append('offset', options.offset.toString());
  const query = params.toString();
  return apiRequest(`/reports${query ? `?${query}` : ''}`);
}

export async function getReport(id: string): Promise<Report> {
  return apiRequest(`/reports/${id}`);
}

export async function createReport(data: CreateReportDto): Promise<Report> {
  return apiRequest('/reports', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function generateReport(id: string): Promise<Report> {
  return apiRequest(`/reports/${id}/generate`, {
    method: 'POST',
  });
}

export async function updateReport(id: string, data: Partial<{ title: string; status: ReportStatus }>): Promise<Report> {
  return apiRequest(`/reports/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteReport(id: string): Promise<Report> {
  return apiRequest(`/reports/${id}`, {
    method: 'DELETE',
  });
}

export async function getReportsCount(status?: string): Promise<{ count: number }> {
  const query = status ? `?status=${status}` : '';
  return apiRequest(`/reports/count${query}`);
}

// ==================== Admin API ====================

export interface AdminDashboardStats {
  tenants: { total: number; active: number; suspended: number };
  users: { total: number; active: number };
  leads: number;
  jobs: number;
}

export interface AdminTenant {
  id: string;
  name: string;
  slug: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';
  planId?: string;
  createdAt: string;
  owner?: { id: string; name: string; email: string };
  stats: { users: number; leads: number; jobs: number };
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  isSuperAdmin: boolean;
  isActive: boolean;
  createdAt: string;
  tenants: { id: string; name: string; role: string }[];
}

export async function getAdminDashboard(): Promise<AdminDashboardStats> {
  return apiRequest('/admin/dashboard');
}

export async function getAdminTenants(options?: { status?: string; limit?: number; offset?: number }): Promise<{ tenants: AdminTenant[]; total: number }> {
  const params = new URLSearchParams();
  if (options?.status) params.append('status', options.status);
  if (options?.limit) params.append('limit', options.limit.toString());
  if (options?.offset) params.append('offset', options.offset.toString());
  const query = params.toString();
  return apiRequest(`/admin/tenants${query ? `?${query}` : ''}`);
}

export async function getAdminTenant(id: string): Promise<AdminTenant & { members: any[] }> {
  return apiRequest(`/admin/tenants/${id}`);
}

export async function updateTenantStatus(id: string, status: 'ACTIVE' | 'SUSPENDED'): Promise<AdminTenant> {
  return apiRequest(`/admin/tenants/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function deleteTenant(id: string): Promise<void> {
  return apiRequest(`/admin/tenants/${id}`, { method: 'DELETE' });
}

export async function getAdminUsers(options?: { isActive?: boolean; isSuperAdmin?: boolean; limit?: number; offset?: number }): Promise<{ users: AdminUser[]; total: number }> {
  const params = new URLSearchParams();
  if (options?.isActive !== undefined) params.append('isActive', options.isActive.toString());
  if (options?.isSuperAdmin !== undefined) params.append('isSuperAdmin', options.isSuperAdmin.toString());
  if (options?.limit) params.append('limit', options.limit.toString());
  if (options?.offset) params.append('offset', options.offset.toString());
  const query = params.toString();
  return apiRequest(`/admin/users${query ? `?${query}` : ''}`);
}

export async function updateUserStatus(id: string, isActive: boolean): Promise<AdminUser> {
  return apiRequest(`/admin/users/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });
}

export async function toggleUserSuperAdmin(id: string, isSuperAdmin: boolean): Promise<AdminUser> {
  return apiRequest(`/admin/users/${id}/super-admin`, {
    method: 'PATCH',
    body: JSON.stringify({ isSuperAdmin }),
  });
}

// ==================== Plans API ====================

export interface Plan {
  id: string;
  name: string;
  nameAr: string;
  description?: string;
  descriptionAr?: string;
  price: number;
  yearlyPrice: number;
  currency: string;
  seatsLimit: number;
  leadsLimit: number;
  searchesLimit: number;
  messagesLimit: number;
  features: string[];
  isActive: boolean;
  sortOrder: number;
  _count?: { subscriptions: number };
}

export async function getPlans(includeInactive = false): Promise<Plan[]> {
  const query = includeInactive ? '?includeInactive=true' : '';
  return apiRequest(`/plans${query}`);
}

export async function getPlan(id: string): Promise<Plan> {
  return apiRequest(`/plans/${id}`);
}

export async function createPlan(data: Partial<Plan>): Promise<Plan> {
  return apiRequest('/plans', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updatePlan(id: string, data: Partial<Plan>): Promise<Plan> {
  return apiRequest(`/plans/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function togglePlanActive(id: string): Promise<Plan> {
  return apiRequest(`/plans/${id}/toggle-active`, {
    method: 'PATCH',
  });
}

export async function deletePlan(id: string): Promise<void> {
  return apiRequest(`/plans/${id}`, { method: 'DELETE' });
}

// ==================== Subscriptions API ====================

export interface Subscription {
  id: string;
  tenantId: string;
  planId: string;
  status: 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'TRIALING' | 'EXPIRED';
  billingCycle: 'MONTHLY' | 'YEARLY';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  trialEndsAt?: string;
  plan: Plan;
  tenant?: { id: string; name: string; slug: string };
}

export interface SubscriptionWithUsage {
  subscription: Subscription;
  usage: {
    SEATS: number;
    LEADS: number;
    SEARCHES: number;
    MESSAGES: number;
  };
  limits: {
    SEATS: number;
    LEADS: number;
    SEARCHES: number;
    MESSAGES: number;
  };
}

export async function getMySubscription(): Promise<SubscriptionWithUsage> {
  return apiRequest('/subscriptions/me');
}

export async function getSubscriptions(options?: { status?: string; limit?: number; offset?: number }): Promise<{ subscriptions: Subscription[]; total: number }> {
  const params = new URLSearchParams();
  if (options?.status) params.append('status', options.status);
  if (options?.limit) params.append('limit', options.limit.toString());
  if (options?.offset) params.append('offset', options.offset.toString());
  const query = params.toString();
  return apiRequest(`/subscriptions${query ? `?${query}` : ''}`);
}

export async function getSubscriptionByTenant(tenantId: string): Promise<SubscriptionWithUsage> {
  return apiRequest(`/subscriptions/tenant/${tenantId}`);
}

export async function createSubscription(data: { tenantId: string; planId: string; billingCycle?: string }): Promise<Subscription> {
  return apiRequest('/subscriptions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function changeSubscriptionPlan(tenantId: string, planId: string): Promise<Subscription> {
  return apiRequest(`/subscriptions/tenant/${tenantId}/plan`, {
    method: 'PATCH',
    body: JSON.stringify({ planId }),
  });
}

export async function cancelSubscription(tenantId: string, immediate = false): Promise<Subscription> {
  return apiRequest(`/subscriptions/tenant/${tenantId}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ immediate }),
  });
}
