
export enum JobStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  SUCCESS = 'SUCCESS', // Alias for COMPLETED
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

export interface Job {
  id: string;
  type: 'SEARCH' | 'SURVEY' | 'WHATSAPP';
  status: JobStatus;
  progress: number;
  message: string;
  result?: any;
  createdAt: string;
}

export interface Lead {
  id: string;
  companyName: string;
  industry: string;
  city: string;
  phone?: string;
  website?: string;
  email?: string;
  address?: string;
  status: 'NEW' | 'PROSPECTED' | 'CONTACTED' | 'QUALIFIED' | 'LOST';
  evidenceCount: number;
  hasReport: boolean;
  tags?: string[];
  listId?: string;
  source?: string;
  jobId?: string;
  createdAt?: string;
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
}

export interface LeadList {
  id: string;
  name: string;
  count: number;
  updatedAt: string;
}

export interface Evidence {
  id: string;
  leadId: string;
  title: string;
  source: string;
  url: string;
  snippet: string;
  timestamp: string;
  type: 'WEBSITE' | 'SOCIAL' | 'NEWS' | 'REVIEWS';
}

export interface ReportSection {
  title: string;
  content: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  evidenceIds: string[];
}

export interface Report {
  leadId: string;
  sections: ReportSection[];
  summary: string;
  lastUpdated: string;
}

export interface Activity {
  id: string;
  leadId: string;
  type: 'SEARCH' | 'SURVEY' | 'WHATSAPP' | 'LIST_ADD' | 'STATUS_CHANGE';
  description: string;
  timestamp: string;
  user: string;
}

export interface AuditLog {
  id: string;
  action: string;
  user: string;
  target: string;
  timestamp: string;
  details?: string;
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  content: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'SALES';
  status: 'ONLINE' | 'OFFLINE';
  avatar?: string;
  joinedAt: string;
}

export interface NotificationPreferences {
  searchCompletions: boolean;
  salesReports: boolean;
  whatsappStatus: boolean;
  teamActivity: boolean;
}
