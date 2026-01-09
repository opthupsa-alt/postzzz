export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Reasoning effort levels for GPT-5.2 Thinking models
export type ReasoningEffort = 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';

export interface AICompletionRequest {
  messages: AIMessage[];
  maxTokens?: number;
  temperature?: number;
  enableWebSearch?: boolean;
  reasoningEffort?: ReasoningEffort;
}

export interface AICompletionResponse {
  content: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  model: string;
  finishReason: string;
}

export interface AIProviderConfig {
  apiKey: string;
  modelName: string;
  apiEndpoint?: string;
  maxTokens: number;
  temperature: number;
  enableWebSearch: boolean;
  reasoningEffort?: ReasoningEffort;
}

export interface IAIProvider {
  name: string;
  complete(request: AICompletionRequest): Promise<AICompletionResponse>;
  testConnection(): Promise<{ success: boolean; message: string }>;
}
