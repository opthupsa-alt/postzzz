import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AIProviderModule } from '../ai-provider/ai-provider.module';
import { SurveyController } from './survey.controller';
import { SurveyService } from './survey.service';
import { LocalAnalyzerService } from './local-analyzer.service';
import { ReportFormatterService } from './report-formatter.service';

@Module({
  imports: [PrismaModule, AIProviderModule],
  controllers: [SurveyController],
  providers: [SurveyService, LocalAnalyzerService, ReportFormatterService],
  exports: [SurveyService, LocalAnalyzerService, ReportFormatterService],
})
export class SurveyModule {}
