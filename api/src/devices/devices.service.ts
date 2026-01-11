import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RegisterDeviceDto, UpdateDeviceDto, HeartbeatDto } from './dto';

// Offline threshold in milliseconds (2 minutes)
const OFFLINE_THRESHOLD_MS = 2 * 60 * 1000;

@Injectable()
export class DevicesService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async findAll(tenantId: string) {
    const devices = await this.prisma.deviceAgent.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        client: {
          select: { id: true, name: true, logoUrl: true },
        },
      },
    });

    // Update status based on lastSeenAt
    return devices.map(device => ({
      ...device,
      status: this.computeStatus(device.lastSeenAt),
    }));
  }

  async findById(tenantId: string, deviceId: string) {
    const device = await this.prisma.deviceAgent.findFirst({
      where: { id: deviceId, tenantId },
      include: {
        client: {
          select: { id: true, name: true, logoUrl: true },
        },
      },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    return {
      ...device,
      status: this.computeStatus(device.lastSeenAt),
    };
  }

  async register(tenantId: string, userId: string, dto: RegisterDeviceDto) {
    const device = await this.prisma.deviceAgent.create({
      data: {
        tenantId,
        name: dto.name,
        clientId: dto.clientId,
        capabilities: dto.capabilities,
        userAgent: dto.userAgent,
        version: dto.version,
        status: 'ONLINE',
        lastSeenAt: new Date(),
      },
    });

    await this.auditService.log({
      tenantId,
      userId,
      action: 'DEVICE_REGISTER',
      entityType: 'DEVICE_AGENT',
      entityId: device.id,
      metadata: { name: device.name },
    });

    return device;
  }

  async heartbeat(tenantId: string, deviceId: string, dto: HeartbeatDto) {
    const existing = await this.prisma.deviceAgent.findFirst({
      where: { id: deviceId, tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Device not found');
    }

    const device = await this.prisma.deviceAgent.update({
      where: { id: deviceId },
      data: {
        status: 'ONLINE',
        lastSeenAt: new Date(),
        clientId: dto.clientId !== undefined ? dto.clientId : undefined,
        capabilities: dto.capabilities !== undefined ? dto.capabilities : undefined,
        userAgent: dto.userAgent !== undefined ? dto.userAgent : undefined,
        version: dto.version !== undefined ? dto.version : undefined,
      },
      include: {
        client: {
          select: { id: true, name: true },
        },
      },
    });

    return device;
  }

  async update(tenantId: string, userId: string, deviceId: string, dto: UpdateDeviceDto) {
    const existing = await this.prisma.deviceAgent.findFirst({
      where: { id: deviceId, tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Device not found');
    }

    const device = await this.prisma.deviceAgent.update({
      where: { id: deviceId },
      data: {
        name: dto.name,
        clientId: dto.clientId,
        capabilities: dto.capabilities,
      },
      include: {
        client: {
          select: { id: true, name: true },
        },
      },
    });

    await this.auditService.log({
      tenantId,
      userId,
      action: 'DEVICE_UPDATE',
      entityType: 'DEVICE_AGENT',
      entityId: device.id,
      metadata: { name: device.name },
    });

    return device;
  }

  async delete(tenantId: string, userId: string, deviceId: string) {
    const existing = await this.prisma.deviceAgent.findFirst({
      where: { id: deviceId, tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Device not found');
    }

    await this.prisma.deviceAgent.delete({
      where: { id: deviceId },
    });

    await this.auditService.log({
      tenantId,
      userId,
      action: 'DEVICE_DELETE',
      entityType: 'DEVICE_AGENT',
      entityId: deviceId,
      metadata: { name: existing.name },
    });

    return { success: true };
  }

  private computeStatus(lastSeenAt: Date | null): 'ONLINE' | 'OFFLINE' {
    if (!lastSeenAt) return 'OFFLINE';
    const now = Date.now();
    const lastSeen = new Date(lastSeenAt).getTime();
    return now - lastSeen < OFFLINE_THRESHOLD_MS ? 'ONLINE' : 'OFFLINE';
  }
}
