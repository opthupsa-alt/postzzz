import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { JobStatus } from '@prisma/client';

export interface CreateJobDto {
  type: string;
  input?: any;
}

@Injectable()
export class JobsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async create(tenantId: string, userId: string, dto: CreateJobDto) {
    const job = await this.prisma.job.create({
      data: {
        tenantId,
        createdById: userId,
        type: dto.type,
        status: 'PENDING',
        progress: 0,
        input: dto.input || {},
      },
    });

    await this.auditService.log({
      tenantId,
      userId,
      action: 'JOB_CREATE',
      entityType: 'JOB',
      entityId: job.id,
      metadata: { type: dto.type },
    });

    return job;
  }

  async findById(jobId: string, tenantId: string) {
    const job = await this.prisma.job.findFirst({
      where: { id: jobId, tenantId },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { evidence: true, jobLogs: true },
        },
      },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    return job;
  }

  async findByTenant(tenantId: string, options?: { status?: JobStatus; limit?: number }) {
    return this.prisma.job.findMany({
      where: {
        tenantId,
        ...(options?.status && { status: options.status }),
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
      include: {
        createdBy: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async cancel(jobId: string, tenantId: string, userId: string) {
    const job = await this.prisma.job.findFirst({
      where: { id: jobId, tenantId },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (!['PENDING', 'RUNNING'].includes(job.status)) {
      throw new BadRequestException('Can only cancel pending or running jobs');
    }

    const updated = await this.prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'CANCELLED',
        completedAt: new Date(),
      },
    });

    await this.auditService.log({
      tenantId,
      userId,
      action: 'JOB_CANCEL',
      entityType: 'JOB',
      entityId: jobId,
    });

    return updated;
  }

  async getLogs(jobId: string, tenantId: string) {
    const job = await this.prisma.job.findFirst({
      where: { id: jobId, tenantId },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    return this.prisma.jobLog.findMany({
      where: { jobId },
      orderBy: { createdAt: 'asc' },
    });
  }

  // Agent methods
  async assignToAgent(jobId: string, agentId: string) {
    return this.prisma.job.update({
      where: { id: jobId },
      data: {
        assignedAgentId: agentId,
        status: 'RUNNING',
        startedAt: new Date(),
      },
    });
  }

  async updateProgress(jobId: string, progress: number, message?: string) {
    const job = await this.prisma.job.update({
      where: { id: jobId },
      data: { progress },
    });

    if (message) {
      await this.prisma.jobLog.create({
        data: {
          jobId,
          level: 'INFO',
          message,
        },
      });
    }

    return job;
  }

  async addEvidence(
    jobId: string,
    tenantId: string,
    evidence: {
      type: string;
      title: string;
      source: string;
      url?: string;
      snippet: string;
      confidence: string;
      hash: string;
      sizeBytes: number;
    },
  ) {
    // Verify job exists and belongs to tenant
    const job = await this.prisma.job.findFirst({
      where: { id: jobId, tenantId },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    return this.prisma.evidence.create({
      data: {
        jobId,
        type: evidence.type,
        title: evidence.title,
        source: evidence.source,
        url: evidence.url,
        snippet: evidence.snippet,
        confidence: evidence.confidence,
        hash: evidence.hash,
        sizeBytes: evidence.sizeBytes,
        collectedAt: new Date(),
      },
    });
  }

  async markError(jobId: string, errorCode: string, errorMessage: string, needsUserAction: boolean = false) {
    const job = await this.prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        errorCode,
        needsUserAction,
        completedAt: new Date(),
        error: { code: errorCode, message: errorMessage },
      },
    });

    await this.prisma.jobLog.create({
      data: {
        jobId,
        level: 'ERROR',
        message: errorMessage,
        metadata: { errorCode },
      },
    });

    return job;
  }

  async markDone(jobId: string, output?: any) {
    return this.prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'COMPLETED',
        progress: 100,
        completedAt: new Date(),
        output: output || {},
      },
    });
  }

  async updateStatus(jobId: string, tenantId: string, status: JobStatus) {
    const job = await this.prisma.job.findFirst({
      where: { id: jobId, tenantId },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    return this.prisma.job.update({
      where: { id: jobId },
      data: {
        status,
        ...(status === 'RUNNING' ? { startedAt: new Date() } : {}),
        ...(status === 'COMPLETED' || status === 'FAILED' || status === 'CANCELLED' 
          ? { completedAt: new Date() } 
          : {}),
      },
    });
  }

  async getPendingJobs(limit: number = 10) {
    return this.prisma.job.findMany({
      where: {
        status: 'PENDING',
        assignedAgentId: null,
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
      include: {
        tenant: true,
      },
    });
  }
}
