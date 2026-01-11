import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SurveyService } from './survey.service';
import { LocalAnalyzerService, CompanyData } from './local-analyzer.service';
import { ReportFormatterService, DeepSearchData } from './report-formatter.service';
import { CreateSurveyDto } from './dto/create-survey.dto';

interface AuthRequest extends Request {
  user: { userId: string; email: string; tenantId: string; role: string };
}

@Controller('survey')
@UseGuards(JwtAuthGuard)
export class SurveyController {
  constructor(
    private surveyService: SurveyService,
    private localAnalyzer: LocalAnalyzerService,
    private reportFormatter: ReportFormatterService,
  ) {}

  /**
   * Create a new AI EBI survey report for a lead
   */
  @Post('generate')
  async createSurvey(@Req() req: AuthRequest, @Body() dto: CreateSurveyDto) {
    return this.surveyService.createSurvey(
      req.user.userId,
      req.user.tenantId,
      dto,
    );
  }

  /**
   * Get a survey report by ID
   */
  @Get(':reportId')
  async getReport(@Req() req: AuthRequest, @Param('reportId') reportId: string) {
    return this.surveyService.getReport(reportId, req.user.tenantId);
  }

  /**
   * Get report status only
   */
  @Get(':reportId/status')
  async getReportStatus(@Req() req: AuthRequest, @Param('reportId') reportId: string) {
    return this.surveyService.getReportStatus(reportId, req.user.tenantId);
  }

  /**
   * Get all survey reports for a lead
   */
  @Get('lead/:leadId')
  async getReportsForLead(@Req() req: AuthRequest, @Param('leadId') leadId: string) {
    return this.surveyService.getReportsForLead(leadId, req.user.tenantId);
  }

  /**
   * Get usage statistics
   */
  @Get('usage/stats')
  async getUsageStats(@Req() req: AuthRequest) {
    return this.surveyService.getUsageStats(req.user.tenantId);
  }

  /**
   * Quick local analysis (no AI, instant results)
   * تحليل محلي سريع بدون AI - نتائج فورية
   */
  @Post('analyze-local')
  async analyzeLocal(@Body() data: CompanyData) {
    return this.localAnalyzer.analyzeCompany(data);
  }

  /**
   * Validate company name before analysis
   * التحقق من صحة اسم الشركة قبل التحليل
   */
  @Post('validate-name')
  async validateName(@Body() body: { name: string }) {
    return this.localAnalyzer.validateCompanyName(body.name);
  }

  /**
   * Deep analysis with social media data
   * تحليل شامل مع بيانات السوشيال ميديا من الإكستنشن
   */
  @Post('analyze-deep')
  async analyzeDeep(@Body() body: {
    companyData: CompanyData;
    deepSearchResult?: {
      sources: string[];
      data: {
        googleMaps?: any;
        googleSearch?: any;
        socialProfiles?: Record<string, any>;
      };
      summary?: any;
    };
  }) {
    // دمج البيانات من جميع المصادر
    const enrichedData: CompanyData = {
      ...body.companyData,
    };

    // إضافة بيانات Google Maps
    if (body.deepSearchResult?.data?.googleMaps) {
      const maps = body.deepSearchResult.data.googleMaps;
      enrichedData.phone = enrichedData.phone || maps.phone;
      enrichedData.website = enrichedData.website || maps.website;
      enrichedData.address = enrichedData.address || maps.address;
      enrichedData.rating = enrichedData.rating || parseFloat(maps.rating);
      enrichedData.reviewCount = enrichedData.reviewCount || parseInt(maps.reviews);
    }

    // إضافة بيانات Google Search
    if (body.deepSearchResult?.data?.googleSearch) {
      const search = body.deepSearchResult.data.googleSearch;
      enrichedData.website = enrichedData.website || search.officialWebsite;
      enrichedData.socialLinks = {
        ...(enrichedData.socialLinks || {}),
        ...(search.socialLinks || {}),
      };
    }

    // إضافة بيانات السوشيال ميديا
    if (body.deepSearchResult?.data?.socialProfiles) {
      enrichedData.socialProfiles = body.deepSearchResult.data.socialProfiles;
      
      // استخراج روابط السوشيال
      for (const [platform, profile] of Object.entries(body.deepSearchResult.data.socialProfiles)) {
        if (profile?.url) {
          enrichedData.socialLinks = enrichedData.socialLinks || {};
          enrichedData.socialLinks[platform] = profile.url;
        }
      }
    }

    // إضافة الملخص
    if (body.deepSearchResult?.summary) {
      enrichedData.metadata = {
        ...(enrichedData.metadata || {}),
        deepSearchSummary: body.deepSearchResult.summary,
        sources: body.deepSearchResult.sources,
      };
    }

    // تنفيذ التحليل المحلي مع البيانات المُثراة
    return this.localAnalyzer.analyzeCompany(enrichedData);
  }

  /**
   * Format report using AI (no search, formatting only)
   * تنسيق التقرير باستخدام AI بناءً على بيانات البحث من الإكستنشن
   * لا يقوم بأي بحث - فقط تنسيق البيانات المُقدمة
   * يستهلك ~500 توكن فقط بدلاً من ~5000
   */
  @Post('format-report')
  async formatReport(@Body() searchData: DeepSearchData) {
    return this.reportFormatter.formatReport(searchData);
  }
}
