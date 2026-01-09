import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AIProviderService } from '../ai-provider/ai-provider.service';
import { PromptTemplateService } from '../ai-provider/prompt-template.service';
import { CreateSurveyDto } from './dto/create-survey.dto';
import { SurveyReportData } from './dto/survey-response.dto';

@Injectable()
export class SurveyService {
  private readonly logger = new Logger(SurveyService.name);

  constructor(
    private prisma: PrismaService,
    private aiProvider: AIProviderService,
    private promptTemplate: PromptTemplateService,
  ) {}

  /**
   * Create a new survey report for a lead
   */
  async createSurvey(
    userId: string,
    tenantId: string,
    dto: CreateSurveyDto,
  ): Promise<{ reportId: string; message: string }> {
    // Get the lead
    const lead = await this.prisma.lead.findFirst({
      where: {
        id: dto.leadId,
        tenantId,
      },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    // Check if there's already a pending/generating report for this lead
    const existingReport = await (this.prisma as any).report.findFirst({
      where: {
        leadId: dto.leadId,
        type: 'AI_EBI_SURVEY',
        status: { in: ['PENDING', 'GENERATING'] },
      },
    });

    if (existingReport) {
      return {
        reportId: existingReport.id,
        message: 'تقرير قيد الإنشاء بالفعل',
      };
    }

    // Create the report with PENDING status
    const report = await (this.prisma as any).report.create({
      data: {
        tenantId,
        leadId: dto.leadId,
        type: 'AI_EBI_SURVEY',
        status: 'PENDING',
        title: `تقرير AI EBI - ${lead.companyName}`,
        createdById: userId,
      },
    });

    // Start processing in background (non-blocking)
    this.processReport(report.id, lead, userId, tenantId, dto).catch((error) => {
      this.logger.error(`Failed to process report ${report.id}: ${error.message}`);
    });

    return {
      reportId: report.id,
      message: 'بدأ إنشاء التقرير. ستتلقى إشعاراً عند الاكتمال.',
    };
  }

  /**
   * Process the survey report (runs in background)
   */
  private async processReport(
    reportId: string,
    lead: any,
    userId: string,
    tenantId: string,
    dto: CreateSurveyDto,
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Update status to GENERATING
      await (this.prisma as any).report.update({
        where: { id: reportId },
        data: { status: 'GENERATING' },
      });

      // Get AI settings
      const aiSettings = await this.aiProvider.getSettings();
      if (!aiSettings) {
        throw new Error('AI settings not configured');
      }

      // Build prompt variables from lead
      const variables = this.promptTemplate.buildVariablesFromLead(lead);
      
      // Add optional fields from DTO
      if (dto.goalHint) {
        variables.GOAL_HINT = dto.goalHint;
      }
      if (dto.extraConstraints) {
        variables.EXTRA_CONSTRAINTS = dto.extraConstraints;
      }

      // Get prompts (from settings or defaults)
      const systemPrompt = aiSettings.systemPrompt || this.promptTemplate.getDefaultSystemPrompt();
      const userPromptTemplate = aiSettings.userPromptTemplate || this.promptTemplate.getDefaultUserPromptTemplate();

      // Replace variables in user prompt
      const userPrompt = this.promptTemplate.replaceVariables(userPromptTemplate, variables);

      // Call AI provider
      const response = await this.aiProvider.complete({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        maxTokens: aiSettings.maxTokens,
        temperature: aiSettings.temperature,
      });

      const processingTime = Date.now() - startTime;

      // Parse the response
      const parsedReport = this.parseAIResponse(response.content);

      // Update report with results
      await (this.prisma as any).report.update({
        where: { id: reportId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          aiProvider: aiSettings.provider,
          aiModel: aiSettings.modelName,
          promptTokens: response.promptTokens,
          completionTokens: response.completionTokens,
          totalTokens: response.totalTokens,
          processingTimeMs: processingTime,
          rawResponse: response.content,
          content: parsedReport,
          executiveSummary: parsedReport.executiveSummary,
          identityAnchors: parsedReport.identityAnchors,
          digitalFootprint: parsedReport.digitalFootprint,
          gapAnalysis: parsedReport.gapAnalysis,
          priorities: parsedReport.priorities,
          serviceMapping: parsedReport.serviceMapping,
          packages: parsedReport.packages,
          competitors: parsedReport.competitors,
          salesEnablement: parsedReport.salesEnablement,
          crmCard: parsedReport.crmCard,
        },
      });

      // Record usage
      await (this.prisma as any).surveyUsage.create({
        data: {
          tenantId,
          userId,
          reportId,
          tokensUsed: response.totalTokens,
          estimatedCost: response.totalTokens * 0.00003, // Approximate cost
          processingTimeMs: processingTime,
        },
      });

      // Update usage counter
      const period = new Date().toISOString().slice(0, 7); // YYYY-MM
      await this.prisma.usageCounter.upsert({
        where: {
          tenantId_metric_period: {
            tenantId,
            metric: 'SURVEYS' as any,
            period,
          },
        },
        update: {
          value: { increment: 1 },
        },
        create: {
          tenantId,
          metric: 'SURVEYS' as any,
          period,
          value: 1,
        },
      });

      this.logger.log(`Report ${reportId} completed in ${processingTime}ms`);

      // TODO: Send notification to user

    } catch (error) {
      this.logger.error(`Report ${reportId} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);

      await (this.prisma as any).report.update({
        where: { id: reportId },
        data: {
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'Unknown error',
          processingTimeMs: Date.now() - startTime,
        },
      });
    }
  }

  /**
   * Parse AI response into structured data
   */
  private parseAIResponse(content: string): SurveyReportData {
    // For now, return a basic structure with the raw content
    // TODO: Implement proper parsing based on the AI response format
    
    return {
      executiveSummary: {
        points: this.extractSection(content, 'ملخص تنفيذي'),
        confidenceLevel: 'MEDIUM',
      },
      identityAnchors: {
        confirmedIdentifiers: [],
        lookAlikes: [],
        confidenceLevel: 'MEDIUM',
        confidenceReason: 'تم التحليل بناءً على البيانات المتاحة',
      },
      digitalFootprint: [],
      gapAnalysis: [],
      priorities: [],
      serviceMapping: [],
      packages: [],
      competitors: [],
      salesEnablement: {
        discoveryQuestions: [],
        callScript: '',
        objections: [],
        nextBestAction: '',
      },
      crmCard: {
        companyName: '',
        industry: '',
        city: '',
        country: 'السعودية',
        socialLinks: {},
        qualificationScore: 0,
        priority: 'MEDIUM',
        recommendedServices: [],
        notes: content.substring(0, 500),
      },
    };
  }

  /**
   * Extract a section from the AI response
   */
  private extractSection(content: string, sectionTitle: string): string[] {
    // Simple extraction - look for the section and extract bullet points
    const lines = content.split('\n');
    const points: string[] = [];
    let inSection = false;

    for (const line of lines) {
      if (line.includes(sectionTitle)) {
        inSection = true;
        continue;
      }
      if (inSection) {
        if (line.startsWith('#') || line.startsWith('===')) {
          break; // Next section
        }
        const trimmed = line.trim();
        if (trimmed.startsWith('-') || trimmed.startsWith('•') || trimmed.match(/^\d+\)/)) {
          points.push(trimmed.replace(/^[-•\d)]\s*/, ''));
        }
      }
    }

    return points.slice(0, 10); // Max 10 points
  }

  /**
   * Get a survey report by ID
   */
  async getReport(reportId: string, tenantId: string) {
    const report = await (this.prisma as any).report.findFirst({
      where: {
        id: reportId,
        tenantId,
        type: 'AI_EBI_SURVEY',
      },
      include: {
        lead: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    return report;
  }

  /**
   * Get report status
   */
  async getReportStatus(reportId: string, tenantId: string) {
    const report = await (this.prisma as any).report.findFirst({
      where: {
        id: reportId,
        tenantId,
        type: 'AI_EBI_SURVEY',
      },
      select: {
        id: true,
        status: true,
        error: true,
        createdAt: true,
        completedAt: true,
        processingTimeMs: true,
      },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    return {
      reportId: report.id,
      status: report.status,
      error: report.error,
      createdAt: report.createdAt,
      completedAt: report.completedAt,
      processingTimeMs: report.processingTimeMs,
    };
  }

  /**
   * Get survey reports for a lead
   */
  async getReportsForLead(leadId: string, tenantId: string) {
    return (this.prisma as any).report.findMany({
      where: {
        leadId,
        tenantId,
        type: 'AI_EBI_SURVEY',
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        status: true,
        title: true,
        createdAt: true,
        completedAt: true,
        processingTimeMs: true,
        totalTokens: true,
      },
    });
  }

  /**
   * Get usage statistics for a tenant
   */
  async getUsageStats(tenantId: string) {
    const currentPeriod = new Date().toISOString().slice(0, 7);

    const [thisMonth, total] = await Promise.all([
      this.prisma.usageCounter.findUnique({
        where: {
          tenantId_metric_period: {
            tenantId,
            metric: 'SURVEYS' as any,
            period: currentPeriod,
          },
        },
      }),
      (this.prisma as any).surveyUsage.aggregate({
        where: { tenantId },
        _sum: {
          tokensUsed: true,
          estimatedCost: true,
        },
        _count: true,
      }),
    ]);

    // Get plan limit
    const subscription = await this.prisma.subscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    });

    return {
      thisMonth: thisMonth?.value || 0,
      total: total._count || 0,
      totalTokens: total._sum?.tokensUsed || 0,
      totalCost: total._sum?.estimatedCost || 0,
      limit: (subscription?.plan as any)?.surveysLimit || -1,
    };
  }
}
