const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface ChatRequest {
  input: string;
  userId?: string;
}

export interface ChatResponse {
  success: boolean;
  data?: {
    text: string;
    recommendations: Recommendation[];
  };
  error?: string;
  isBlocked?: boolean;
  intentScore?: number;
}

export interface Recommendation {
  type: 'book' | 'quote' | 'tool' | 'technology';
  title: string;
  description: string;
  url?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  recommendations?: Recommendation[];
  isBlocked?: boolean;
  timestamp: Date;
}

// Streaming chat function
export async function streamChat(
  agentType: 'psychological' | 'aiTools',
  input: string,
  onChunk: (text: string) => void,
  onComplete: (fullText: string) => void,
  onError: (error: string) => void
): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/chat/${agentType}/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const json = JSON.parse(data);

            if (json.error) {
              onError(json.error);
              return;
            }

            if (json.text) {
              fullText += json.text;
              onChunk(json.text);
            }

            if (json.done && json.fullText) {
              fullText = json.fullText;
              onComplete(fullText);
              return;
            }

            if (json.isBlocked) {
              onComplete(fullText || json.text);
              return;
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }

    onComplete(fullText);
  } catch (error: any) {
    onError(error.message || '请求失败');
  }
}
