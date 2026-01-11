export const Permissions = {
  // Tenant
  TENANT_VIEW: 'tenant:view',
  TENANT_EDIT: 'tenant:edit',
  TENANT_DELETE: 'tenant:delete',

  // Team
  TEAM_VIEW: 'team:view',
  TEAM_INVITE: 'team:invite',
  TEAM_REMOVE: 'team:remove',
  TEAM_ROLE_CHANGE: 'team:role_change',

  // Leads
  LEAD_VIEW: 'lead:view',
  LEAD_CREATE: 'lead:create',
  LEAD_EDIT: 'lead:edit',
  LEAD_DELETE: 'lead:delete',
  LEAD_EXPORT: 'lead:export',
  LEAD_IMPORT: 'lead:import',
  LEAD_ASSIGN: 'lead:assign',

  // Lists
  LIST_VIEW: 'list:view',
  LIST_CREATE: 'list:create',
  LIST_EDIT: 'list:edit',
  LIST_DELETE: 'list:delete',

  // Jobs
  JOB_VIEW: 'job:view',
  JOB_CREATE: 'job:create',
  JOB_CANCEL: 'job:cancel',

  // Reports
  REPORT_VIEW: 'report:view',
  REPORT_GENERATE: 'report:generate',

  // WhatsApp
  WHATSAPP_VIEW: 'whatsapp:view',
  WHATSAPP_SEND: 'whatsapp:send',
  WHATSAPP_BULK: 'whatsapp:bulk',
  WHATSAPP_MANAGE: 'whatsapp:manage',

  // Settings
  SETTINGS_VIEW: 'settings:view',
  SETTINGS_EDIT: 'settings:edit',

  // Billing
  BILLING_VIEW: 'billing:view',
  BILLING_MANAGE: 'billing:manage',

  // Audit
  AUDIT_VIEW: 'audit:view',
} as const;

export type Permission = (typeof Permissions)[keyof typeof Permissions];

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  OWNER: Object.values(Permissions),

  ADMIN: [
    Permissions.TENANT_VIEW,
    Permissions.TENANT_EDIT,
    Permissions.TEAM_VIEW,
    Permissions.TEAM_INVITE,
    Permissions.TEAM_REMOVE,
    Permissions.TEAM_ROLE_CHANGE,
    Permissions.LEAD_VIEW,
    Permissions.LEAD_CREATE,
    Permissions.LEAD_EDIT,
    Permissions.LEAD_DELETE,
    Permissions.LEAD_EXPORT,
    Permissions.LEAD_IMPORT,
    Permissions.LEAD_ASSIGN,
    Permissions.LIST_VIEW,
    Permissions.LIST_CREATE,
    Permissions.LIST_EDIT,
    Permissions.LIST_DELETE,
    Permissions.JOB_VIEW,
    Permissions.JOB_CREATE,
    Permissions.JOB_CANCEL,
    Permissions.REPORT_VIEW,
    Permissions.REPORT_GENERATE,
    Permissions.WHATSAPP_VIEW,
    Permissions.WHATSAPP_SEND,
    Permissions.WHATSAPP_BULK,
    Permissions.WHATSAPP_MANAGE,
    Permissions.SETTINGS_VIEW,
    Permissions.SETTINGS_EDIT,
    Permissions.AUDIT_VIEW,
  ],

  MANAGER: [
    Permissions.TENANT_VIEW,
    Permissions.TEAM_VIEW,
    Permissions.LEAD_VIEW,
    Permissions.LEAD_CREATE,
    Permissions.LEAD_EDIT,
    Permissions.LEAD_ASSIGN,
    Permissions.LIST_VIEW,
    Permissions.LIST_CREATE,
    Permissions.LIST_EDIT,
    Permissions.JOB_VIEW,
    Permissions.JOB_CREATE,
    Permissions.REPORT_VIEW,
    Permissions.REPORT_GENERATE,
    Permissions.WHATSAPP_VIEW,
    Permissions.WHATSAPP_SEND,
  ],

  SALES: [
    Permissions.TENANT_VIEW,
    Permissions.LEAD_VIEW,
    Permissions.LEAD_CREATE,
    Permissions.LEAD_EDIT,
    Permissions.LIST_VIEW,
    Permissions.JOB_VIEW,
    Permissions.REPORT_VIEW,
    Permissions.WHATSAPP_VIEW,
    Permissions.WHATSAPP_SEND,
  ],
};
