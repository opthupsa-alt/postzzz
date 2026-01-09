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
import { CreateSurveyDto } from './dto/create-survey.dto';

interface AuthRequest extends Request {
  user: { userId: string; email: string; tenantId: string; role: string };
}

@Controller('survey')
@UseGuards(JwtAuthGuard)
export class SurveyController {
  constructor(private surveyService: SurveyService) {}

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
}
