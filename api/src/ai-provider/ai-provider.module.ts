import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AIProviderService } from './ai-provider.service';
import { PromptTemplateService } from './prompt-template.service';

@Module({
  imports: [PrismaModule],
  providers: [AIProviderService, PromptTemplateService],
  exports: [AIProviderService, PromptTemplateService],
})
export class AIProviderModule {}
