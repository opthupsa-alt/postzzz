import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AICompletionRequest, AICompletionResponse, AIProviderConfig, IAIProvider } from './interfaces/ai-provider.interface';
import { OpenAIProvider } from './providers/openai.provider';

// AI Provider enum (matches Prisma schema)
enum AIProviderEnum {
  OPENAI = 'OPENAI',
  GEMINI = 'GEMINI',
  ANTHROPIC = 'ANTHROPIC',
  CUSTOM = 'CUSTOM',
}

@Injectable()
export class AIProviderService {
  private readonly logger = new Logger(AIProviderService.name);
  private provider: IAIProvider | null = null;
  private lastConfigHash: string | null = null;

  constructor(private prisma: PrismaService) {}

  /**
   * Get or create AI provider instance based on current settings
   */
  private async getProvider(): Promise<IAIProvider> {
    const settings = await this.getSettings();
    
    if (!settings) {
      throw new Error('AI Settings not configured. Please configure AI settings in Super Admin panel.');
    }

    if (!settings.apiKey) {
      throw new Error('AI API Key not configured. Please add API key in Super Admin panel.');
    }

    // Check if we need to recreate the provider
    const configHash = `${settings.provider}-${settings.modelName}-${settings.apiKey}`;
    if (this.provider && this.lastConfigHash === configHash) {
      return this.provider;
    }

    const config: AIProviderConfig = {
      apiKey: settings.apiKey,
      modelName: settings.modelName,
      apiEndpoint: settings.apiEndpoint || undefined,
      maxTokens: settings.maxTokens,
      temperature: settings.temperature,
      enableWebSearch: settings.enableWebSearch,
    };

    switch (settings.provider) {
      case AIProviderEnum.OPENAI:
        this.provider = new OpenAIProvider(config);
        break;
      case AIProviderEnum.GEMINI:
        // TODO: Implement Gemini provider
        throw new Error('Gemini provider not yet implemented');
      case AIProviderEnum.ANTHROPIC:
        // TODO: Implement Anthropic provider
        throw new Error('Anthropic provider not yet implemented');
      case AIProviderEnum.CUSTOM:
        // For custom, use OpenAI-compatible API
        this.provider = new OpenAIProvider(config);
        break;
      default:
        throw new Error(`Unknown AI provider: ${settings.provider}`);
    }

    this.lastConfigHash = configHash;
    return this.provider;
  }

  /**
   * Get AI settings from database
   */
  async getSettings() {
    return (this.prisma as any).aISettings.findUnique({
      where: { id: 'default' },
    });
  }

  /**
   * Create or update AI settings
   */
  async updateSettings(data: {
    provider?: string;
    modelName?: string;
    apiKey?: string;
    apiEndpoint?: string;
    maxTokens?: number;
    temperature?: number;
    enableWebSearch?: boolean;
    systemPrompt?: string;
    userPromptTemplate?: string;
    maxRequestsPerMinute?: number;
    maxRequestsPerDay?: number;
    estimatedCostPerRequest?: number;
    updatedById?: string;
  }) {
    // Invalidate cached provider
    this.provider = null;
    this.lastConfigHash = null;

    return (this.prisma as any).aISettings.upsert({
      where: { id: 'default' },
      update: data,
      create: {
        id: 'default',
        ...data,
        systemPrompt: data.systemPrompt || '',
        userPromptTemplate: data.userPromptTemplate || '',
      },
    });
  }

  /**
   * Complete a chat request using the configured AI provider
   */
  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    const provider = await this.getProvider();
    const startTime = Date.now();

    try {
      const response = await provider.complete(request);
      const processingTime = Date.now() - startTime;

      this.logger.log(`AI completion successful: ${response.totalTokens} tokens in ${processingTime}ms`);

      return response;
    } catch (error) {
      this.logger.error(`AI completion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Test connection to the AI provider
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const provider = await this.getProvider();
      return provider.testConnection();
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get current provider name
   */
  async getProviderName(): Promise<string> {
    const settings = await this.getSettings();
    return settings?.provider || 'Not configured';
  }
}
