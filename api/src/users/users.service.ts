import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { Role } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async getTeamMembers(tenantId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: { tenantId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
            createdAt: true,
          },
        },
      },
    });

    return memberships.map((m) => ({
      ...m.user,
      role: m.role,
      membershipId: m.id,
      joinedAt: m.createdAt,
    }));
  }

  async updateMemberRole(
    tenantId: string,
    targetUserId: string,
    newRole: Role,
    actorUserId: string,
    actorRole: string,
  ) {
    // Get target membership
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_tenantId: { userId: targetUserId, tenantId },
      },
    });

    if (!membership) {
      throw new NotFoundException('Member not found');
    }

    // Cannot change owner role
    if (membership.role === 'OWNER') {
      throw new ForbiddenException('Cannot change owner role');
    }

    // Only owner can promote to admin
    if (newRole === 'ADMIN' && actorRole !== 'OWNER') {
      throw new ForbiddenException('Only owner can promote to admin');
    }

    const updated = await this.prisma.membership.update({
      where: { id: membership.id },
      data: { role: newRole },
      include: { user: true },
    });

    await this.auditService.log({
      tenantId,
      userId: actorUserId,
      action: 'MEMBER_ROLE_CHANGE',
      entityType: 'MEMBERSHIP',
      entityId: membership.id,
      metadata: {
        targetUserId,
        oldRole: membership.role,
        newRole,
      },
    });

    return {
      id: updated.user!.id,
      email: updated.user!.email,
      name: updated.user!.name,
      role: updated.role,
    };
  }

  async removeMember(
    tenantId: string,
    targetUserId: string,
    actorUserId: string,
  ) {
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_tenantId: { userId: targetUserId, tenantId },
      },
    });

    if (!membership) {
      throw new NotFoundException('Member not found');
    }

    if (membership.role === 'OWNER') {
      throw new ForbiddenException('Cannot remove owner');
    }

    await this.prisma.membership.delete({
      where: { id: membership.id },
    });

    await this.auditService.log({
      tenantId,
      userId: actorUserId,
      action: 'MEMBER_REMOVE',
      entityType: 'MEMBERSHIP',
      entityId: membership.id,
      metadata: { targetUserId },
    });

    return { success: true };
  }
}
