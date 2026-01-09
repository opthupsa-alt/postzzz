import { AICompletionRequest, AICompletionResponse, AIProviderConfig } from '../interfaces/ai-provider.interface';
import { BaseAIProvider } from './base.provider';

export class OpenAIProvider extends BaseAIProvider {
  name = 'OpenAI';
  private baseUrl: string;

  constructor(config: AIProviderConfig) {
    super(config);
    this.baseUrl = config.apiEndpoint || 'https://api.openai.com/v1';
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    this.validateConfig();

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.modelName,
        messages: request.messages,
        max_tokens: request.maxTokens || this.config.maxTokens,
        temperature: request.temperature ?? this.config.temperature,
        // Note: Web search capability depends on the model used
        // For models with web search (like gpt-4-turbo with browsing), 
        // this is handled automatically by the model
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(`OpenAI API Error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    if (!choice) {
      throw new Error('No response from OpenAI');
    }

    return {
      content: choice.message?.content || '',
      promptTokens: data.usage?.prompt_tokens || 0,
      completionTokens: data.usage?.completion_tokens || 0,
      totalTokens: data.usage?.total_tokens || 0,
      model: data.model || this.config.modelName,
      finishReason: choice.finish_reason || 'unknown',
    };
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      this.validateConfig();

      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
        return {
          success: false,
          message: `Connection failed: ${error.error?.message || response.statusText}`,
        };
      }

      return {
        success: true,
        message: 'Successfully connected to OpenAI API',
      };
    } catch (error) {
      return {
        success: false,
        message: `Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}
