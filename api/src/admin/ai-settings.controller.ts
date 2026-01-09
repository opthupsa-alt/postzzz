import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { IsString, IsNumber, IsBoolean, IsOptional } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AIProviderService } from '../ai-provider/ai-provider.service';
import { PromptTemplateService } from '../ai-provider/prompt-template.service';

interface AuthRequest extends Request {
  user: { userId: string; email: string; tenantId: string; role: string };
}

class UpdateAISettingsDto {
  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  modelName?: string;

  @IsOptional()
  @IsString()
  apiKey?: string;

  @IsOptional()
  @IsString()
  apiEndpoint?: string;

  @IsOptional()
  @IsNumber()
  maxTokens?: number;

  @IsOptional()
  @IsNumber()
  temperature?: number;

  @IsOptional()
  @IsBoolean()
  enableWebSearch?: boolean;

  @IsOptional()
  @IsString()
  reasoningEffort?: string;

  @IsOptional()
  @IsString()
  systemPrompt?: string;

  @IsOptional()
  @IsString()
  userPromptTemplate?: string;

  @IsOptional()
  @IsNumber()
  maxRequestsPerMinute?: number;

  @IsOptional()
  @IsNumber()
  maxRequestsPerDay?: number;

  @IsOptional()
  @IsNumber()
  estimatedCostPerRequest?: number;
}

@Controller('admin/ai-settings')
@UseGuards(JwtAuthGuard)
export class AISettingsController {
  constructor(
    private aiProvider: AIProviderService,
    private promptTemplate: PromptTemplateService,
  ) {}

  /**
   * Check if user is Super Admin
   */
  private checkSuperAdmin(req: AuthRequest) {
    if (req.user.role !== 'SUPER_ADMIN' && req.user.tenantId !== 'PLATFORM') {
      throw new ForbiddenException('Super Admin access required');
    }
  }

  /**
   * Get AI settings
   */
  @Get()
  async getSettings(@Req() req: AuthRequest) {
    this.checkSuperAdmin(req);

    const settings = await this.aiProvider.getSettings();

    if (!settings) {
      // Return defaults if no settings exist
      return {
        settings: {
          provider: 'OPENAI',
          modelName: 'gpt-4.5-turbo',
          apiKey: null,
          apiEndpoint: null,
          maxTokens: 8000,
          temperature: 0.7,
          enableWebSearch: true,
          systemPrompt: this.promptTemplate.getDefaultSystemPrompt(),
          userPromptTemplate: this.promptTemplate.getDefaultUserPromptTemplate(),
          maxRequestsPerMinute: 10,
          maxRequestsPerDay: 1000,
          estimatedCostPerRequest: 0.5,
        },
        isConfigured: false,
      };
    }

    // Mask API key for security
    return {
      settings: {
        ...settings,
        apiKey: settings.apiKey ? `****${settings.apiKey.slice(-4)}` : null,
      },
      isConfigured: !!settings.apiKey,
    };
  }

  /**
   * Update AI settings
   */
  @Put()
  async updateSettings(@Req() req: AuthRequest, @Body() dto: UpdateAISettingsDto) {
    this.checkSuperAdmin(req);

    // If apiKey is masked (starts with ****), don't update it
    const updateData: any = { ...dto };
    if (dto.apiKey?.startsWith('****')) {
      delete updateData.apiKey;
    }

    updateData.updatedById = req.user.userId;

    const settings = await this.aiProvider.updateSettings(updateData);

    return {
      settings: {
        ...settings,
        apiKey: settings.apiKey ? `****${settings.apiKey.slice(-4)}` : null,
      },
      message: 'تم تحديث إعدادات الذكاء الاصطناعي بنجاح',
    };
  }

  /**
   * Test AI connection
   */
  @Post('test')
  async testConnection(@Req() req: AuthRequest) {
    this.checkSuperAdmin(req);

    const result = await this.aiProvider.testConnection();

    return {
      ...result,
      message: result.success ? 'الاتصال ناجح' : 'فشل الاتصال',
    };
  }

  /**
   * Get default prompts
   */
  @Get('default-prompts')
  async getDefaultPrompts(@Req() req: AuthRequest) {
    this.checkSuperAdmin(req);

    return {
      systemPrompt: this.promptTemplate.getDefaultSystemPrompt(),
      userPromptTemplate: this.promptTemplate.getDefaultUserPromptTemplate(),
    };
  }

  /**
   * Get usage statistics
   */
  @Get('usage-stats')
  async getUsageStats(@Req() req: AuthRequest) {
    this.checkSuperAdmin(req);

    // TODO: Implement global usage stats
    return {
      totalRequests: 0,
      totalTokens: 0,
      totalCost: 0,
      byTenant: [],
    };
  }
}
