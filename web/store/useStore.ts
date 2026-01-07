
import { create } from 'zustand';
import { Job, JobStatus, Lead, Evidence, Report, Activity, WhatsAppTemplate, LeadList, AuditLog, TeamMember, NotificationPreferences } from '../types';

interface ApiKey {
  id: string;
  label: string;
  key: string;
  createdAt: string;
}

interface AppState {
  // Core State
  jobs: Job[];
  leads: Lead[];
  savedLeads: Lead[];
  lists: LeadList[];
  evidence: Record<string, Evidence[]>;
  reports: Record<string, Report>;
  activities: Record<string, Activity[]>;
  auditLogs: AuditLog[];
  templates: WhatsAppTemplate[];
  apiKeys: ApiKey[];
  
  // UI/System State
  activeJobId: string | null;
  connectedPhone: string;
  notificationPreferences: NotificationPreferences;
  team: TeamMember[];
  language: 'ar' | 'en';

  // Actions
  addJob: (job: Job) => void;
  updateJob: (id: string, updates: Partial<Job>) => void;
  setActiveJob: (id: string | null) => void;
  setLeads: (leads: Lead[]) => void;
  saveLead: (lead: Lead) => void;
  bulkSaveLeads: (leads: Lead[]) => void;
  updateLeadStatus: (leadId: string, status: Lead['status']) => void;
  removeLead: (id: string) => void;
  addEvidence: (leadId: string, item: Evidence) => void;
  setReport: (leadId: string, report: Report) => void;
  addActivity: (leadId: string, activity: Activity) => void;
  addAuditLog: (log: AuditLog) => void;
  
  // Api Key management
  addApiKey: (label: string) => void;
  deleteApiKey: (id: string) => void;

  // List management
  addList: (list: LeadList) => void;
  deleteList: (id: string) => void;
  assignLeadsToList: (leadIds: string[], listId: string) => void;
  removeLeadsFromList: (leadIds: string[]) => void;
  
  // Template management
  addTemplate: (template: WhatsAppTemplate) => void;
  updateTemplate: (id: string, name: string, content: string) => void;
  deleteTemplate: (id: string) => void;

  // Settings & Team
  setConnectedPhone: (phone: string) => void;
  toggleNotificationPreference: (key: keyof NotificationPreferences) => void;
  addTeamMember: (member: TeamMember) => void;
  removeTeamMember: (id: string) => void;
  toggleLanguage: () => void;
}

export const useStore = create<AppState>((set) => ({
  jobs: [],
  leads: [],
  savedLeads: [
    { id: 'CRM-1', companyName: 'أرامكو السعودية', industry: 'طاقة', city: 'الظهران', status: 'QUALIFIED', evidenceCount: 5, hasReport: true, tags: ['VIP', 'Enterprise'], listId: '1' },
    { id: 'CRM-2', companyName: 'بنك الراجحي', industry: 'مالية', city: 'الرياض', status: 'CONTACTED', evidenceCount: 2, hasReport: false, tags: ['Banking'], listId: '1' },
    { id: 'CRM-3', companyName: 'مطاعم الرومانسية', industry: 'أغذية', city: 'جدة', status: 'NEW', evidenceCount: 1, hasReport: true, listId: '2' }
  ],
  lists: [
    { id: '1', name: 'عملاء الرياض - تكنولوجيا', count: 42, updatedAt: 'منذ يومين' },
    { id: '2', name: 'مطاعم جدة المستهدفة', count: 15, updatedAt: 'منذ 5 أيام' },
  ],
  apiKeys: [
    { id: 'k1', label: 'تطبيق الويب الرئيسي', key: 'lz_live_8s92jhsk92msh72', createdAt: new Date().toISOString() }
  ],
  evidence: {},
  reports: {},
  activities: {},
  auditLogs: [
    { id: '1', action: 'تصدير بيانات', user: 'أحمد محمد', target: 'قائمة الرياض', timestamp: new Date(Date.now() - 3600000).toISOString() },
    { id: '2', action: 'حذف عميل', user: 'سارة خالد', target: 'شركة الأمل', timestamp: new Date(Date.now() - 7200000).toISOString() }
  ],
  templates: [
    { id: '1', name: 'تعريف عام', content: 'مرحباً فريق ${name}، نود تقديم خدماتنا التقنية لكم بناءً على فحصنا الأخير لنشاطكم.' },
  ],
  team: [
    { id: 'T1', name: 'أحمد محمد', email: 'ahmed@leadz.sa', role: 'ADMIN', status: 'ONLINE', joinedAt: '2023-01-01' },
    { id: 'T2', name: 'سارة خالد', email: 'sara@leadz.sa', role: 'SALES', status: 'ONLINE', joinedAt: '2023-05-12' },
  ],
  activeJobId: null,
  connectedPhone: '+966 50 123 4567',
  notificationPreferences: {
    searchCompletions: true,
    salesReports: true,
    whatsappStatus: true,
    teamActivity: false,
  },
  language: 'ar',
  
  addJob: (job) => set((state) => ({ jobs: [...state.jobs, job], activeJobId: job.id })),
  updateJob: (id, updates) => set((state) => ({
    jobs: state.jobs.map((j) => (j.id === id ? { ...j, ...updates } : j))
  })),
  setActiveJob: (id) => set({ activeJobId: id }),
  setLeads: (leads) => set({ leads }),
  saveLead: (lead) => set((state) => ({
    savedLeads: state.savedLeads.some(l => l.id === lead.id) ? state.savedLeads : [...state.savedLeads, lead]
  })),
  bulkSaveLeads: (leads) => set((state) => {
    const newLeads = leads.filter(l => !state.savedLeads.some(sl => l.id === sl.id));
    return { savedLeads: [...state.savedLeads, ...newLeads] };
  }),
  updateLeadStatus: (leadId, status) => set((state) => ({
    savedLeads: state.savedLeads.map(l => l.id === leadId ? { ...l, status } : l),
    leads: state.leads.map(l => l.id === leadId ? { ...l, status } : l)
  })),
  removeLead: (id) => set((state) => ({
    savedLeads: state.savedLeads.filter(l => l.id !== id)
  })),
  addEvidence: (leadId, item) => set((state) => ({
    evidence: { ...state.evidence, [leadId]: [...(state.evidence[leadId] || []), item] }
  })),
  setReport: (leadId, report) => set((state) => ({
    reports: { ...state.reports, [leadId]: report }
  })),
  addActivity: (leadId, activity) => set((state) => ({
    activities: { ...state.activities, [leadId]: [activity, ...(state.activities[leadId] || [])] }
  })),
  addAuditLog: (log) => set((state) => ({ auditLogs: [log, ...state.auditLogs] })),
  addList: (list) => set((state) => ({ lists: [list, ...state.lists] })),
  deleteList: (id) => set((state) => ({
    lists: state.lists.filter(l => l.id !== id),
    savedLeads: state.savedLeads.map(l => l.listId === id ? { ...l, listId: undefined } : l)
  })),
  assignLeadsToList: (leadIds, listId) => set((state) => ({
    savedLeads: state.savedLeads.map(l => leadIds.includes(l.id) ? { ...l, listId } : l)
  })),
  removeLeadsFromList: (leadIds) => set((state) => ({
    savedLeads: state.savedLeads.map(l => leadIds.includes(l.id) ? { ...l, listId: undefined } : l)
  })),
  addApiKey: (label) => set((state) => ({
    apiKeys: [
      ...state.apiKeys,
      {
        id: Math.random().toString(36).substr(2, 9),
        label,
        key: 'lz_live_' + Math.random().toString(36).substr(2, 15),
        createdAt: new Date().toISOString()
      }
    ]
  })),
  deleteApiKey: (id) => set((state) => ({
    apiKeys: state.apiKeys.filter(k => k.id !== id)
  })),
  addTemplate: (template) => set((state) => ({ templates: [...state.templates, template] })),
  updateTemplate: (id, name, content) => set((state) => ({
    templates: state.templates.map(t => t.id === id ? { ...t, name, content } : t)
  })),
  deleteTemplate: (id) => set((state) => ({ templates: state.templates.filter(t => t.id !== id) })),
  setConnectedPhone: (phone) => set({ connectedPhone: phone }),
  toggleNotificationPreference: (key) => set((state) => ({
    notificationPreferences: { ...state.notificationPreferences, [key]: !state.notificationPreferences[key] }
  })),
  addTeamMember: (member) => set((state) => ({ team: [...state.team, member] })),
  removeTeamMember: (id) => set((state) => ({ team: state.team.filter(m => m.id !== id) })),
  toggleLanguage: () => set((state) => ({ language: state.language === 'ar' ? 'en' : 'ar' })),
}));
