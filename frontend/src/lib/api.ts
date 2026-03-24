// 本地开发用 /api，生产环境由 Nginx 转发
const API_BASE_URL = process.env.NODE_ENV === 'development'
  ? 'http://localhost:3001'
  : '/api';

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

export interface Document {
  id: string;
  session_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

// Streaming chat function
export async function streamChat(
  agentType: 'psychological' | 'aiTools' | 'career',
  input: string,
  onChunk: (text: string) => void,
  onComplete: (fullText: string, sessionId?: string, documentReady?: boolean) => void,
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
    let sessionId: string | undefined;
    let documentReady = false;

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
              sessionId = json.sessionId;
              documentReady = json.documentReady || false;
              onComplete(fullText, sessionId, documentReady);
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

// Document API
export async function getDocument(sessionId: string): Promise<Document | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/documents/${sessionId}`);
    const data = await response.json();
    return data.success ? data.data : null;
  } catch (error) {
    return null;
  }
}

export async function updateDocument(sessionId: string, content: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/documents/${sessionId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    });
    const data = await response.json();
    return data.success;
  } catch (error) {
    return false;
  }
}

// History API
export async function getHistory(agentType?: string, limit: number = 20): Promise<Message[]> {
  try {
    const url = agentType
      ? `${API_BASE_URL}/history/${agentType}?limit=${limit}`
      : `${API_BASE_URL}/history?limit=${limit}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.success && Array.isArray(data.data)) {
      return data.data.map((item: any) => ({
        id: item.id,
        role: 'user' as const,
        content: item.user_input,
        timestamp: new Date(item.created_at)
      }));
    }
    return [];
  } catch (error) {
    return [];
  }
}
