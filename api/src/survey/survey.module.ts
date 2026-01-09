import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AIProviderModule } from '../ai-provider/ai-provider.module';
import { SurveyController } from './survey.controller';
import { SurveyService } from './survey.service';

@Module({
  imports: [PrismaModule, AIProviderModule],
  controllers: [SurveyController],
  providers: [SurveyService],
  exports: [SurveyService],
})
export class SurveyModule {}
