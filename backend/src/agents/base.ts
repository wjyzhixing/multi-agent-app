// Base agent interface and abstract class
export interface AgentResponse {
  text: string;
  recommendations?: Recommendation[];
  metadata?: Record<string, any>;
}

export interface Recommendation {
  type: 'book' | 'quote' | 'tool' | 'technology';
  title: string;
  description: string;
  url?: string;
}

export interface AgentContext {
  userId?: string;
  conversationId?: string;
  history?: any[];
}

export abstract class BaseAgent {
  abstract readonly name: string;
  abstract readonly description: string;

  abstract process(input: string, context?: AgentContext): Promise<AgentResponse>;

  protected getRandomElement<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  protected formatResponse(text: string, recommendations?: Recommendation[]): AgentResponse {
    return {
      text,
      recommendations: recommendations || []
    };
  }
}
