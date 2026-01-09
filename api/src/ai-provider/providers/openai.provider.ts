import { AICompletionRequest, AICompletionResponse, AIProviderConfig } from '../interfaces/ai-provider.interface';
import { BaseAIProvider } from './base.provider';

// Models that use max_completion_tokens instead of max_tokens
// This includes o1, o3, GPT-5.x and newer models
const MODELS_WITH_COMPLETION_TOKENS = [
  'o1', 'o1-mini', 'o1-preview',
  'o3', 'o3-mini',
  'gpt-5', 'gpt-5.1', 'gpt-5.2',
  'gpt-4.1', 'gpt-4o', 'gpt-4o-mini',
];

// GPT-5.2 Thinking models that support reasoning_effort
const THINKING_MODELS = [
  'gpt-5.2',
  'gpt-5.2-thinking',
  'gpt-5.1',
  'gpt-5.1-thinking',
  'gpt-5',
  'gpt-5-thinking',
  'o1', 'o1-mini', 'o1-preview',
  'o3', 'o3-mini',
];

export class OpenAIProvider extends BaseAIProvider {
  name = 'OpenAI';
  private baseUrl: string;

  constructor(config: AIProviderConfig) {
    super(config);
    this.baseUrl = config.apiEndpoint || 'https://api.openai.com/v1';
  }

  /**
   * Check if current model supports reasoning_effort parameter
   */
  private isThinkingModel(): boolean {
    const modelName = this.config.modelName.toLowerCase();
    return THINKING_MODELS.some(m => modelName.toLowerCase().includes(m.toLowerCase()));
  }

  /**
   * Check if model uses max_completion_tokens instead of max_tokens
   */
  private usesCompletionTokens(): boolean {
    const modelName = this.config.modelName.toLowerCase();
    return MODELS_WITH_COMPLETION_TOKENS.some(m => modelName.includes(m.toLowerCase()));
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    this.validateConfig();

    const maxTokens = request.maxTokens || this.config.maxTokens;
    
    // Build request body
    const requestBody: any = {
      model: this.config.modelName,
      messages: request.messages,
    };

    // Use max_completion_tokens for newer models, max_tokens for older ones
    if (this.usesCompletionTokens()) {
      requestBody.max_completion_tokens = maxTokens;
    } else {
      requestBody.max_tokens = maxTokens;
      requestBody.temperature = request.temperature ?? this.config.temperature;
    }

    // Add reasoning_effort for Thinking models (o1, o3, GPT-5.x)
    const reasoningEffort = request.reasoningEffort || this.config.reasoningEffort;
    if (reasoningEffort && this.isThinkingModel()) {
      requestBody.reasoning_effort = reasoningEffort;
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(requestBody),
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
