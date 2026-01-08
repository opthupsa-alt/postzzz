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
    ] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.tenant.count({ where: { status: 'ACTIVE' } }),
      this.prisma.tenant.count({ where: { status: 'SUSPENDED' } }),
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.lead.count(),
      this.prisma.job.count(),
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
}
