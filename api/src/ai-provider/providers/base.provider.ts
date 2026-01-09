import { AICompletionRequest, AICompletionResponse, AIProviderConfig, IAIProvider } from '../interfaces/ai-provider.interface';

export abstract class BaseAIProvider implements IAIProvider {
  abstract name: string;
  protected config: AIProviderConfig;

  constructor(config: AIProviderConfig) {
    this.config = config;
  }

  abstract complete(request: AICompletionRequest): Promise<AICompletionResponse>;
  abstract testConnection(): Promise<{ success: boolean; message: string }>;

  protected validateConfig(): void {
    if (!this.config.apiKey) {
      throw new Error('API Key is required');
    }
    if (!this.config.modelName) {
      throw new Error('Model name is required');
    }
  }
}
