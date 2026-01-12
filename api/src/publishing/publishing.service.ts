import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PublishNotificationService } from './publish-notification.service';
import { ClaimJobsDto, StartJobDto, CompleteJobDto } from './dto';

@Injectable()
export class PublishingService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private notificationService: PublishNotificationService,
  ) {}

  // ==================== JOBS LISTING ====================

  async findJobs(tenantId: string, options?: {
    status?: string;
    clientId?: string;
    from?: string;
    to?: string;
  }) {
    const where: any = { tenantId };

    if (options?.status) {
      where.status = options.status;
    }

    if (options?.clientId) {
      where.clientId = options.clientId;
    }

    if (options?.from || options?.to) {
      where.scheduledAt = {};
      if (options?.from) {
        where.scheduledAt.gte = new Date(options.from);
      }
      if (options?.to) {
        where.scheduledAt.lte = new Date(options.to);
      }
    }

    const jobs = await this.prisma.publishingJob.findMany({
      where,
      orderBy: [{ priority: 'asc' }, { scheduledAt: 'asc' }],
      include: {
        post: {
          select: { id: true, title: true },
        },
        client: {
          select: { id: true, name: true, logoUrl: true },
        },
        lockedByDevice: {
          select: { id: true, name: true },
        },
        runs: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            status: true,
            startedAt: true,
            finishedAt: true,
            publishedUrl: true,
            proofScreenshotAssetId: true,
          },
        },
      },
    });

    return jobs.map(job => ({
      ...job,
      lastRun: job.runs[0] || null,
    }));
  }

  async findJobById(tenantId: string, jobId: string) {
    const job = await this.prisma.publishingJob.findFirst({
      where: { id: jobId, tenantId },
      include: {
        post: {
          include: {
            variants: true,
          },
        },
        client: {
          select: { id: true, name: true, logoUrl: true },
        },
        lockedByDevice: {
          select: { id: true, name: true },
        },
        runs: {
          orderBy: { createdAt: 'desc' },
          include: {
            device: {
              select: { id: true, name: true },
            },
            proofScreenshot: {
              select: { id: true, url: true },
            },
          },
        },
      },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    return job;
  }

  // ==================== CLAIM PROTOCOL ====================

  async claimJobs(tenantId: string, dto: ClaimJobsDto) {
    // Rate limiting: max 5 jobs per claim
    const MAX_CLAIM_LIMIT = 5;
    const limit = Math.min(dto.limit || 3, MAX_CLAIM_LIMIT);

    // Security: Verify device belongs to tenant
    const device = await this.prisma.deviceAgent.findFirst({
      where: { id: dto.deviceId, tenantId },
    });

    if (!device) {
      throw new NotFoundException('Device not found or does not belong to tenant');
    }

    // Check if device already has too many active jobs
    const activeJobsCount = await this.prisma.publishingJob.count({
      where: {
        lockedByDeviceId: dto.deviceId,
        status: { in: ['CLAIMED', 'RUNNING'] },
      },
    });

    if (activeJobsCount >= MAX_CLAIM_LIMIT) {
      return []; // Don't claim more if device already has max active jobs
    }

    const remainingSlots = MAX_CLAIM_LIMIT - activeJobsCount;
    const effectiveLimit = Math.min(limit, remainingSlots);

    if (effectiveLimit <= 0) {
      return [];
    }

    // Find QUEUED jobs that are ready to run (scheduledAt <= now)
    const now = new Date();
    
    // Atomic claim: update jobs where status=QUEUED
    const claimedJobs = await this.prisma.$transaction(async (tx) => {
      // Find eligible jobs
      const eligibleJobs = await tx.publishingJob.findMany({
        where: {
          tenantId,
          status: 'QUEUED',
          scheduledAt: { lte: now },
          // If device is bound to a client, only claim jobs for that client
          ...(device.clientId ? { clientId: device.clientId } : {}),
        },
        orderBy: [{ priority: 'asc' }, { scheduledAt: 'asc' }],
        take: effectiveLimit,
      });

      if (eligibleJobs.length === 0) {
        return [];
      }

      // Claim them atomically
      const jobIds = eligibleJobs.map(j => j.id);
      await tx.publishingJob.updateMany({
        where: {
          id: { in: jobIds },
          status: 'QUEUED', // Double-check status to prevent race
        },
        data: {
          status: 'CLAIMED',
          lockedByDeviceId: dto.deviceId,
          lockedAt: now,
        },
      });

      // Return claimed jobs with full data
      return tx.publishingJob.findMany({
        where: { id: { in: jobIds } },
        include: {
          post: {
            include: {
              variants: true,
            },
          },
          client: {
            select: { id: true, name: true },
            include: {
              platforms: {
                select: { platform: true, handle: true },
              },
            },
          },
        },
      });
    });

    return claimedJobs;
  }

  // ==================== JOB LIFECYCLE ====================

  async startJob(tenantId: string, jobId: string, dto: StartJobDto) {
    const job = await this.prisma.publishingJob.findFirst({
      where: { id: jobId, tenantId },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (job.status !== 'CLAIMED') {
      throw new BadRequestException('Job must be CLAIMED to start');
    }

    if (job.lockedByDeviceId !== dto.deviceId) {
      throw new ConflictException('Job is locked by another device');
    }

    // Update job status
    await this.prisma.publishingJob.update({
      where: { id: jobId },
      data: { status: 'RUNNING' },
    });

    // Create run record
    const run = await this.prisma.publishingRun.create({
      data: {
        tenantId,
        jobId,
        deviceId: dto.deviceId,
        status: 'RUNNING',
      },
    });

    // Update post status to PUBLISHING
    await this.prisma.post.update({
      where: { id: job.postId },
      data: { status: 'PUBLISHING' },
    });

    return { jobId, runId: run.id };
  }

  async completeJob(tenantId: string, jobId: string, dto: CompleteJobDto) {
    const job = await this.prisma.publishingJob.findFirst({
      where: { id: jobId, tenantId },
      include: {
        post: true,
      },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    // Idempotency: if job already completed, return success silently
    if (['SUCCEEDED', 'FAILED', 'CANCELLED'].includes(job.status)) {
      return { success: true, message: 'Job already completed', idempotent: true };
    }

    if (job.status !== 'RUNNING') {
      throw new BadRequestException('Job must be RUNNING to complete');
    }

    // Find the active run
    const activeRun = await this.prisma.publishingRun.findFirst({
      where: { jobId, status: 'RUNNING' },
      orderBy: { createdAt: 'desc' },
    });

    if (!activeRun) {
      throw new BadRequestException('No active run found');
    }

    // Update run
    await this.prisma.publishingRun.update({
      where: { id: activeRun.id },
      data: {
        status: dto.status === 'SUCCEEDED' ? 'SUCCEEDED' : dto.status === 'NEEDS_LOGIN' ? 'NEEDS_LOGIN' : 'FAILED',
        finishedAt: new Date(),
        logs: dto.logs,
        proofScreenshotAssetId: dto.proofScreenshotAssetId,
        publishedUrl: dto.publishedUrl,
        failureReason: dto.errorMessage,
      },
    });

    // Update job based on result
    if (dto.status === 'SUCCEEDED') {
      await this.prisma.publishingJob.update({
        where: { id: jobId },
        data: {
          status: 'SUCCEEDED',
          lockedByDeviceId: null,
          lockedAt: null,
        },
      });

      // Send WhatsApp notification for success
      this.notificationService.notifyPostPublishResult(
        job.postId,
        job.platform,
        'SUCCESS',
      ).catch(err => console.error('Notification error:', err));

      // Check if all jobs for this post are succeeded
      await this.updatePostStatusFromJobs(job.postId);
    } else if (dto.status === 'NEEDS_LOGIN') {
      await this.prisma.publishingJob.update({
        where: { id: jobId },
        data: {
          status: 'NEEDS_LOGIN',
          lastErrorCode: dto.errorCode,
          lastErrorMessage: dto.errorMessage,
        },
      });
    } else {
      // FAILED - check retry
      const newAttemptCount = job.attemptCount + 1;
      
      if (newAttemptCount < job.maxAttempts) {
        // Retry: back to QUEUED
        await this.prisma.publishingJob.update({
          where: { id: jobId },
          data: {
            status: 'QUEUED',
            attemptCount: newAttemptCount,
            lockedByDeviceId: null,
            lockedAt: null,
            lastErrorCode: dto.errorCode,
            lastErrorMessage: dto.errorMessage,
          },
        });
      } else {
        // Max retries exhausted
        await this.prisma.publishingJob.update({
          where: { id: jobId },
          data: {
            status: 'FAILED',
            attemptCount: newAttemptCount,
            lastErrorCode: dto.errorCode,
            lastErrorMessage: dto.errorMessage,
          },
        });

        // Send WhatsApp notification for failure
        this.notificationService.notifyPostPublishResult(
          job.postId,
          job.platform,
          'FAILED',
          dto.errorMessage,
        ).catch(err => console.error('Notification error:', err));

        // Update post status
        await this.updatePostStatusFromJobs(job.postId);
      }
    }

    return { success: true };
  }

  async cancelJob(tenantId: string, userId: string, jobId: string) {
    const job = await this.prisma.publishingJob.findFirst({
      where: { id: jobId, tenantId },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (['SUCCEEDED', 'CANCELLED'].includes(job.status)) {
      throw new BadRequestException('Cannot cancel job in current status');
    }

    await this.prisma.publishingJob.update({
      where: { id: jobId },
      data: {
        status: 'CANCELLED',
        lockedByDeviceId: null,
        lockedAt: null,
      },
    });

    await this.auditService.log({
      tenantId,
      userId,
      action: 'JOB_CANCEL',
      entityType: 'PUBLISHING_JOB',
      entityId: jobId,
      metadata: { postId: job.postId, platform: job.platform },
    });

    return { success: true };
  }

  // ==================== HELPER ====================

  private async updatePostStatusFromJobs(postId: string) {
    const jobs = await this.prisma.publishingJob.findMany({
      where: { postId },
    });

    if (jobs.length === 0) return;

    const allSucceeded = jobs.every(j => j.status === 'SUCCEEDED');
    const anyFailed = jobs.some(j => j.status === 'FAILED');
    const anyRunning = jobs.some(j => ['RUNNING', 'CLAIMED', 'QUEUED'].includes(j.status));

    let newStatus: string;
    if (allSucceeded) {
      newStatus = 'PUBLISHED';
    } else if (anyFailed && !anyRunning) {
      newStatus = 'FAILED';
    } else {
      return; // Still in progress
    }

    await this.prisma.post.update({
      where: { id: postId },
      data: { status: newStatus as any },
    });
  }

  // ==================== CREATE JOBS (called from PostsService) ====================

  async createJobsForPost(tenantId: string, postId: string, clientId: string, scheduledAt: Date) {
    // Get post variants
    const variants = await this.prisma.postVariant.findMany({
      where: { postId, tenantId },
    });

    if (variants.length === 0) {
      throw new BadRequestException('Post has no variants');
    }

    const jobs = [];
    for (const variant of variants) {
      // Generate idempotency key
      const idempotencyKey = `${postId}:${variant.platform}:${scheduledAt.toISOString()}`;

      // Upsert to ensure idempotency
      const job = await this.prisma.publishingJob.upsert({
        where: {
          tenantId_idempotencyKey: { tenantId, idempotencyKey },
        },
        update: {
          scheduledAt,
        },
        create: {
          tenantId,
          postId,
          clientId,
          platform: variant.platform,
          scheduledAt,
          idempotencyKey,
        },
      });
      jobs.push(job);
    }

    return jobs;
  }
}
