import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { ReportStatus, ReportType } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, userId: string, dto: CreateReportDto) {
    return this.prisma.report.create({
      data: {
        title: dto.title,
        type: dto.type as ReportType,
        leadId: dto.leadId,
        tenantId,
        createdById: userId,
      },
      include: {
        lead: true,
      },
    });
  }

  async findByTenant(
    tenantId: string,
    options?: { status?: ReportStatus; leadId?: string; limit?: number; offset?: number },
  ) {
    const where: any = { tenantId };
    if (options?.status) {
      where.status = options.status;
    }
    if (options?.leadId) {
      where.leadId = options.leadId;
    }

    return this.prisma.report.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
      include: {
        lead: {
          select: {
            id: true,
            companyName: true,
          },
        },
      },
    });
  }

  async findById(id: string, tenantId: string) {
    const report = await this.prisma.report.findUnique({
      where: { id },
      include: {
        lead: true,
      },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    if (report.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied');
    }

    return report;
  }

  async update(id: string, tenantId: string, dto: UpdateReportDto) {
    const report = await this.findById(id, tenantId);

    const data: any = { ...dto };
    if (dto.status === 'COMPLETED') {
      data.completedAt = new Date();
    }

    return this.prisma.report.update({
      where: { id: report.id },
      data,
      include: {
        lead: true,
      },
    });
  }

  async delete(id: string, tenantId: string) {
    const report = await this.findById(id, tenantId);

    return this.prisma.report.delete({
      where: { id: report.id },
    });
  }

  async generateReport(id: string, tenantId: string) {
    const report = await this.findById(id, tenantId);

    // Update status to GENERATING
    await this.prisma.report.update({
      where: { id: report.id },
      data: { status: 'GENERATING' },
    });

    // In a real implementation, this would trigger an async job
    // For now, we'll simulate report generation with mock content
    const mockContent = {
      generatedAt: new Date().toISOString(),
      sections: [
        {
          title: 'ملخص تنفيذي',
          content: 'تحليل شامل للعميل المحتمل بناءً على البيانات المتاحة.',
        },
        {
          title: 'معلومات الشركة',
          content: report.lead ? `شركة ${report.lead.companyName}` : 'غير محدد',
        },
        {
          title: 'التوصيات',
          content: 'يُنصح بالتواصل المباشر مع العميل لتقديم عرض مخصص.',
        },
      ],
    };

    // Update with generated content
    return this.prisma.report.update({
      where: { id: report.id },
      data: {
        status: 'COMPLETED',
        content: mockContent,
        completedAt: new Date(),
      },
      include: {
        lead: true,
      },
    });
  }

  async count(tenantId: string, status?: ReportStatus) {
    const where: any = { tenantId };
    if (status) {
      where.status = status;
    }

    return this.prisma.report.count({ where });
  }
}
