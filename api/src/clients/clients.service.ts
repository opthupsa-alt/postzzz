import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ClientStatus, SocialPlatform } from '@prisma/client';
import { CreateClientDto, UpdateClientDto, CreatePlatformDto, UpdatePlatformDto } from './dto';

@Injectable()
export class ClientsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  // ==================== CLIENTS ====================

  async findAll(tenantId: string, options?: { search?: string; status?: ClientStatus }) {
    const where: any = { tenantId };

    if (options?.status) {
      where.status = options.status;
    }

    if (options?.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { industry: { contains: options.search, mode: 'insensitive' } },
        { category: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    const clients = await this.prisma.client.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { platforms: true },
        },
      },
    });

    return clients.map(client => ({
      ...client,
      platformsCount: client._count.platforms,
    }));
  }

  async findById(tenantId: string, clientId: string) {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, tenantId },
      include: {
        platforms: {
          orderBy: { createdAt: 'asc' },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    return client;
  }

  async create(tenantId: string, userId: string, dto: CreateClientDto) {
    const client = await this.prisma.client.create({
      data: {
        tenantId,
        createdById: userId,
        name: dto.name,
        category: dto.category,
        industry: dto.industry,
        description: dto.description,
        logoUrl: dto.logoUrl,
        contactName: dto.contactName,
        contactEmail: dto.contactEmail,
        contactPhone: dto.contactPhone,
        website: dto.website,
        notes: dto.notes,
        status: ClientStatus.ACTIVE,
      },
    });

    await this.auditService.log({
      tenantId,
      userId,
      action: 'CLIENT_CREATE',
      entityType: 'CLIENT',
      entityId: client.id,
      metadata: { name: client.name },
    });

    return client;
  }

  async update(tenantId: string, userId: string, clientId: string, dto: UpdateClientDto) {
    const existing = await this.prisma.client.findFirst({
      where: { id: clientId, tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Client not found');
    }

    const client = await this.prisma.client.update({
      where: { id: clientId },
      data: {
        name: dto.name,
        category: dto.category,
        industry: dto.industry,
        description: dto.description,
        logoUrl: dto.logoUrl,
        contactName: dto.contactName,
        contactEmail: dto.contactEmail,
        contactPhone: dto.contactPhone,
        website: dto.website,
        notes: dto.notes,
        status: dto.status,
      },
    });

    await this.auditService.log({
      tenantId,
      userId,
      action: 'CLIENT_UPDATE',
      entityType: 'CLIENT',
      entityId: client.id,
      metadata: { name: client.name },
    });

    return client;
  }

  async delete(tenantId: string, userId: string, clientId: string) {
    const existing = await this.prisma.client.findFirst({
      where: { id: clientId, tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Client not found');
    }

    // Soft delete by setting status to ARCHIVED
    const client = await this.prisma.client.update({
      where: { id: clientId },
      data: { status: ClientStatus.ARCHIVED },
    });

    await this.auditService.log({
      tenantId,
      userId,
      action: 'CLIENT_DELETE',
      entityType: 'CLIENT',
      entityId: client.id,
      metadata: { name: client.name },
    });

    return { success: true };
  }

  // ==================== PLATFORMS ====================

  async findPlatforms(tenantId: string, clientId: string) {
    // Verify client belongs to tenant
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, tenantId },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    return this.prisma.clientPlatform.findMany({
      where: { clientId, tenantId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createPlatform(tenantId: string, userId: string, clientId: string, dto: CreatePlatformDto) {
    // Verify client belongs to tenant
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, tenantId },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    // Check for duplicate platform
    const existing = await this.prisma.clientPlatform.findUnique({
      where: {
        tenantId_clientId_platform: {
          tenantId,
          clientId,
          platform: dto.platform,
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Platform ${dto.platform} already exists for this client`);
    }

    const platform = await this.prisma.clientPlatform.create({
      data: {
        tenantId,
        clientId,
        platform: dto.platform,
        handle: dto.handle,
        profileUrl: dto.profileUrl,
        notes: dto.notes,
        isEnabled: dto.isEnabled ?? true,
      },
    });

    await this.auditService.log({
      tenantId,
      userId,
      action: 'PLATFORM_CREATE',
      entityType: 'CLIENT_PLATFORM',
      entityId: platform.id,
      metadata: { clientId, platform: dto.platform },
    });

    return platform;
  }

  async updatePlatform(tenantId: string, userId: string, platformId: string, dto: UpdatePlatformDto) {
    const existing = await this.prisma.clientPlatform.findFirst({
      where: { id: platformId, tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Platform not found');
    }

    const platform = await this.prisma.clientPlatform.update({
      where: { id: platformId },
      data: {
        handle: dto.handle,
        profileUrl: dto.profileUrl,
        notes: dto.notes,
        isEnabled: dto.isEnabled,
      },
    });

    await this.auditService.log({
      tenantId,
      userId,
      action: 'PLATFORM_UPDATE',
      entityType: 'CLIENT_PLATFORM',
      entityId: platform.id,
      metadata: { platform: platform.platform },
    });

    return platform;
  }

  async deletePlatform(tenantId: string, userId: string, platformId: string) {
    const existing = await this.prisma.clientPlatform.findFirst({
      where: { id: platformId, tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Platform not found');
    }

    await this.prisma.clientPlatform.delete({
      where: { id: platformId },
    });

    await this.auditService.log({
      tenantId,
      userId,
      action: 'PLATFORM_DELETE',
      entityType: 'CLIENT_PLATFORM',
      entityId: platformId,
      metadata: { platform: existing.platform },
    });

    return { success: true };
  }
}
