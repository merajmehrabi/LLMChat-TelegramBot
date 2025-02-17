import axios, { AxiosInstance, AxiosError } from 'axios';
import env from './env.config';
import logger from './logger.config';

// OpenRouter API configuration
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1';

// Available models configuration
export const AVAILABLE_MODELS = {
  'openai/o3-mini-high': {
    name: 'o3-mini-high',
    contextWindow: 100000,
    costPer1kInput: 0.008,
    costPer1kOutput: 0.024
  },
  'google/gemini-2.0-flash-lite-preview-02-05:free': {
    name: 'gemini-2.0-flash-lite-preview-02-05:free',
    contextWindow: 8192,
    costPer1kInput: 0.01,
    costPer1kOutput: 0.03
  },
  'google/gemini-2.0-pro-exp-02-05:free': {
    name: 'gemini-2.0-pro-exp-02-05:free',
    contextWindow: 4096,
    costPer1kInput: 0.001,
    costPer1kOutput: 0.002
  },
  'qwen/qwen-vl-plus:free': {
    name: 'qwen-vl-plus:free',
    contextWindow: 8192,
    costPer1kInput: 0.0002,
    costPer1kOutput: 0.0002
  },
  'cognitivecomputations/dolphin3.0-r1-mistral-24b:free': {
    name: 'Dolphin Mistral 24B',
    contextWindow: 16384,
    costPer1kInput: 0,
    costPer1kOutput: 0
  },
  'deepseek/deepseek-r1:free': {
    name: 'deepseek-r1:free',
    contextWindow: 200000,
    costPer1kInput: 0.008,
    costPer1kOutput: 0.024
  },
  'deepseek/deepseek-chat:free': {
    name: 'deepseek-chat:free',
    contextWindow: 4096,
    costPer1kInput: 0.0007,
    costPer1kOutput: 0.0007
  },
  'openai/o3-mini': {
    name: 'o3-mini',
    contextWindow: 8192,
    costPer1kInput: 0.0005,
    costPer1kOutput: 0.0005
  },
  'openai/gpt-4o-mini': {
    name: 'gpt-4o-mini',
    contextWindow: 4096,
    costPer1kInput: 0.0005,
    costPer1kOutput: 0.0005
  }
} as const;

export type ModelId = keyof typeof AVAILABLE_MODELS;

// API client interface
interface OpenRouterResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface GenerationStats {
  data: {
    id: string;
    model: string;
    streamed: boolean;
    generation_time: number;
    tokens_prompt: number;
    tokens_completion: number;
    total_cost: number;
  };
}

// Create axios instance with default config
const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: OPENROUTER_API_URL,
    headers: {
      'Authorization': `Bearer ${env.openrouterKey}`,
      'HTTP-Referer': 'llm-telegram-chat-bot',
      'Content-Type': 'application/json'
    },
    timeout: 60000 // 60 second timeout
  });

  // Response interceptor for error handling
  client.interceptors.response.use(
    response => response,
    (error: AxiosError) => {
      logger.error('OpenRouter API Error', {
        status: error.response?.status,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method
        }
      });
      throw error;
    }
  );

  return client;
};

// OpenRouter client class
export class OpenRouterClient {
  private client: AxiosInstance;
  private currentModel: ModelId;

  constructor(defaultModel?: string) {
    this.client = createApiClient();
    
    // Validate default model
    if (defaultModel && !(defaultModel in AVAILABLE_MODELS)) {
      logger.warn(`Invalid default model: ${defaultModel}, using deepseek`);
      this.currentModel = 'deepseek/deepseek-chat:free';
    } else {
      this.currentModel = (defaultModel as ModelId) || 'deepseek/deepseek-chat:free';
    }
    
    logger.info('OpenRouter client initialized', { model: this.currentModel });
  }

  // Set active model
  setModel(model: ModelId): void {
    if (!AVAILABLE_MODELS[model]) {
      throw new Error(`Invalid model: ${model}`);
    }
    this.currentModel = model;
  }

  // Get current model info
  getCurrentModel() {
    return {
      id: this.currentModel,
      ...AVAILABLE_MODELS[this.currentModel]
    };
  }

  // Get generation stats
  private async getGenerationStats(generationId: string): Promise<GenerationStats> {
    try {
      const response = await this.client.get<GenerationStats>(`/generation?id=${generationId}`);
      return response.data;
    } catch (error) {
      logger.error('Error getting generation stats', { error, generationId });
      throw error;
    }
  }

  // Send chat completion request
  async createChatCompletion(
    messages: Array<{ role: string; content: string }>,
    temperature: number = env.temperature
  ): Promise<{
    content: string;
    usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    cost: number;
  }> {
    try {
      const response = await this.client.post<OpenRouterResponse>('/chat/completions', {
        model: this.currentModel,
        messages,
        temperature,
        max_tokens: env.maxTokens
      });

      const { id, choices } = response.data;
      const content = choices[0].message.content;

      // Add a small delay to ensure generation stats are ready
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Get accurate token counts and cost from generation stats
      const stats = await this.getGenerationStats(id);
      const usage = {
        prompt_tokens: stats.data.tokens_prompt,
        completion_tokens: stats.data.tokens_completion,
        total_tokens: stats.data.tokens_prompt + stats.data.tokens_completion
      };

      logger.info('OpenRouter API Request Success', {
        model: this.currentModel,
        generationId: id,
        usage,
        cost: stats.data.total_cost
      });

      return {
        content,
        usage,
        cost: stats.data.total_cost
      };
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new Error(
          `OpenRouter API Error: ${error.response?.data?.error || error.message}`
        );
      }
      throw error;
    }
  }
}

// Export singleton instance
export const openRouterClient = new OpenRouterClient(env.defaultModel);
export default openRouterClient;
