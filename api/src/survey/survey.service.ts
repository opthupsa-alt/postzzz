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

      // Call AI provider with web search enabled
      const response = await this.aiProvider.complete({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        maxTokens: aiSettings.maxTokens,
        temperature: aiSettings.temperature,
        enableWebSearch: aiSettings.enableWebSearch,
        reasoningEffort: (aiSettings as any).reasoningEffort,
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
   * Handles various response formats and extracts all sections properly
   */
  private parseAIResponse(content: string): SurveyReportData {
    // Clean the content from unwanted characters
    const cleanContent = this.cleanContent(content);
    
    // Extract all sections
    const sections = this.extractAllSections(cleanContent);
    
    return {
      executiveSummary: this.parseExecutiveSummary(sections, cleanContent),
      identityAnchors: this.parseIdentityAnchors(sections, cleanContent),
      digitalFootprint: this.parseDigitalFootprint(sections, cleanContent),
      gapAnalysis: this.parseGapAnalysis(sections, cleanContent),
      priorities: this.parsePriorities(sections, cleanContent),
      serviceMapping: this.parseServiceMapping(sections, cleanContent),
      packages: this.parsePackages(sections, cleanContent),
      competitors: this.parseCompetitors(sections, cleanContent),
      salesEnablement: this.parseSalesEnablement(sections, cleanContent),
      crmCard: this.parseCRMCard(sections, cleanContent),
    };
  }

  /**
   * Clean content from unwanted characters and normalize formatting
   */
  private cleanContent(content: string): string {
    return content
      // Remove markdown code blocks
      .replace(/```[\s\S]*?```/g, '')
      // Normalize Arabic characters
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // Zero-width characters
      // Normalize line endings
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Remove excessive newlines
      .replace(/\n{4,}/g, '\n\n\n')
      // Trim
      .trim();
  }

  /**
   * Extract all sections from the content based on headers
   */
  private extractAllSections(content: string): Map<string, string> {
    const sections = new Map<string, string>();
    
    // Match various header formats: #, ##, ###, ===, ---, numbered (1), 1.
    const headerPatterns = [
      /^#{1,3}\s*\d*[.)]*\s*(.+?)$/gm,           // # Header, ## 1) Header
      /^(.+?)\n[=]{3,}$/gm,                       // Header\n===
      /^(.+?)\n[-]{3,}$/gm,                       // Header\n---
      /^\d+[.)]\s*(.+?)$/gm,                      // 1) Header, 1. Header
      /^[أ-ي]+[.)]\s*(.+?)$/gm,                   // Arabic letters: أ) Header
    ];
    
    // Split by common section markers
    const sectionMarkers = [
      'ملخص تنفيذي',
      'تثبيت الهوية',
      'منع تشابه الأسماء',
      'جرد الحضور الرقمي',
      'الحضور الرقمي',
      'تحليل الفجوات',
      'الأولويات',
      'خدمات OP-Target',
      'الخدمات المقترحة',
      'باقات مقترحة',
      'الباقات',
      'منافسون',
      'المنافسون',
      'مواد للمندوب',
      'أسئلة',
      'سكريبت',
      'اعتراضات',
      'بطاقة CRM',
      'JSON',
      'المصادر',
      'المراجع',
    ];
    
    let currentSection = 'intro';
    let currentContent: string[] = [];
    
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Check if this line is a section header
      let foundSection = '';
      for (const marker of sectionMarkers) {
        if (trimmedLine.includes(marker)) {
          foundSection = marker;
          break;
        }
      }
      
      if (foundSection) {
        // Save previous section
        if (currentContent.length > 0) {
          sections.set(currentSection, currentContent.join('\n'));
        }
        currentSection = foundSection;
        currentContent = [];
      } else {
        currentContent.push(line);
      }
    }
    
    // Save last section
    if (currentContent.length > 0) {
      sections.set(currentSection, currentContent.join('\n'));
    }
    
    return sections;
  }

  /**
   * Extract bullet points from text
   */
  private extractBulletPoints(text: string): string[] {
    const points: string[] = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      // Match various bullet formats
      const bulletMatch = trimmed.match(/^[-•*▪◦●○]\s*(.+)$/) ||
                         trimmed.match(/^\d+[.)]\s*(.+)$/) ||
                         trimmed.match(/^[أ-ي][.)]\s*(.+)$/);
      
      if (bulletMatch) {
        const point = bulletMatch[1].trim();
        if (point.length > 0) {
          points.push(point);
        }
      }
    }
    
    return points;
  }

  /**
   * Parse Executive Summary section
   */
  private parseExecutiveSummary(sections: Map<string, string>, fullContent: string): any {
    const sectionContent = sections.get('ملخص تنفيذي') || '';
    const points = this.extractBulletPoints(sectionContent);
    
    // If no bullet points found, try to extract from full content
    if (points.length === 0) {
      const summaryMatch = fullContent.match(/ملخص تنفيذي[\s\S]*?(?=\n#{1,3}|\n\d+[.)]\s|تثبيت الهوية|$)/i);
      if (summaryMatch) {
        points.push(...this.extractBulletPoints(summaryMatch[0]));
      }
    }
    
    // Fallback: extract first few meaningful sentences
    if (points.length === 0) {
      const sentences = fullContent.split(/[.،؛]/).filter(s => s.trim().length > 20);
      points.push(...sentences.slice(0, 5).map(s => s.trim()));
    }
    
    return {
      points: points.slice(0, 10),
      confidenceLevel: this.detectConfidenceLevel(sectionContent || fullContent),
    };
  }

  /**
   * Parse Identity Anchors section
   */
  private parseIdentityAnchors(sections: Map<string, string>, fullContent: string): any {
    const sectionContent = sections.get('تثبيت الهوية') || sections.get('منع تشابه الأسماء') || '';
    
    const confirmedIdentifiers: any[] = [];
    const lookAlikes: any[] = [];
    
    // Extract identifiers (phone, email, CR, etc.)
    const phoneMatch = fullContent.match(/(?:هاتف|جوال|رقم)[:\s]*([+\d\s-]+)/);
    if (phoneMatch) {
      confirmedIdentifiers.push({
        type: 'phone',
        value: phoneMatch[1].trim(),
        source: 'AI Analysis',
        verified: false,
      });
    }
    
    const emailMatch = fullContent.match(/[\w.-]+@[\w.-]+\.\w+/);
    if (emailMatch) {
      confirmedIdentifiers.push({
        type: 'email',
        value: emailMatch[0],
        source: 'AI Analysis',
        verified: false,
      });
    }
    
    const crMatch = fullContent.match(/(?:سجل تجاري|CR)[:\s]*(\d+)/);
    if (crMatch) {
      confirmedIdentifiers.push({
        type: 'commercial_registration',
        value: crMatch[1],
        source: 'AI Analysis',
        verified: false,
      });
    }
    
    // Extract look-alikes (similar companies)
    const lookAlikeMatch = sectionContent.match(/(?:تشابه|مشابه|قد يختلط)[\s\S]*?(?:\n\n|$)/i);
    if (lookAlikeMatch) {
      const names = this.extractBulletPoints(lookAlikeMatch[0]);
      for (const name of names) {
        lookAlikes.push({ name, reason: 'تشابه في الاسم' });
      }
    }
    
    return {
      confirmedIdentifiers,
      lookAlikes,
      confidenceLevel: this.detectConfidenceLevel(sectionContent),
      confidenceReason: sectionContent.length > 0 ? 'تم التحليل بناءً على البيانات المتاحة' : 'لم يتم العثور على معلومات كافية',
    };
  }

  /**
   * Parse Digital Footprint section
   */
  private parseDigitalFootprint(sections: Map<string, string>, fullContent: string): any[] {
    const sectionContent = sections.get('جرد الحضور الرقمي') || sections.get('الحضور الرقمي') || '';
    const footprint: any[] = [];
    
    const platforms = [
      { name: 'website', ar: 'موقع', patterns: [/(?:موقع|website)[:\s]*(https?:\/\/[^\s]+)/i] },
      { name: 'google_maps', ar: 'خرائط جوجل', patterns: [/(?:maps|خرائط|google maps|GBP)[:\s]*(https?:\/\/[^\s]+)/i] },
      { name: 'instagram', ar: 'انستقرام', patterns: [/(?:instagram|انستقرام|IG)[:\s]*@?([^\s,]+)/i, /instagram\.com\/([^\s/]+)/i] },
      { name: 'twitter', ar: 'تويتر/X', patterns: [/(?:twitter|x\.com|تويتر|X)[:\s]*@?([^\s,]+)/i] },
      { name: 'facebook', ar: 'فيسبوك', patterns: [/(?:facebook|فيسبوك|FB)[:\s]*([^\s,]+)/i] },
      { name: 'linkedin', ar: 'لينكدإن', patterns: [/(?:linkedin|لينكد|LI)[:\s]*([^\s,]+)/i] },
      { name: 'tiktok', ar: 'تيك توك', patterns: [/(?:tiktok|تيك توك|TT)[:\s]*@?([^\s,]+)/i] },
      { name: 'snapchat', ar: 'سناب شات', patterns: [/(?:snapchat|سناب|Snap)[:\s]*@?([^\s,]+)/i] },
      { name: 'youtube', ar: 'يوتيوب', patterns: [/(?:youtube|يوتيوب|YT)[:\s]*([^\s,]+)/i] },
    ];
    
    const searchContent = sectionContent || fullContent;
    
    for (const platform of platforms) {
      let found = false;
      let url = '';
      let details = '';
      let followers: number | undefined;
      let isVerified = false;
      let rating: number | undefined;
      let reviewCount: number | undefined;
      let lastActivity: string | undefined;
      
      for (const pattern of platform.patterns) {
        const match = searchContent.match(pattern);
        if (match) {
          found = true;
          url = match[1] || '';
          break;
        }
      }
      
      // Check for status indicators
      const statusPatterns = [
        { status: 'EXISTS', patterns: [/موجود|نشط|active|found|✓|✔/i] },
        { status: 'NOT_FOUND', patterns: [/غير موجود|لا يوجد|not found|missing|✗|✘/i] },
      ];
      
      let status: 'EXISTS' | 'NOT_FOUND' | 'UNCERTAIN' = found ? 'EXISTS' : 'UNCERTAIN';
      
      // Look for platform-specific section in content
      const platformSection = searchContent.match(new RegExp(`${platform.ar}[\\s\\S]*?(?=\\n[-•📱]|\\n\\n|$)`, 'i'));
      if (platformSection) {
        const sectionText = platformSection[0];
        
        // Detect status
        for (const sp of statusPatterns) {
          for (const p of sp.patterns) {
            if (p.test(sectionText)) {
              status = sp.status as any;
              break;
            }
          }
        }
        
        // Extract followers count
        const followersMatch = sectionText.match(/(?:متابع|followers?)[:\s]*([0-9,.]+[KMكم]?)/i) ||
                              sectionText.match(/([0-9,.]+[KMكم]?)\s*(?:متابع|followers?)/i);
        if (followersMatch) {
          followers = this.parseFollowerCount(followersMatch[1]);
        }
        
        // Check verification
        isVerified = /موثق|verified|✓|✔|badge/i.test(sectionText);
        
        // Extract rating (for Google Maps)
        const ratingMatch = sectionText.match(/(?:تقييم|rating)[:\s]*([0-9.]+)/i) ||
                           sectionText.match(/([0-9.]+)\s*(?:نجوم|stars?|\/\s*5)/i);
        if (ratingMatch) {
          rating = parseFloat(ratingMatch[1]);
        }
        
        // Extract review count
        const reviewMatch = sectionText.match(/(?:مراجع|reviews?)[:\s]*([0-9,]+)/i) ||
                           sectionText.match(/([0-9,]+)\s*(?:مراجع|reviews?)/i);
        if (reviewMatch) {
          reviewCount = parseInt(reviewMatch[1].replace(/,/g, ''));
        }
        
        // Extract last activity
        const activityMatch = sectionText.match(/(?:آخر نشاط|last activity|آخر منشور)[:\s]*([^\n]+)/i);
        if (activityMatch) {
          lastActivity = activityMatch[1].trim();
        }
        
        details = sectionText.replace(new RegExp(platform.ar, 'gi'), '').trim().substring(0, 300);
      }
      
      footprint.push({
        platform: platform.name,
        status,
        url: url || undefined,
        details: details || undefined,
        followers,
        isVerified,
        rating,
        reviewCount,
        lastActivity,
      });
    }
    
    return footprint;
  }

  /**
   * Parse follower count from string (handles K, M, etc.)
   */
  private parseFollowerCount(text: string): number | undefined {
    if (!text) return undefined;
    
    const cleaned = text.replace(/[,،\s]/g, '').trim();
    const match = cleaned.match(/([\d.]+)\s*([KMكم])?/i);
    if (!match) return undefined;

    let num = parseFloat(match[1]);
    const suffix = (match[2] || '').toUpperCase();

    switch (suffix) {
      case 'K':
      case 'ك':
        num *= 1000;
        break;
      case 'M':
      case 'م':
        num *= 1000000;
        break;
    }

    return Math.round(num);
  }

  /**
   * Parse Gap Analysis section
   */
  private parseGapAnalysis(sections: Map<string, string>, fullContent: string): any[] {
    const sectionContent = sections.get('تحليل الفجوات') || '';
    const gaps: any[] = [];
    
    const categories = [
      { id: 'A', name: 'الموقع الإلكتروني', ar: ['موقع', 'website', 'ويب'] },
      { id: 'B', name: 'السوشيال ميديا', ar: ['سوشيال', 'social', 'تواصل اجتماعي'] },
      { id: 'C', name: 'SEO والظهور', ar: ['seo', 'محركات البحث', 'الظهور'] },
      { id: 'D', name: 'المحتوى', ar: ['محتوى', 'content'] },
      { id: 'E', name: 'الإعلانات', ar: ['إعلان', 'ads', 'حملات'] },
      { id: 'F', name: 'التحول الرقمي', ar: ['رقمي', 'digital', 'تحول'] },
    ];
    
    for (const cat of categories) {
      // Find category section
      const catPattern = new RegExp(`[${cat.id}]|${cat.ar.join('|')}[\\s\\S]*?(?=\\n[A-F]|\\n#{1,3}|$)`, 'i');
      const catMatch = (sectionContent || fullContent).match(catPattern);
      
      let status: 'GOOD' | 'NEEDS_IMPROVEMENT' | 'MISSING' | 'UNKNOWN' = 'UNKNOWN';
      const findings: string[] = [];
      const recommendations: string[] = [];
      
      if (catMatch) {
        const catContent = catMatch[0];
        
        // Detect status
        if (/جيد|ممتاز|قوي|good|excellent/i.test(catContent)) {
          status = 'GOOD';
        } else if (/ضعيف|يحتاج|تحسين|needs|improve/i.test(catContent)) {
          status = 'NEEDS_IMPROVEMENT';
        } else if (/غائب|مفقود|لا يوجد|missing|absent/i.test(catContent)) {
          status = 'MISSING';
        }
        
        // Extract findings and recommendations
        const points = this.extractBulletPoints(catContent);
        for (const point of points) {
          if (/يُنصح|يجب|ننصح|recommend|should/i.test(point)) {
            recommendations.push(point);
          } else {
            findings.push(point);
          }
        }
      }
      
      gaps.push({
        category: cat.name,
        status,
        findings: findings.slice(0, 5),
        recommendations: recommendations.slice(0, 5),
      });
    }
    
    return gaps;
  }

  /**
   * Parse Priorities section
   */
  private parsePriorities(sections: Map<string, string>, fullContent: string): any[] {
    const sectionContent = sections.get('الأولويات') || '';
    const priorities: any[] = [];
    
    const points = this.extractBulletPoints(sectionContent || fullContent);
    
    for (let i = 0; i < Math.min(points.length, 10); i++) {
      const point = points[i];
      
      // Detect impact level
      let impact: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
      if (/عالي|مرتفع|أولوية قصوى|high|critical/i.test(point)) {
        impact = 'HIGH';
      } else if (/منخفض|بسيط|low|minor/i.test(point)) {
        impact = 'LOW';
      }
      
      priorities.push({
        rank: i + 1,
        title: point.substring(0, 100),
        description: point,
        impact,
        effort: 'MEDIUM',
        dependencies: [],
      });
    }
    
    return priorities;
  }

  /**
   * Parse Service Mapping section
   */
  private parseServiceMapping(sections: Map<string, string>, fullContent: string): any[] {
    const sectionContent = sections.get('خدمات OP-Target') || sections.get('الخدمات المقترحة') || '';
    const services: any[] = [];
    
    const points = this.extractBulletPoints(sectionContent);
    
    for (const point of points.slice(0, 10)) {
      services.push({
        priority: 'متوسطة',
        problem: '',
        evidence: '',
        suggestedService: point,
        expectedOutcome: '',
      });
    }
    
    return services;
  }

  /**
   * Parse Packages section
   */
  private parsePackages(sections: Map<string, string>, fullContent: string): any[] {
    const sectionContent = sections.get('باقات مقترحة') || sections.get('الباقات') || '';
    const packages: any[] = [];
    
    // Try to find 3 packages
    const packagePatterns = [
      /باقة\s*(?:أساسية|بداية|starter|basic)/i,
      /باقة\s*(?:متوسطة|نمو|growth|standard)/i,
      /باقة\s*(?:متقدمة|احترافية|premium|pro)/i,
    ];
    
    const packageNames = [
      { name: 'Starter', nameAr: 'باقة البداية', suitableFor: 'الشركات الناشئة' },
      { name: 'Growth', nameAr: 'باقة النمو', suitableFor: 'الشركات المتوسطة' },
      { name: 'Premium', nameAr: 'باقة الاحترافية', suitableFor: 'الشركات الكبيرة' },
    ];
    
    for (let i = 0; i < 3; i++) {
      const pattern = packagePatterns[i];
      const match = (sectionContent || fullContent).match(new RegExp(`${pattern.source}[\\s\\S]*?(?=باقة|\\n#{1,3}|$)`, 'i'));
      
      const includes = match ? this.extractBulletPoints(match[0]) : [];
      
      packages.push({
        name: packageNames[i].name,
        nameAr: packageNames[i].nameAr,
        description: match ? match[0].substring(0, 200) : '',
        includes: includes.slice(0, 8),
        suitableFor: packageNames[i].suitableFor,
      });
    }
    
    return packages;
  }

  /**
   * Parse Competitors section
   */
  private parseCompetitors(sections: Map<string, string>, fullContent: string): any[] {
    const sectionContent = sections.get('منافسون') || sections.get('المنافسون') || '';
    const competitors: any[] = [];
    
    // Try to extract competitor names and details
    const competitorPattern = /(?:منافس|competitor)\s*\d*[:\s]*([^\n]+)/gi;
    let match;
    
    while ((match = competitorPattern.exec(sectionContent || fullContent)) !== null && competitors.length < 5) {
      const name = match[1].trim();
      if (name.length > 2) {
        competitors.push({
          name,
          city: '',
          strengths: [],
          weaknesses: [],
          evidence: [],
        });
      }
    }
    
    // Fallback: extract bullet points as competitor names
    if (competitors.length === 0) {
      const points = this.extractBulletPoints(sectionContent);
      for (const point of points.slice(0, 3)) {
        competitors.push({
          name: point.substring(0, 50),
          city: '',
          strengths: [],
          weaknesses: [],
          evidence: [],
        });
      }
    }
    
    return competitors;
  }

  /**
   * Parse Sales Enablement section
   */
  private parseSalesEnablement(sections: Map<string, string>, fullContent: string): any {
    const sectionContent = sections.get('مواد للمندوب') || '';
    
    // Extract discovery questions
    const questionsSection = sections.get('أسئلة') || '';
    const discoveryQuestions = this.extractBulletPoints(questionsSection || sectionContent);
    
    // Extract call script
    const scriptSection = sections.get('سكريبت') || '';
    const callScript = scriptSection || '';
    
    // Extract objections
    const objectionsSection = sections.get('اعتراضات') || '';
    const objectionPoints = this.extractBulletPoints(objectionsSection);
    const objections = objectionPoints.map(o => ({
      objection: o,
      response: '',
    }));
    
    // Extract next best action
    let nextBestAction = '';
    const nextMatch = (sectionContent || fullContent).match(/(?:next step|الخطوة التالية|next best action)[:\s]*([^\n]+)/i);
    if (nextMatch) {
      nextBestAction = nextMatch[1].trim();
    }
    
    return {
      discoveryQuestions: discoveryQuestions.slice(0, 10),
      callScript: callScript.substring(0, 2000),
      objections: objections.slice(0, 5),
      nextBestAction,
    };
  }

  /**
   * Parse CRM Card section
   */
  private parseCRMCard(sections: Map<string, string>, fullContent: string): any {
    const sectionContent = sections.get('بطاقة CRM') || '';
    
    // Extract company info
    const companyMatch = fullContent.match(/(?:اسم الشركة|company name)[:\s]*([^\n]+)/i);
    const industryMatch = fullContent.match(/(?:النشاط|المجال|industry)[:\s]*([^\n]+)/i);
    const cityMatch = fullContent.match(/(?:المدينة|city)[:\s]*([^\n]+)/i);
    const phoneMatch = fullContent.match(/(?:هاتف|phone)[:\s]*([+\d\s-]+)/i);
    const emailMatch = fullContent.match(/[\w.-]+@[\w.-]+\.\w+/);
    const websiteMatch = fullContent.match(/(?:موقع|website)[:\s]*(https?:\/\/[^\s]+)/i);
    
    // Extract social links
    const socialLinks: Record<string, string> = {};
    const socialPatterns = [
      { key: 'instagram', pattern: /instagram\.com\/([^\s/]+)/i },
      { key: 'twitter', pattern: /(?:twitter|x)\.com\/([^\s/]+)/i },
      { key: 'facebook', pattern: /facebook\.com\/([^\s/]+)/i },
      { key: 'linkedin', pattern: /linkedin\.com\/(?:company|in)\/([^\s/]+)/i },
    ];
    
    for (const sp of socialPatterns) {
      const match = fullContent.match(sp.pattern);
      if (match) {
        socialLinks[sp.key] = match[0];
      }
    }
    
    // Calculate qualification score based on available data
    let qualificationScore = 50;
    if (companyMatch) qualificationScore += 10;
    if (phoneMatch) qualificationScore += 10;
    if (emailMatch) qualificationScore += 10;
    if (websiteMatch) qualificationScore += 10;
    if (Object.keys(socialLinks).length > 0) qualificationScore += 10;
    
    // Detect priority
    let priority: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
    if (/أولوية عالية|high priority|عميل محتمل قوي/i.test(fullContent)) {
      priority = 'HIGH';
    } else if (/أولوية منخفضة|low priority/i.test(fullContent)) {
      priority = 'LOW';
    }
    
    // Extract recommended services
    const servicesSection = sections.get('خدمات OP-Target') || sections.get('الخدمات المقترحة') || '';
    const recommendedServices = this.extractBulletPoints(servicesSection).slice(0, 5);
    
    return {
      companyName: companyMatch ? companyMatch[1].trim() : '',
      industry: industryMatch ? industryMatch[1].trim() : '',
      city: cityMatch ? cityMatch[1].trim() : '',
      country: 'السعودية',
      phone: phoneMatch ? phoneMatch[1].trim() : undefined,
      email: emailMatch ? emailMatch[0] : undefined,
      website: websiteMatch ? websiteMatch[1] : undefined,
      socialLinks,
      qualificationScore: Math.min(qualificationScore, 100),
      priority,
      recommendedServices,
      notes: fullContent.substring(0, 500),
    };
  }

  /**
   * Detect confidence level from content
   */
  private detectConfidenceLevel(content: string): 'HIGH' | 'MEDIUM' | 'LOW' {
    if (/مؤكد|تم التحقق|verified|confirmed|عالي الثقة/i.test(content)) {
      return 'HIGH';
    }
    if (/غير مؤكد|يحتاج تحقق|uncertain|unverified|منخفض الثقة/i.test(content)) {
      return 'LOW';
    }
    return 'MEDIUM';
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
