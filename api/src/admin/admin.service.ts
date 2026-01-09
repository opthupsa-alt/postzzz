import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantStatus, SearchMethod } from '@prisma/client';
import { UpdatePlatformSettingsDto } from './dto/update-platform-settings.dto';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // ==================== Dashboard Stats ====================

  async getDashboardStats() {
    const [
      totalTenants,
      activeTenants,
      suspendedTenants,
      totalUsers,
      activeUsers,
      totalLeads,
      totalJobs,
      recentTenants,
      recentUsers,
    ] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.tenant.count({ where: { status: 'ACTIVE' } }),
      this.prisma.tenant.count({ where: { status: 'SUSPENDED' } }),
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.lead.count(),
      this.prisma.job.count(),
      // أحدث 5 منظمات
      this.prisma.tenant.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          createdAt: true,
          _count: { select: { users: true, leads: true } },
        },
      }),
      // أحدث 5 مستخدمين
      this.prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          isActive: true,
          isSuperAdmin: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      tenants: {
        total: totalTenants,
        active: activeTenants,
        suspended: suspendedTenants,
      },
      users: {
        total: totalUsers,
        active: activeUsers,
      },
      leads: totalLeads,
      jobs: totalJobs,
      recentTenants: recentTenants.map(t => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        status: t.status,
        createdAt: t.createdAt,
        usersCount: t._count.users,
        leadsCount: t._count.leads,
      })),
      recentUsers: recentUsers.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        isActive: u.isActive,
        isSuperAdmin: u.isSuperAdmin,
        createdAt: u.createdAt,
      })),
    };
  }

  // ==================== Tenants Management ====================

  async getAllTenants(options?: { status?: TenantStatus; limit?: number; offset?: number }) {
    const where: any = {};
    if (options?.status) {
      where.status = options.status;
    }

    const [tenants, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
        include: {
          _count: {
            select: {
              users: true,
              leads: true,
              jobs: true,
            },
          },
          memberships: {
            where: { role: 'OWNER' },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
            take: 1,
          },
        },
      }),
      this.prisma.tenant.count({ where }),
    ]);

    return {
      tenants: tenants.map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        status: t.status,
        planId: t.planId,
        createdAt: t.createdAt,
        owner: t.memberships[0]?.user || null,
        stats: {
          users: t._count.users,
          leads: t._count.leads,
          jobs: t._count.jobs,
        },
      })),
      total,
    };
  }

  async getTenantById(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            leads: true,
            jobs: true,
            lists: true,
            reports: true,
          },
        },
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                isActive: true,
                createdAt: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status,
      planId: tenant.planId,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
      stats: tenant._count,
      members: tenant.memberships.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
        isActive: m.user.isActive,
        joinedAt: m.createdAt,
      })),
    };
  }

  async updateTenantStatus(id: string, status: TenantStatus) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return this.prisma.tenant.update({
      where: { id },
      data: { status },
    });
  }

  async deleteTenant(id: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Cascade delete is handled by Prisma relations
    return this.prisma.tenant.delete({ where: { id } });
  }

  // ==================== Users Management ====================

  async getAllUsers(options?: { isActive?: boolean; isSuperAdmin?: boolean; limit?: number; offset?: number }) {
    const where: any = {};
    if (options?.isActive !== undefined) {
      where.isActive = options.isActive;
    }
    if (options?.isSuperAdmin !== undefined) {
      where.isSuperAdmin = options.isSuperAdmin;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
        select: {
          id: true,
          email: true,
          name: true,
          isSuperAdmin: true,
          isActive: true,
          createdAt: true,
          memberships: {
            include: {
              tenant: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        isSuperAdmin: u.isSuperAdmin,
        isActive: u.isActive,
        createdAt: u.createdAt,
        tenants: u.memberships.map((m) => ({
          id: m.tenant.id,
          name: m.tenant.name,
          role: m.role,
        })),
      })),
      total,
    };
  }

  async updateUserStatus(id: string, isActive: boolean) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id },
      data: { isActive },
    });
  }

  async toggleSuperAdmin(id: string, isSuperAdmin: boolean) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id },
      data: { isSuperAdmin },
    });
  }

  // ==================== Platform Settings ====================

  async getPlatformSettings() {
    // Get or create default settings
    let settings = await this.prisma.platformSettings.findUnique({
      where: { id: 'default' },
    });

    if (!settings) {
      settings = await this.prisma.platformSettings.create({
        data: { id: 'default' },
      });
    }

    return settings;
  }

  async updatePlatformSettings(dto: UpdatePlatformSettingsDto) {
    // Ensure settings exist
    await this.getPlatformSettings();

    const data: any = {};

    if (dto.platformUrl !== undefined) data.platformUrl = dto.platformUrl;
    if (dto.apiUrl !== undefined) data.apiUrl = dto.apiUrl;
    if (dto.searchMethod !== undefined) data.searchMethod = dto.searchMethod as SearchMethod;
    if (dto.googleApiKey !== undefined) data.googleApiKey = dto.googleApiKey;
    if (dto.extensionAutoLogin !== undefined) data.extensionAutoLogin = dto.extensionAutoLogin;
    if (dto.extensionDebugMode !== undefined) data.extensionDebugMode = dto.extensionDebugMode;
    if (dto.requireSubscription !== undefined) data.requireSubscription = dto.requireSubscription;
    if (dto.trialDays !== undefined) data.trialDays = dto.trialDays;
    if (dto.searchRateLimit !== undefined) data.searchRateLimit = dto.searchRateLimit;
    if (dto.crawlRateLimit !== undefined) data.crawlRateLimit = dto.crawlRateLimit;

    return this.prisma.platformSettings.update({
      where: { id: 'default' },
      data,
    });
  }

  // Public endpoint for extension to get config (no auth required for some fields)
  async getPublicPlatformConfig() {
    const settings = await this.getPlatformSettings();
    
    return {
      platformUrl: settings.platformUrl,
      apiUrl: settings.apiUrl,
      extensionAutoLogin: settings.extensionAutoLogin,
      searchMethod: settings.searchMethod,
      // Don't expose sensitive fields like googleApiKey
    };
  }

  // ==================== Plans Management ====================

  async createPlan(dto: {
    name: string;
    nameAr: string;
    price: number;
    yearlyPrice?: number;
    seatsLimit: number;
    leadsLimit: number;
    searchesLimit: number;
    messagesLimit: number;
    isActive?: boolean;
  }) {
    return this.prisma.plan.create({
      data: {
        name: dto.name,
        nameAr: dto.nameAr,
        price: dto.price,
        yearlyPrice: dto.yearlyPrice || 0,
        seatsLimit: dto.seatsLimit,
        leadsLimit: dto.leadsLimit,
        searchesLimit: dto.searchesLimit,
        messagesLimit: dto.messagesLimit,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updatePlan(id: string, dto: {
    name?: string;
    nameAr?: string;
    price?: number;
    yearlyPrice?: number;
    seatsLimit?: number;
    leadsLimit?: number;
    searchesLimit?: number;
    messagesLimit?: number;
    isActive?: boolean;
  }) {
    const plan = await this.prisma.plan.findUnique({ where: { id } });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.nameAr !== undefined) data.nameAr = dto.nameAr;
    if (dto.price !== undefined) data.price = dto.price;
    if (dto.yearlyPrice !== undefined) data.yearlyPrice = dto.yearlyPrice;
    if (dto.seatsLimit !== undefined) data.seatsLimit = dto.seatsLimit;
    if (dto.leadsLimit !== undefined) data.leadsLimit = dto.leadsLimit;
    if (dto.searchesLimit !== undefined) data.searchesLimit = dto.searchesLimit;
    if (dto.messagesLimit !== undefined) data.messagesLimit = dto.messagesLimit;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    return this.prisma.plan.update({
      where: { id },
      data,
    });
  }

  // ==================== Data Bank (All Platform Leads) ====================

  async getDataBankStats() {
    const [
      totalLeads,
      leadsByStatus,
      leadsBySource,
      leadsByTenant,
      leadsToday,
      leadsThisWeek,
      leadsThisMonth,
    ] = await Promise.all([
      this.prisma.lead.count(),
      this.prisma.lead.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      this.prisma.lead.groupBy({
        by: ['source'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
      this.prisma.lead.groupBy({
        by: ['tenantId'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
      this.prisma.lead.count({
        where: {
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      this.prisma.lead.count({
        where: {
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      this.prisma.lead.count({
        where: {
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    // Get tenant names for the top tenants
    const tenantIds = leadsByTenant.map((t) => t.tenantId);
    const tenants = await this.prisma.tenant.findMany({
      where: { id: { in: tenantIds } },
      select: { id: true, name: true },
    });
    const tenantMap = new Map(tenants.map((t) => [t.id, t.name]));

    return {
      totalLeads,
      leadsToday,
      leadsThisWeek,
      leadsThisMonth,
      byStatus: leadsByStatus.map((s) => ({
        status: s.status,
        count: s._count.id,
      })),
      bySource: leadsBySource.map((s) => ({
        source: s.source || 'غير محدد',
        count: s._count.id,
      })),
      byTenant: leadsByTenant.map((t) => ({
        tenantId: t.tenantId,
        tenantName: tenantMap.get(t.tenantId) || 'غير معروف',
        count: t._count.id,
      })),
    };
  }

  async getDataBankLeads(options?: {
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
  }) {
    const where: any = {};

    // Search filter
    if (options?.search) {
      where.OR = [
        { companyName: { contains: options.search, mode: 'insensitive' } },
        { email: { contains: options.search, mode: 'insensitive' } },
        { phone: { contains: options.search, mode: 'insensitive' } },
        { city: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    // Tenant filter
    if (options?.tenantId) {
      where.tenantId = options.tenantId;
    }

    // Status filter
    if (options?.status) {
      where.status = options.status;
    }

    // Source filter
    if (options?.source) {
      where.source = options.source;
    }

    // City filter
    if (options?.city) {
      where.city = { contains: options.city, mode: 'insensitive' };
    }

    // Industry filter
    if (options?.industry) {
      where.industry = { contains: options.industry, mode: 'insensitive' };
    }

    // Date range filter
    if (options?.dateFrom || options?.dateTo) {
      where.createdAt = {};
      if (options?.dateFrom) {
        where.createdAt.gte = new Date(options.dateFrom);
      }
      if (options?.dateTo) {
        where.createdAt.lte = new Date(options.dateTo);
      }
    }

    // Sorting
    const orderBy: any = {};
    const sortField = options?.sortBy || 'createdAt';
    const sortOrder = options?.sortOrder || 'desc';
    orderBy[sortField] = sortOrder;

    const [leads, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        orderBy,
        take: options?.limit || 50,
        skip: options?.offset || 0,
        include: {
          tenant: {
            select: { id: true, name: true, slug: true },
          },
          createdBy: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      this.prisma.lead.count({ where }),
    ]);

    return { leads, total };
  }

  async getDataBankLead(id: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: {
        tenant: {
          select: { id: true, name: true, slug: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        job: {
          select: { id: true, type: true, status: true, createdAt: true },
        },
        lists: {
          include: {
            list: {
              select: { id: true, name: true, color: true },
            },
          },
        },
      },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    return lead;
  }

  async getDataBankFilters() {
    const [sources, cities, industries, tenants] = await Promise.all([
      this.prisma.lead.groupBy({
        by: ['source'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      this.prisma.lead.groupBy({
        by: ['city'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 50,
      }),
      this.prisma.lead.groupBy({
        by: ['industry'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 50,
      }),
      this.prisma.tenant.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    return {
      sources: sources
        .filter((s) => s.source)
        .map((s) => ({ value: s.source!, label: s.source!, count: s._count.id })),
      cities: cities
        .filter((c) => c.city)
        .map((c) => ({ value: c.city!, label: c.city!, count: c._count.id })),
      industries: industries
        .filter((i) => i.industry)
        .map((i) => ({ value: i.industry!, label: i.industry!, count: i._count.id })),
      tenants: tenants.map((t) => ({ value: t.id, label: t.name })),
      statuses: [
        { value: 'NEW', label: 'جديد' },
        { value: 'CONTACTED', label: 'تم التواصل' },
        { value: 'QUALIFIED', label: 'مؤهل' },
        { value: 'PROPOSAL', label: 'عرض سعر' },
        { value: 'NEGOTIATION', label: 'تفاوض' },
        { value: 'WON', label: 'تم الفوز' },
        { value: 'LOST', label: 'خسارة' },
      ],
    };
  }

  async exportDataBankLeads(options?: {
    tenantId?: string;
    status?: string;
    source?: string;
    city?: string;
    industry?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const where: any = {};

    if (options?.tenantId) where.tenantId = options.tenantId;
    if (options?.status) where.status = options.status;
    if (options?.source) where.source = options.source;
    if (options?.city) where.city = { contains: options.city, mode: 'insensitive' };
    if (options?.industry) where.industry = { contains: options.industry, mode: 'insensitive' };

    if (options?.dateFrom || options?.dateTo) {
      where.createdAt = {};
      if (options?.dateFrom) where.createdAt.gte = new Date(options.dateFrom);
      if (options?.dateTo) where.createdAt.lte = new Date(options.dateTo);
    }

    const leads = await this.prisma.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        tenant: { select: { name: true } },
        createdBy: { select: { name: true, email: true } },
      },
    });

    return leads.map((lead) => ({
      id: lead.id,
      companyName: lead.companyName,
      industry: lead.industry || '',
      city: lead.city || '',
      address: lead.address || '',
      phone: lead.phone || '',
      email: lead.email || '',
      website: lead.website || '',
      status: lead.status,
      source: lead.source || '',
      notes: lead.notes || '',
      tenantName: lead.tenant.name,
      createdByName: lead.createdBy.name,
      createdByEmail: lead.createdBy.email,
      createdAt: lead.createdAt.toISOString(),
    }));
  }
}
