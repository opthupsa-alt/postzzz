import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

@Injectable()
export class InvitesService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async create(
    tenantId: string,
    inviterId: string,
    email: string,
    role: Role = 'SALES',
  ) {
    // Check if user already exists in tenant
    const existingUser = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      const existingMembership = await this.prisma.membership.findUnique({
        where: {
          userId_tenantId: { userId: existingUser.id, tenantId },
        },
      });

      if (existingMembership) {
        throw new ConflictException('User is already a member of this tenant');
      }
    }

    // Check for pending invite
    const existingInvite = await this.prisma.invite.findFirst({
      where: {
        email: email.toLowerCase(),
        tenantId,
        status: 'PENDING',
      },
    });

    if (existingInvite) {
      throw new ConflictException('Pending invite already exists for this email');
    }

    // Create invite
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    const invite = await this.prisma.invite.create({
      data: {
        email: email.toLowerCase(),
        tenantId,
        inviterId,
        role,
        token,
        expiresAt,
        status: 'PENDING',
      },
      include: { tenant: true },
    });

    await this.auditService.log({
      tenantId,
      userId: inviterId,
      action: 'INVITE_CREATE',
      entityType: 'INVITE',
      entityId: invite.id,
      metadata: { email, role },
    });

    return invite;
  }

  async getByTenant(tenantId: string) {
    return this.prisma.invite.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        inviter: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async accept(token: string, password: string, name?: string) {
    const invite = await this.prisma.invite.findUnique({
      where: { token },
      include: { tenant: true },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    if (invite.status !== 'PENDING') {
      throw new BadRequestException('Invite is no longer valid');
    }

    if (new Date() > invite.expiresAt) {
      await this.prisma.invite.update({
        where: { id: invite.id },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException('Invite has expired');
    }

    // Check if user exists
    let user = await this.prisma.user.findUnique({
      where: { email: invite.email },
    });

    const result = await this.prisma.$transaction(async (tx) => {
      if (!user) {
        // Create new user
        const passwordHash = await bcrypt.hash(password, 12);
        user = await tx.user.create({
          data: {
            email: invite.email,
            passwordHash,
            name: name || invite.email.split('@')[0],
            defaultTenantId: invite.tenantId,
          },
        });
      }

      // Create membership
      await tx.membership.create({
        data: {
          userId: user.id,
          tenantId: invite.tenantId,
          role: invite.role,
        },
      });

      // Update invite status
      await tx.invite.update({
        where: { id: invite.id },
        data: {
          status: 'ACCEPTED',
          acceptedAt: new Date(),
        },
      });

      return user;
    });

    await this.auditService.log({
      tenantId: invite.tenantId,
      userId: result.id,
      action: 'INVITE_ACCEPT',
      entityType: 'INVITE',
      entityId: invite.id,
    });

    return {
      user: {
        id: result.id,
        email: result.email,
        name: result.name,
      },
      tenant: invite.tenant,
    };
  }

  async revoke(inviteId: string, tenantId: string, userId: string) {
    const invite = await this.prisma.invite.findFirst({
      where: { id: inviteId, tenantId },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    if (invite.status !== 'PENDING') {
      throw new BadRequestException('Can only revoke pending invites');
    }

    await this.prisma.invite.update({
      where: { id: inviteId },
      data: { status: 'REJECTED' },
    });

    await this.auditService.log({
      tenantId,
      userId,
      action: 'INVITE_REVOKE',
      entityType: 'INVITE',
      entityId: inviteId,
    });

    return { success: true };
  }

  async resend(inviteId: string, tenantId: string, userId: string) {
    const invite = await this.prisma.invite.findFirst({
      where: { id: inviteId, tenantId, status: 'PENDING' },
    });

    if (!invite) {
      throw new NotFoundException('Pending invite not found');
    }

    // Extend expiry
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.invite.update({
      where: { id: inviteId },
      data: { expiresAt },
    });

    await this.auditService.log({
      tenantId,
      userId,
      action: 'INVITE_RESEND',
      entityType: 'INVITE',
      entityId: inviteId,
    });

    return { success: true, expiresAt };
  }
}
