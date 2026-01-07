import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { LeadStatus } from '@prisma/client';

@Injectable()
export class LeadsService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, userId: string, dto: CreateLeadDto) {
    return this.prisma.lead.create({
      data: {
        ...dto,
        status: (dto.status as LeadStatus) || LeadStatus.NEW,
        tenantId,
        createdById: userId,
      },
    });
  }

  async bulkCreate(tenantId: string, userId: string, leads: CreateLeadDto[]) {
    const data = leads.map((dto) => ({
      ...dto,
      status: (dto.status as LeadStatus) || LeadStatus.NEW,
      tenantId,
      createdById: userId,
    }));

    return this.prisma.lead.createMany({
      data,
      skipDuplicates: true,
    });
  }

  async findByTenant(
    tenantId: string,
    options?: { status?: LeadStatus; limit?: number; offset?: number },
  ) {
    const where: any = { tenantId };
    if (options?.status) {
      where.status = options.status;
    }

    return this.prisma.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 100,
      skip: options?.offset || 0,
    });
  }

  async findById(id: string, tenantId: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    if (lead.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied');
    }

    return lead;
  }

  async update(id: string, tenantId: string, dto: UpdateLeadDto) {
    const lead = await this.findById(id, tenantId);

    return this.prisma.lead.update({
      where: { id: lead.id },
      data: {
        ...dto,
        status: dto.status as LeadStatus,
      },
    });
  }

  async delete(id: string, tenantId: string) {
    const lead = await this.findById(id, tenantId);

    return this.prisma.lead.delete({
      where: { id: lead.id },
    });
  }

  async count(tenantId: string, status?: LeadStatus) {
    const where: any = { tenantId };
    if (status) {
      where.status = status;
    }

    return this.prisma.lead.count({ where });
  }
}
