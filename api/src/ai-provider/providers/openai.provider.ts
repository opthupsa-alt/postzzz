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

// Models with built-in web search capability (use Chat Completions)
const WEB_SEARCH_MODELS = [
  'gpt-4o-search-preview',
  'gpt-4o-mini-search-preview',
];

// Models that support web_search tool via Responses API
const RESPONSES_API_MODELS = [
  'gpt-4o', 'gpt-4o-mini',
  'gpt-5', 'gpt-5.1', 'gpt-5.2',
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

  /**
   * Check if model has built-in web search (search-preview models)
   */
  private isWebSearchModel(): boolean {
    const modelName = this.config.modelName.toLowerCase();
    return WEB_SEARCH_MODELS.some(m => modelName.includes(m.toLowerCase()));
  }

  /**
   * Check if model supports Responses API with web_search tool
   */
  private supportsResponsesAPI(): boolean {
    const modelName = this.config.modelName.toLowerCase();
    return RESPONSES_API_MODELS.some(m => modelName.includes(m.toLowerCase()));
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    this.validateConfig();

    // Use Responses API with web_search if enabled and supported
    if (request.enableWebSearch && this.supportsResponsesAPI()) {
      return this.completeWithWebSearch(request);
    }

    // Use search-preview model if it's a web search model
    if (this.isWebSearchModel()) {
      return this.completeWithSearchModel(request);
    }

    // Standard Chat Completions API
    return this.completeStandard(request);
  }

  /**
   * Standard Chat Completions API call
   */
  private async completeStandard(request: AICompletionRequest): Promise<AICompletionResponse> {
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

  /**
   * Use Responses API with web_search tool for real-time web search
   */
  private async completeWithWebSearch(request: AICompletionRequest): Promise<AICompletionResponse> {
    const maxTokens = request.maxTokens || this.config.maxTokens;

    // Build input from messages
    const systemMessage = request.messages.find(m => m.role === 'system');
    const userMessage = request.messages.find(m => m.role === 'user');
    
    const requestBody: any = {
      model: this.config.modelName,
      input: userMessage?.content || '',
      tools: [{ type: 'web_search' }],
      max_output_tokens: maxTokens,
    };

    // Add instructions (system prompt)
    if (systemMessage?.content) {
      requestBody.instructions = systemMessage.content;
    }

    // Add reasoning for thinking models
    const reasoningEffort = request.reasoningEffort || this.config.reasoningEffort;
    if (reasoningEffort && this.isThinkingModel()) {
      requestBody.reasoning = { effort: reasoningEffort };
    }

    const response = await fetch(`${this.baseUrl}/responses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(`OpenAI Responses API Error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    // Parse Responses API output format
    let content = '';
    let annotations: any[] = [];
    
    for (const item of data.output || []) {
      if (item.type === 'message' && item.content) {
        for (const contentItem of item.content) {
          if (contentItem.type === 'output_text') {
            content += contentItem.text || '';
            if (contentItem.annotations) {
              annotations = annotations.concat(contentItem.annotations);
            }
          }
        }
      }
    }

    // Append citations if available
    if (annotations.length > 0) {
      content += '\n\n---\n## المصادر والمراجع:\n';
      const uniqueUrls = new Set<string>();
      for (const ann of annotations) {
        if (ann.type === 'url_citation' && ann.url && !uniqueUrls.has(ann.url)) {
          uniqueUrls.add(ann.url);
          content += `- [${ann.title || ann.url}](${ann.url})\n`;
        }
      }
    }

    return {
      content,
      promptTokens: data.usage?.input_tokens || 0,
      completionTokens: data.usage?.output_tokens || 0,
      totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      model: data.model || this.config.modelName,
      finishReason: data.status || 'completed',
      annotations,
    };
  }

  /**
   * Use search-preview model (gpt-4o-search-preview) with built-in web search
   */
  private async completeWithSearchModel(request: AICompletionRequest): Promise<AICompletionResponse> {
    const maxTokens = request.maxTokens || this.config.maxTokens;
    
    const requestBody: any = {
      model: this.config.modelName,
      messages: request.messages,
      max_completion_tokens: maxTokens,
    };

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
      throw new Error(`OpenAI Search API Error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    if (!choice) {
      throw new Error('No response from OpenAI Search');
    }

    // Extract annotations/citations from search model response
    let content = choice.message?.content || '';
    const annotations = choice.message?.annotations || [];

    // Append citations if available
    if (annotations.length > 0) {
      content += '\n\n---\n## المصادر والمراجع:\n';
      const uniqueUrls = new Set<string>();
      for (const ann of annotations) {
        if (ann.type === 'url_citation' && ann.url && !uniqueUrls.has(ann.url)) {
          uniqueUrls.add(ann.url);
          content += `- [${ann.title || ann.url}](${ann.url})\n`;
        }
      }
    }

    return {
      content,
      promptTokens: data.usage?.prompt_tokens || 0,
      completionTokens: data.usage?.completion_tokens || 0,
      totalTokens: data.usage?.total_tokens || 0,
      model: data.model || this.config.modelName,
      finishReason: choice.finish_reason || 'unknown',
      annotations,
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
