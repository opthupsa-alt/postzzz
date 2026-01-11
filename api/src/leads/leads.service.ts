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
    console.log('[LeadsService] Bulk creating leads:', leads.length);
    
    const data = leads.map((dto) => ({
      companyName: dto.companyName,
      industry: dto.industry || null,
      city: dto.city || null,
      address: dto.address || null,
      phone: dto.phone || null,
      email: dto.email || null,
      website: dto.website || null,
      source: dto.source || null,
      notes: dto.notes || null,
      jobId: dto.jobId || null,
      metadata: dto.metadata || undefined,
      status: (dto.status as LeadStatus) || LeadStatus.NEW,
      tenantId,
      createdById: userId,
    }));

    const result = await this.prisma.lead.createMany({
      data,
      skipDuplicates: true,
    });
    
    console.log('[LeadsService] Created leads:', result.count);
    return result;
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

  async getDashboardStats(tenantId: string) {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalLeads,
      leadsToday,
      leadsThisWeek,
      leadsThisMonth,
      leadsByStatus,
      recentLeads,
    ] = await Promise.all([
      this.prisma.lead.count({ where: { tenantId } }),
      this.prisma.lead.count({ where: { tenantId, createdAt: { gte: startOfToday } } }),
      this.prisma.lead.count({ where: { tenantId, createdAt: { gte: startOfWeek } } }),
      this.prisma.lead.count({ where: { tenantId, createdAt: { gte: startOfMonth } } }),
      this.prisma.lead.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { status: true },
      }),
      this.prisma.lead.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          companyName: true,
          status: true,
          city: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      totalLeads,
      leadsToday,
      leadsThisWeek,
      leadsThisMonth,
      byStatus: leadsByStatus.map((s) => ({
        status: s.status,
        count: s._count.status,
      })),
      recentLeads,
    };
  }

  /**
   * إثراء الـ Lead ببيانات البحث من الإكستنشن
   */
  async enrichWithSearchData(
    id: string,
    tenantId: string,
    searchData: {
      socialLinks?: Record<string, string>;
      socialProfiles?: Record<string, any>;
      email?: string;
      allEmails?: string[];
      allPhones?: string[];
      website?: string;
      description?: string;
      googleMapsUrl?: string;
      reviewCount?: number;
    },
  ) {
    const lead = await this.findById(id, tenantId);
    const existingMetadata = (lead.metadata as any) || {};

    const updatedMetadata = {
      ...existingMetadata,
      socialLinks: {
        ...(existingMetadata.socialLinks || {}),
        ...(searchData.socialLinks || {}),
      },
      socialProfiles: {
        ...(existingMetadata.socialProfiles || {}),
        ...(searchData.socialProfiles || {}),
      },
      email: searchData.email || existingMetadata.email,
      allEmails: [...new Set([
        ...(existingMetadata.allEmails || []),
        ...(searchData.allEmails || []),
      ])],
      allPhones: [...new Set([
        ...(existingMetadata.allPhones || []),
        ...(searchData.allPhones || []),
      ])],
      description: searchData.description || existingMetadata.description,
      googleMapsUrl: searchData.googleMapsUrl || existingMetadata.googleMapsUrl,
      reviewCount: searchData.reviewCount || existingMetadata.reviewCount,
      enrichedAt: new Date().toISOString(),
    };

    return this.prisma.lead.update({
      where: { id: lead.id },
      data: {
        email: searchData.email || lead.email,
        website: searchData.website || lead.website,
        metadata: updatedMetadata,
      },
    });
  }
}
