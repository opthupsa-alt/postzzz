/**
 * Leedz API Client
 * Handles all API communication with token management
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// Token storage keys
const TOKEN_KEY = 'leedz_token';
const USER_KEY = 'leedz_user';
const TENANT_KEY = 'leedz_tenant';

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  defaultTenantId?: string;
  isSuperAdmin?: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
  role: string;
  tenantId: string | null;
  tenant?: {
    id: string;
    name: string;
  } | null;
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
  localStorage.removeItem(TENANT_KEY);
}

export function setStoredTenant(tenantId: string, role: string): void {
  localStorage.setItem(TENANT_KEY, JSON.stringify({ tenantId, role }));
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
  
  // Only set tenant for non-Super Admin users
  if (data.tenantId) {
    setStoredTenant(data.tenantId, data.role);
  }
  
  return data;
}

export async function signup(name: string, email: string, password: string): Promise<AuthResponse> {
  const data = await apiRequest<AuthResponse>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
  
  setToken(data.token);
  setStoredUser(data.user);
  setStoredTenant(data.tenantId, data.role);
  
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
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST';
  source?: string;
  notes?: string;
  jobId?: string;
  metadata?: {
    rating?: string;
    reviews?: string;
    type?: string;
    hours?: string;
    sourceUrl?: string;
    matchScore?: number;
    searchQuery?: string;
    searchCity?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateLeadDto {
  companyName: string;
  industry?: string;
  city?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  status?: Lead['status'];
  source?: string;
  notes?: string;
  jobId?: string;
  metadata?: Record<string, any>;
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

// Dashboard Stats API
export interface DashboardStats {
  leads: {
    totalLeads: number;
    leadsToday: number;
    leadsThisWeek: number;
    leadsThisMonth: number;
    byStatus: { status: string; count: number }[];
    recentLeads: { id: string; companyName: string; status: string; city?: string; createdAt: string }[];
  };
  jobs: {
    totalJobs: number;
    jobsToday: number;
    jobsThisWeek: number;
    byStatus: { status: string; count: number }[];
    recentJobs: { id: string; type: string; status: string; progress: number; createdAt: string }[];
  };
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const [leads, jobs] = await Promise.all([
    apiRequest<DashboardStats['leads']>('/leads/dashboard-stats'),
    apiRequest<DashboardStats['jobs']>('/jobs/dashboard-stats'),
  ]);
  return { leads, jobs };
}

export async function getLeadsDashboardStats(): Promise<DashboardStats['leads']> {
  return apiRequest('/leads/dashboard-stats');
}

export async function getJobsDashboardStats(): Promise<DashboardStats['jobs']> {
  return apiRequest('/jobs/dashboard-stats');
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

// ==================== Team API ====================

export interface TeamMember {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: 'OWNER' | 'ADMIN' | 'MANAGER' | 'SALES';
  membershipId: string;
  joinedAt: string;
  createdAt: string;
}

export async function getTeamMembers(): Promise<TeamMember[]> {
  return apiRequest('/users/team');
}

export async function updateMemberRole(userId: string, role: string): Promise<TeamMember> {
  return apiRequest(`/users/${userId}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
}

export async function removeMember(userId: string): Promise<void> {
  return apiRequest(`/users/${userId}`, {
    method: 'DELETE',
  });
}

// ==================== Invites API ====================

export interface Invite {
  id: string;
  email: string;
  role: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  expiresAt: string;
  createdAt: string;
}

export async function getInvites(): Promise<Invite[]> {
  return apiRequest('/invites');
}

export async function createInvite(data: { email: string; role: string }): Promise<Invite> {
  return apiRequest('/invites', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteInvite(id: string): Promise<void> {
  return apiRequest(`/invites/${id}`, {
    method: 'DELETE',
  });
}

// ==================== Audit Logs API ====================

export interface AuditLog {
  id: string;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export async function getAuditLogs(options?: { limit?: number; offset?: number }): Promise<AuditLog[]> {
  const params = new URLSearchParams();
  if (options?.limit) params.append('limit', options.limit.toString());
  if (options?.offset) params.append('offset', options.offset.toString());
  const query = params.toString();
  return apiRequest(`/audit-logs${query ? `?${query}` : ''}`);
}

// ==================== Admin API ====================

export interface AdminDashboardStats {
  tenants: { total: number; active: number; suspended: number };
  users: { total: number; active: number };
  leads: number;
  jobs: number;
  recentTenants: {
    id: string;
    name: string;
    slug: string;
    status: string;
    createdAt: string;
    usersCount: number;
    leadsCount: number;
  }[];
  recentUsers: {
    id: string;
    name: string;
    email: string;
    isActive: boolean;
    isSuperAdmin: boolean;
    createdAt: string;
  }[];
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

export async function createAdminPlan(data: {
  name: string;
  nameAr: string;
  price: number;
  yearlyPrice?: number;
  seatsLimit: number;
  leadsLimit: number;
  searchesLimit: number;
  messagesLimit: number;
  isActive?: boolean;
}): Promise<Plan> {
  return apiRequest('/admin/plans', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAdminPlan(id: string, data: {
  name?: string;
  nameAr?: string;
  price?: number;
  yearlyPrice?: number;
  seatsLimit?: number;
  leadsLimit?: number;
  searchesLimit?: number;
  messagesLimit?: number;
  isActive?: boolean;
}): Promise<Plan> {
  return apiRequest(`/admin/plans/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
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

// ==================== Data Bank API (Super Admin) ====================

export interface DataBankStats {
  totalLeads: number;
  leadsToday: number;
  leadsThisWeek: number;
  leadsThisMonth: number;
  byStatus: { status: string; count: number }[];
  bySource: { source: string; count: number }[];
  byTenant: { tenantId: string; tenantName: string; count: number }[];
}

export interface DataBankLead {
  id: string;
  companyName: string;
  industry?: string;
  city?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  status: string;
  source?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  tenant: { id: string; name: string; slug: string };
  createdBy: { id: string; name: string; email: string };
}

export interface DataBankFilters {
  sources: { value: string; label: string; count: number }[];
  cities: { value: string; label: string; count: number }[];
  industries: { value: string; label: string; count: number }[];
  tenants: { value: string; label: string }[];
  statuses: { value: string; label: string }[];
}

export interface DataBankLeadsParams {
  limit?: number;
  offset?: number;
  search?: string;
  tenantId?: string;
  status?: string;
  source?: string;
  city?: string;
  industry?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export async function getDataBankStats(): Promise<DataBankStats> {
  return apiRequest('/admin/data-bank/stats');
}

export async function getDataBankFilters(): Promise<DataBankFilters> {
  return apiRequest('/admin/data-bank/filters');
}

export async function getDataBankLeads(params?: DataBankLeadsParams): Promise<{ leads: DataBankLead[]; total: number }> {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.append('limit', params.limit.toString());
  if (params?.offset) searchParams.append('offset', params.offset.toString());
  if (params?.search) searchParams.append('search', params.search);
  if (params?.tenantId) searchParams.append('tenantId', params.tenantId);
  if (params?.status) searchParams.append('status', params.status);
  if (params?.source) searchParams.append('source', params.source);
  if (params?.city) searchParams.append('city', params.city);
  if (params?.industry) searchParams.append('industry', params.industry);
  if (params?.dateFrom) searchParams.append('dateFrom', params.dateFrom);
  if (params?.dateTo) searchParams.append('dateTo', params.dateTo);
  if (params?.sortBy) searchParams.append('sortBy', params.sortBy);
  if (params?.sortOrder) searchParams.append('sortOrder', params.sortOrder);
  
  const query = searchParams.toString();
  return apiRequest(`/admin/data-bank/leads${query ? `?${query}` : ''}`);
}

export async function getDataBankLead(id: string): Promise<DataBankLead> {
  return apiRequest(`/admin/data-bank/leads/${id}`);
}

export async function exportDataBankLeads(params?: {
  tenantId?: string;
  status?: string;
  source?: string;
  city?: string;
  industry?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<any[]> {
  const searchParams = new URLSearchParams();
  if (params?.tenantId) searchParams.append('tenantId', params.tenantId);
  if (params?.status) searchParams.append('status', params.status);
  if (params?.source) searchParams.append('source', params.source);
  if (params?.city) searchParams.append('city', params.city);
  if (params?.industry) searchParams.append('industry', params.industry);
  if (params?.dateFrom) searchParams.append('dateFrom', params.dateFrom);
  if (params?.dateTo) searchParams.append('dateTo', params.dateTo);
  
  const query = searchParams.toString();
  return apiRequest(`/admin/data-bank/export${query ? `?${query}` : ''}`);
}

// ==================== WhatsApp API ====================

export interface WhatsAppTemplate {
  id: string;
  name: string;
  content: string;
  variables: string[];
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  isActive: boolean;
  createdAt: string;
}

export interface WhatsAppLog {
  id: string;
  phone: string;
  message: string;
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  whatsappUrl?: string;
  createdAt: string;
  sentAt?: string;
  user?: { id: string; name: string };
}

export interface WhatsAppSendResult {
  success: boolean;
  messageId?: string;
  whatsappUrl?: string;
  error?: string;
}

export async function sendWhatsAppMessage(to: string, message: string, templateId?: string): Promise<WhatsAppSendResult> {
  return apiRequest('/whatsapp/send', {
    method: 'POST',
    body: JSON.stringify({ to, message, templateId }),
  });
}

export async function generateWhatsAppUrl(phone: string, message: string): Promise<{ webUrl: string; appUrl: string }> {
  return apiRequest(`/whatsapp/generate-url?phone=${encodeURIComponent(phone)}&message=${encodeURIComponent(message)}`);
}

export async function getWhatsAppLogs(params?: {
  page?: number;
  limit?: number;
  status?: string;
  phone?: string;
}): Promise<{ logs: WhatsAppLog[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.append('page', params.page.toString());
  if (params?.limit) searchParams.append('limit', params.limit.toString());
  if (params?.status) searchParams.append('status', params.status);
  if (params?.phone) searchParams.append('phone', params.phone);
  
  const query = searchParams.toString();
  return apiRequest(`/whatsapp/logs${query ? `?${query}` : ''}`);
}

export async function updateWhatsAppMessageStatus(messageId: string, status: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED'): Promise<WhatsAppLog> {
  return apiRequest(`/whatsapp/logs/${messageId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

export async function getWhatsAppTemplates(): Promise<WhatsAppTemplate[]> {
  return apiRequest('/whatsapp/templates');
}

export async function createWhatsAppTemplate(data: {
  name: string;
  content: string;
  variables: string[];
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
}): Promise<WhatsAppTemplate> {
  return apiRequest('/whatsapp/templates', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateWhatsAppTemplate(id: string, data: Partial<{
  name: string;
  content: string;
  variables: string[];
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
}>): Promise<WhatsAppTemplate> {
  return apiRequest(`/whatsapp/templates/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteWhatsAppTemplate(id: string): Promise<{ success: boolean }> {
  return apiRequest(`/whatsapp/templates/${id}`, {
    method: 'DELETE',
  });
}

export async function getWhatsAppDashboardStats(): Promise<{
  totalMessages: number;
  messagesToday: number;
  messagesThisWeek: number;
  byStatus: { status: string; count: number }[];
  templatesCount: number;
}> {
  return apiRequest('/whatsapp/dashboard-stats');
}

// ==================== Password Reset API ====================

export async function forgotPassword(email: string): Promise<{ message: string }> {
  return apiRequest('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(token: string, password: string): Promise<{ message: string }> {
  return apiRequest('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  });
}

export async function validateResetToken(token: string): Promise<{ valid: boolean; message?: string }> {
  return apiRequest(`/auth/validate-reset-token?token=${token}`);
}

// ==================== WhatsApp Web (QR Code) API ====================

export interface WhatsAppWebStatus {
  status: 'disconnected' | 'qr_ready' | 'connecting' | 'connected' | 'failed' | 'initializing';
  qrCode: string | null;
  phoneNumber: string | null;
  error: string | null;
}

export async function getWhatsAppWebStatus(): Promise<WhatsAppWebStatus> {
  return apiRequest('/whatsapp/web/status');
}

export async function initializeWhatsAppWeb(): Promise<{ success: boolean; message: string }> {
  return apiRequest('/whatsapp/web/initialize', {
    method: 'POST',
  });
}

export async function disconnectWhatsAppWeb(): Promise<{ success: boolean; message: string }> {
  return apiRequest('/whatsapp/web/disconnect', {
    method: 'POST',
  });
}

export async function sendWhatsAppWebMessage(phone: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  return apiRequest('/whatsapp/web/send', {
    method: 'POST',
    body: JSON.stringify({ phone, message }),
  });
}

// ==================== Local Analysis API (No AI Required) ====================

export interface CompanyDataForAnalysis {
  companyName: string;
  industry?: string;
  city?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  rating?: number;
  reviewCount?: number;
  socialLinks?: Record<string, string>;
  socialProfiles?: Record<string, any>;
  allEmails?: string[];
  allPhones?: string[];
  totalFollowers?: number;
  strongestPlatform?: string;
  dataCompleteness?: number;
  dataSources?: {
    googleMaps?: boolean;
    googleSearch?: boolean;
    website?: boolean;
    websitePages?: number;
    socialMedia?: boolean;
    socialPlatforms?: string[];
  };
  description?: string;
  metadata?: any;
}

export interface LocalAnalysisResult {
  executiveSummary: {
    points: string[];
    confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  };
  digitalPresenceScore: number;
  gaps: {
    category: string;
    status: 'GOOD' | 'NEEDS_IMPROVEMENT' | 'MISSING';
    recommendation: string;
  }[];
  recommendedServices: {
    service: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    reason: string;
  }[];
  salesTips: string[];
  qualificationScore: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

/**
 * تحليل محلي سريع للشركة (بدون AI - نتائج فورية)
 */
export async function analyzeCompanyLocal(data: CompanyDataForAnalysis): Promise<LocalAnalysisResult> {
  return apiRequest('/survey/analyze-local', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * التحقق من صحة اسم الشركة قبل التحليل
 */
export async function validateCompanyName(name: string): Promise<{ valid: boolean; reason?: string }> {
  return apiRequest('/survey/validate-name', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

// ==================== Deep Search API (Extension Integration) ====================

export interface DeepSearchResult {
  success: boolean;
  companyName: string;
  sources: string[];
  data: {
    basic: CompanyDataForAnalysis;
    googleMaps?: {
      name?: string;
      phone?: string;
      website?: string;
      address?: string;
      rating?: string;
      reviews?: string;
      category?: string;
      links?: Record<string, string>;
    };
    googleSearch?: {
      officialWebsite?: string;
      socialLinks?: Record<string, string>;
      knowledgePanel?: {
        title?: string;
        description?: string;
      };
    };
    socialProfiles?: Record<string, {
      platform: string;
      url: string;
      username?: string;
      displayName?: string;
      bio?: string;
      followers?: string;
      following?: string;
      posts?: string;
      likes?: string;
      isVerified?: boolean;
    }>;
  };
  summary?: {
    hasGoogleMaps: boolean;
    hasWebsite: boolean;
    socialPlatforms: string[];
    totalFollowers: number;
    isVerifiedAnywhere: boolean;
    contactInfo: {
      phone?: string;
      email?: string;
      website?: string;
      address?: string;
    };
    rating?: string;
    reviews?: string;
  };
  searchTime: number;
  error?: string;
}

/**
 * تحليل شامل مع بيانات البحث العميق من الإكستنشن
 */
export async function analyzeDeep(
  companyData: CompanyDataForAnalysis,
  deepSearchResult?: DeepSearchResult
): Promise<LocalAnalysisResult> {
  return apiRequest('/survey/analyze-deep', {
    method: 'POST',
    body: JSON.stringify({ companyData, deepSearchResult }),
  });
}

/**
 * طلب بحث شامل من الإكستنشن
 * ملاحظة: هذه الوظيفة تعمل فقط من داخل الإكستنشن أو Content Script
 * من الويب العادي، استخدم التحليل المحلي فقط
 */
export async function requestDeepSearch(_companyData: CompanyDataForAnalysis): Promise<DeepSearchResult | null> {
  // البحث الشامل يتم من داخل الإكستنشن فقط
  // الويب يستخدم التحليل المحلي
  console.log('[Leedz] Deep search is only available from extension');
  return null;
}

/**
 * التحقق من اتصال الإكستنشن
 * يتم عبر فحص وجود عنصر مُحقن من Content Script
 */
export async function checkExtensionConnection(): Promise<boolean> {
  // فحص وجود الإكستنشن عبر عنصر DOM مُحقن
  if (typeof document !== 'undefined') {
    const extensionMarker = document.getElementById('leedz-extension-marker');
    return !!extensionMarker;
  }
  return false;
}

// ==================== Formatted Report (AI-powered, no search) ====================

/**
 * نتيجة التقرير المُنسق بالـ AI
 */
export interface FormattedReport {
  executiveSummary: {
    headline: string;
    points: string[];
    overallScore: number;
  };
  digitalPresence: {
    score: number;
    breakdown: {
      category: string;
      status: 'excellent' | 'good' | 'needs_work' | 'missing';
      details: string;
    }[];
  };
  socialMedia: {
    platforms: {
      name: string;
      url: string;
      followers?: string;
      status: string;
      recommendation?: string;
    }[];
    totalFollowers: number;
    strongestPlatform?: string;
  };
  opportunities: {
    title: string;
    priority: 'high' | 'medium' | 'low';
    description: string;
    suggestedService?: string;
  }[];
  salesTips: string[];
  contactInfo: {
    phone?: string;
    email?: string;
    website?: string;
    address?: string;
  };
  tokensUsed: number;
  formattedAt: string;
}

/**
 * تنسيق التقرير باستخدام AI بناءً على بيانات البحث من الإكستنشن
 * لا يقوم بأي بحث - فقط تنسيق البيانات المُقدمة
 * يستهلك ~500 توكن فقط بدلاً من ~5000
 */
export async function formatReport(searchData: DeepSearchResult): Promise<FormattedReport> {
  return apiRequest('/survey/format-report', {
    method: 'POST',
    body: JSON.stringify(searchData),
  });
}
