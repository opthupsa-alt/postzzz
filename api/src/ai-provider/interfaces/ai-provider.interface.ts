export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AICompletionRequest {
  messages: AIMessage[];
  maxTokens?: number;
  temperature?: number;
  enableWebSearch?: boolean;
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
}

export interface IAIProvider {
  name: string;
  complete(request: AICompletionRequest): Promise<AICompletionResponse>;
  testConnection(): Promise<{ success: boolean; message: string }>;
}
