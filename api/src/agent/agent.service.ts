import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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
    private jobsService: JobsService,
    private auditService: AuditService,
  ) {}

  async getConfig() {
    return {
      version: '1.0.0',
      connectors: ['google_maps', 'web_search', 'website_crawl', 'social_public'],
      maxEvidenceSize: this.MAX_EVIDENCE_SIZE,
      heartbeatInterval: 30000, // 30 seconds
      errorCodes: Object.keys(ERROR_CODES),
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

    if (job.assignedAgentId !== agentId) {
      throw new BadRequestException('Job is not assigned to this agent');
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

    if (job.assignedAgentId !== agentId) {
      throw new BadRequestException('Job is not assigned to this agent');
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
}
