import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

// Thresholds in minutes
const CLAIMED_TIMEOUT_MINUTES = 5;
const RUNNING_TIMEOUT_MINUTES = 10;
const RECOVERY_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

@Injectable()
export class JobRecoveryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobRecoveryService.name);
  private recoveryInterval: NodeJS.Timeout | null = null;

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  onModuleInit() {
    this.startRecoveryInterval();
  }

  onModuleDestroy() {
    this.stopRecoveryInterval();
  }

  private startRecoveryInterval() {
    this.logger.log('Starting job recovery interval...');
    this.recoveryInterval = setInterval(() => {
      this.recoverStuckJobs().catch(err => {
        this.logger.error('Recovery failed:', err);
      });
    }, RECOVERY_INTERVAL_MS);
  }

  private stopRecoveryInterval() {
    if (this.recoveryInterval) {
      clearInterval(this.recoveryInterval);
      this.recoveryInterval = null;
    }
  }

  /**
   * Run every 2 minutes to recover stuck jobs
   */
  async recoverStuckJobs() {
    this.logger.log('Running stuck job recovery...');
    
    await this.recoverClaimedJobs();
    await this.recoverRunningJobs();
    await this.updatePostStatuses();
  }

  /**
   * Recover CLAIMED jobs that have been locked too long
   */
  private async recoverClaimedJobs() {
    const threshold = new Date(Date.now() - CLAIMED_TIMEOUT_MINUTES * 60 * 1000);

    const stuckJobs = await this.prisma.publishingJob.findMany({
      where: {
        status: 'CLAIMED',
        lockedAt: { lt: threshold },
      },
    });

    for (const job of stuckJobs) {
      const newAttemptCount = job.attemptCount + 1;
      
      if (newAttemptCount < job.maxAttempts) {
        // Back to QUEUED for retry
        await this.prisma.publishingJob.update({
          where: { id: job.id },
          data: {
            status: 'QUEUED',
            lockedByDeviceId: null,
            lockedAt: null,
            attemptCount: newAttemptCount,
            lastErrorMessage: `Recovered from stuck CLAIMED state (attempt ${newAttemptCount})`,
          },
        });

        this.logger.warn(`Recovered CLAIMED job ${job.id} -> QUEUED (attempt ${newAttemptCount})`);
      } else {
        // Max attempts reached -> FAILED
        await this.prisma.publishingJob.update({
          where: { id: job.id },
          data: {
            status: 'FAILED',
            lockedByDeviceId: null,
            lockedAt: null,
            attemptCount: newAttemptCount,
            lastErrorCode: 'STUCK_CLAIMED',
            lastErrorMessage: `Job stuck in CLAIMED state, max attempts (${job.maxAttempts}) reached`,
          },
        });

        this.logger.error(`Job ${job.id} FAILED after stuck in CLAIMED`);
      }

      // Audit log
      await this.auditService.log({
        tenantId: job.tenantId,
        userId: undefined,
        action: 'JOB_STUCK_RECOVERY',
        entityType: 'PUBLISHING_JOB',
        entityId: job.id,
        metadata: {
          previousStatus: 'CLAIMED',
          newStatus: newAttemptCount < job.maxAttempts ? 'QUEUED' : 'FAILED',
          attemptCount: newAttemptCount,
          reason: 'Timeout recovery',
        },
      });
    }

    if (stuckJobs.length > 0) {
      this.logger.log(`Recovered ${stuckJobs.length} stuck CLAIMED jobs`);
    }
  }

  /**
   * Recover RUNNING jobs that have been running too long
   */
  private async recoverRunningJobs() {
    const threshold = new Date(Date.now() - RUNNING_TIMEOUT_MINUTES * 60 * 1000);

    const stuckJobs = await this.prisma.publishingJob.findMany({
      where: {
        status: 'RUNNING',
        updatedAt: { lt: threshold },
      },
    });

    for (const job of stuckJobs) {
      const newAttemptCount = job.attemptCount + 1;

      // Mark any active run as FAILED
      await this.prisma.publishingRun.updateMany({
        where: {
          jobId: job.id,
          status: 'RUNNING',
        },
        data: {
          status: 'FAILED',
          finishedAt: new Date(),
          failureReason: 'Timeout - job stuck in RUNNING state',
        },
      });

      if (newAttemptCount < job.maxAttempts) {
        // Back to QUEUED for retry
        await this.prisma.publishingJob.update({
          where: { id: job.id },
          data: {
            status: 'QUEUED',
            lockedByDeviceId: null,
            lockedAt: null,
            attemptCount: newAttemptCount,
            lastErrorCode: 'TIMEOUT',
            lastErrorMessage: `Recovered from stuck RUNNING state (attempt ${newAttemptCount})`,
          },
        });

        this.logger.warn(`Recovered RUNNING job ${job.id} -> QUEUED (attempt ${newAttemptCount})`);
      } else {
        // Max attempts reached -> FAILED
        await this.prisma.publishingJob.update({
          where: { id: job.id },
          data: {
            status: 'FAILED',
            lockedByDeviceId: null,
            lockedAt: null,
            attemptCount: newAttemptCount,
            lastErrorCode: 'STUCK_RUNNING',
            lastErrorMessage: `Job stuck in RUNNING state, max attempts (${job.maxAttempts}) reached`,
          },
        });

        this.logger.error(`Job ${job.id} FAILED after stuck in RUNNING`);
      }

      // Audit log
      await this.auditService.log({
        tenantId: job.tenantId,
        userId: undefined,
        action: 'JOB_STUCK_RECOVERY',
        entityType: 'PUBLISHING_JOB',
        entityId: job.id,
        metadata: {
          previousStatus: 'RUNNING',
          newStatus: newAttemptCount < job.maxAttempts ? 'QUEUED' : 'FAILED',
          attemptCount: newAttemptCount,
          reason: 'Timeout recovery',
        },
      });
    }

    if (stuckJobs.length > 0) {
      this.logger.log(`Recovered ${stuckJobs.length} stuck RUNNING jobs`);
    }
  }

  /**
   * Update Post statuses based on their jobs
   */
  private async updatePostStatuses() {
    // Find posts with status PUBLISHING or SCHEDULED that may need update
    const posts = await this.prisma.post.findMany({
      where: {
        status: { in: ['PUBLISHING', 'SCHEDULED'] },
      },
      include: {
        publishingJobs: true,
      },
    });

    for (const post of posts) {
      if (post.publishingJobs.length === 0) continue;

      const jobs = post.publishingJobs;
      const allSucceeded = jobs.every(j => j.status === 'SUCCEEDED');
      const anyFailed = jobs.some(j => j.status === 'FAILED');
      const anyRunning = jobs.some(j => ['RUNNING', 'CLAIMED'].includes(j.status));
      const anyQueued = jobs.some(j => j.status === 'QUEUED');
      const anyNeedsLogin = jobs.some(j => j.status === 'NEEDS_LOGIN');

      let newStatus: string | null = null;

      if (allSucceeded) {
        newStatus = 'PUBLISHED';
      } else if (anyFailed && !anyRunning && !anyQueued) {
        newStatus = 'FAILED';
      } else if (anyRunning) {
        newStatus = 'PUBLISHING';
      } else if (anyNeedsLogin && !anyRunning && !anyQueued) {
        // Keep as SCHEDULED but could add a flag/warning
        newStatus = 'SCHEDULED';
      }

      if (newStatus && newStatus !== post.status) {
        await this.prisma.post.update({
          where: { id: post.id },
          data: { status: newStatus as any },
        });

        this.logger.log(`Updated post ${post.id} status: ${post.status} -> ${newStatus}`);
      }
    }
  }

  /**
   * Manual trigger for recovery (can be called from controller)
   */
  async triggerRecovery() {
    await this.recoverStuckJobs();
    return { success: true, message: 'Recovery triggered' };
  }
}
