import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class TenantsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async findById(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant;
  }

  async getUserTenants(userId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: { userId },
      include: { tenant: true },
    });

    return memberships.map((m) => ({
      ...m.tenant,
      role: m.role,
    }));
  }

  async switchTenant(userId: string, tenantId: string) {
    // Verify membership
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_tenantId: { userId, tenantId },
      },
      include: { tenant: true },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this tenant');
    }

    // Update default tenant
    await this.prisma.user.update({
      where: { id: userId },
      data: { defaultTenantId: tenantId },
    });

    // Audit log
    await this.auditService.log({
      tenantId,
      userId,
      action: 'TENANT_SWITCH',
      entityType: 'TENANT',
      entityId: tenantId,
    });

    return {
      tenant: membership.tenant,
      role: membership.role,
    };
  }

  async update(tenantId: string, userId: string, data: { name?: string }) {
    const tenant = await this.prisma.tenant.update({
      where: { id: tenantId },
      data,
    });

    await this.auditService.log({
      tenantId,
      userId,
      action: 'TENANT_UPDATE',
      entityType: 'TENANT',
      entityId: tenantId,
      metadata: data,
    });

    return tenant;
  }
}
