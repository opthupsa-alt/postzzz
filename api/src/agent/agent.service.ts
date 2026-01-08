import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JobsService } from '../jobs/jobs.service';
import { AuditService } from '../audit/audit.service';
import * as crypto from 'crypto';

export const ERROR_CODES = {
  LOGIN_REQUIRED_UNSUPPORTED: 'LOGIN_REQUIRED_UNSUPPORTED',
  RATE_LIMITED: 'RATE_LIMITED',
  BLOCKED: 'BLOCKED',
  NOT_FOUND: 'NOT_FOUND',
  PROFILE_PRIVATE: 'PROFILE_PRIVATE',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  UNKNOWN: 'UNKNOWN',
} as const;

export interface EvidenceInput {
  type: string;
  title: string;
  source: string;
  url?: string;
  snippet: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

@Injectable()
export class AgentService {
  private readonly MAX_EVIDENCE_SIZE = 10 * 1024; // 10KB

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => JobsService))
    private jobsService: JobsService,
    private auditService: AuditService,
  ) {}

  async getConfig() {
    // Get platform settings
    let settings = await this.prisma.platformSettings.findUnique({
      where: { id: 'default' },
    });

    if (!settings) {
      settings = await this.prisma.platformSettings.create({
        data: { id: 'default' },
      });
    }

    return {
      version: '1.0.0',
      connectors: ['google_maps', 'web_search', 'website_crawl', 'social_public'],
      maxEvidenceSize: this.MAX_EVIDENCE_SIZE,
      heartbeatInterval: 30000, // 30 seconds
      errorCodes: Object.keys(ERROR_CODES),
      // Platform settings for extension
      platform: {
        platformUrl: settings.platformUrl,
        apiUrl: settings.apiUrl,
        extensionAutoLogin: settings.extensionAutoLogin,
        extensionDebugMode: settings.extensionDebugMode,
        searchMethod: settings.searchMethod,
        searchRateLimit: settings.searchRateLimit,
        crawlRateLimit: settings.crawlRateLimit,
        maxSearchResults: settings.maxSearchResults,
        defaultCountry: settings.defaultCountry,
      },
    };
  }

  async heartbeat(agentId: string) {
    // Update agent last seen (could be stored in Redis for production)
    return {
      ok: true,
      timestamp: new Date().toISOString(),
      pendingJobs: await this.jobsService.getPendingJobs(5),
    };
  }

  async ackJob(jobId: string, agentId: string) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (job.status !== 'PENDING') {
      throw new BadRequestException('Job is not pending');
    }

    if (job.assignedAgentId && job.assignedAgentId !== agentId) {
      throw new BadRequestException('Job is assigned to another agent');
    }

    const updated = await this.jobsService.assignToAgent(jobId, agentId);

    await this.auditService.log({
      tenantId: job.tenantId,
      action: 'JOB_ACK',
      entityType: 'JOB',
      entityId: jobId,
      metadata: { agentId },
    });

    return updated;
  }

  async updateProgress(jobId: string, agentId: string, progress: number, message?: string) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    // Allow progress update if agent matches OR if job was never assigned
    if (job.assignedAgentId && job.assignedAgentId !== agentId) {
      throw new BadRequestException('Job is not assigned to this agent');
    }

    // If job wasn't assigned yet, assign it now
    if (!job.assignedAgentId) {
      await this.prisma.job.update({
        where: { id: jobId },
        data: { 
          assignedAgentId: agentId,
          status: 'RUNNING',
          startedAt: new Date(),
        },
      });
    }

    return this.jobsService.updateProgress(jobId, progress, message);
  }

  async submitEvidence(jobId: string, agentId: string, evidenceList: EvidenceInput[]) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (job.assignedAgentId !== agentId) {
      throw new BadRequestException('Job is not assigned to this agent');
    }

    const results = [];

    for (const evidence of evidenceList) {
      // Sanitize and redact PII
      const sanitizedSnippet = this.sanitizeAndRedactPII(evidence.snippet);

      // Check size
      const sizeBytes = Buffer.byteLength(sanitizedSnippet, 'utf8');
      if (sizeBytes > this.MAX_EVIDENCE_SIZE) {
        continue; // Skip oversized evidence
      }

      // Generate hash for deduplication
      const hash = crypto.createHash('sha256').update(sanitizedSnippet).digest('hex');

      const created = await this.jobsService.addEvidence(jobId, job.tenantId, {
        type: evidence.type,
        title: evidence.title,
        source: evidence.source,
        url: evidence.url,
        snippet: sanitizedSnippet,
        confidence: evidence.confidence,
        hash,
        sizeBytes,
      });

      results.push(created);
    }

    return { count: results.length, evidence: results };
  }

  async reportError(
    jobId: string,
    agentId: string,
    errorCode: string,
    errorMessage: string,
    needsUserAction: boolean = false,
  ) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (job.assignedAgentId !== agentId) {
      throw new BadRequestException('Job is not assigned to this agent');
    }

    // Validate error code
    if (!Object.values(ERROR_CODES).includes(errorCode as any)) {
      errorCode = ERROR_CODES.UNKNOWN;
    }

    const updated = await this.jobsService.markError(jobId, errorCode, errorMessage, needsUserAction);

    await this.auditService.log({
      tenantId: job.tenantId,
      action: 'JOB_ERROR',
      entityType: 'JOB',
      entityId: jobId,
      metadata: { errorCode, needsUserAction },
    });

    return updated;
  }

  async markDone(jobId: string, agentId: string, output?: Record<string, unknown>) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    // Allow completion if agent matches OR if job was never assigned (for flexibility)
    if (job.assignedAgentId && job.assignedAgentId !== agentId) {
      throw new BadRequestException('Job is not assigned to this agent');
    }

    // If job wasn't assigned yet, assign it now before completing
    if (!job.assignedAgentId) {
      await this.prisma.job.update({
        where: { id: jobId },
        data: { assignedAgentId: agentId },
      });
    }

    const updated = await this.jobsService.markDone(jobId, output);

    await this.auditService.log({
      tenantId: job.tenantId,
      action: 'JOB_DONE',
      entityType: 'JOB',
      entityId: jobId,
    });

    return updated;
  }

  private sanitizeAndRedactPII(text: string): string {
    // Basic PII redaction patterns
    let sanitized = text;

    // Email addresses
    sanitized = sanitized.replace(
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      '[EMAIL_REDACTED]',
    );

    // Phone numbers (various formats)
    sanitized = sanitized.replace(
      /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
      '[PHONE_REDACTED]',
    );

    // Saudi phone numbers
    sanitized = sanitized.replace(
      /(\+?966|0)?5\d{8}/g,
      '[PHONE_REDACTED]',
    );

    // Credit card numbers (basic pattern)
    sanitized = sanitized.replace(
      /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
      '[CARD_REDACTED]',
    );

    // National IDs (Saudi format)
    sanitized = sanitized.replace(
      /\b[12]\d{9}\b/g,
      '[ID_REDACTED]',
    );

    return sanitized;
  }

  async getPendingJobs(authHeader: string) {
    // Extract token and decode to get tenantId
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { jobs: [] };
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    try {
      // Decode JWT to get tenantId (simple decode, not verify - verification done by guard)
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      const tenantId = payload.tenantId;
      
      if (!tenantId) {
        return { jobs: [] };
      }
      
      // Get pending jobs for this tenant
      const jobs = await this.prisma.job.findMany({
        where: {
          tenantId,
          status: 'PENDING',
        },
        orderBy: { createdAt: 'asc' },
        take: 10,
      });
      
      return {
        jobs: jobs.map(job => ({
          jobId: job.id,
          type: job.type,
          context: job.input,
          tenantId: job.tenantId,
          createdAt: job.createdAt,
        })),
      };
    } catch (e) {
      console.error('Failed to decode token:', e);
      return { jobs: [] };
    }
  }
}
