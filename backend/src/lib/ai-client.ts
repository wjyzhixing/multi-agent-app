import * as dotenv from 'dotenv';
import { PassThrough } from 'stream';

dotenv.config();

const API_KEY = process.env.ANTHROPIC_AUTH_TOKEN;
const BASE_URL = process.env.ANTHROPIC_BASE_URL || 'https://coding.dashscope.aliyuncs.com/apps/anthropic';
const MODEL = process.env.ANTHROPIC_MODEL || 'glm-5';

export interface AIChatRequest {
  messages: { role: string; content: string }[];
  system?: string;
  maxTokens?: number;
  temperature?: number;
}

interface AIResponse {
  content: Array<{ type: string; text?: string }>;
}

// Non-streaming chat
export async function chatWithAI(request: AIChatRequest): Promise<string> {
  try {
    const response = await fetch(`${BASE_URL}/v1/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY!,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: request.maxTokens || 1024,
        messages: request.messages,
        system: request.system,
      }),
    });

    const data: AIResponse = await response.json() as AIResponse;

    const content = data.content;
    if (Array.isArray(content)) {
      const textBlock = content.find((block) => block.type === 'text');
      if (textBlock && textBlock.text) {
        return textBlock.text;
      }
    }

    return JSON.stringify(content);
  } catch (error: any) {
    console.error('AI API Error:', error);
    throw new Error('AI 服务调用失败');
  }
}

// Streaming chat - returns a Readable stream with SSE format
export async function chatWithAIStream(request: AIChatRequest): Promise<PassThrough> {
  const passThrough = new PassThrough();

  (async () => {
    try {
      const response = await fetch(`${BASE_URL}/v1/messages`, {
        method: 'POST',
        headers: {
          'x-api-key': API_KEY!,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: request.maxTokens || 1024,
          messages: request.messages,
          system: request.system,
          stream: true,
        }),
      });

      if (!response.ok) {
        passThrough.write(`data: ${JSON.stringify({ error: `API Error: ${response.status}`, done: true })}\n\n`);
        passThrough.end();
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        passThrough.write(`data: ${JSON.stringify({ error: 'No response body', done: true })}\n\n`);
        passThrough.end();
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data:')) {
            const data = line.slice(5).trim();
            if (!data) continue;

            try {
              const json = JSON.parse(data);

              if (json.type === 'content_block_delta' && json.delta?.type === 'text_delta') {
                const text = json.delta.text || '';
                if (text) {
                  fullText += text;
                  passThrough.write(`data: ${JSON.stringify({ text, done: false })}\n\n`);
                }
              }
              else if (json.type === 'message_stop') {
                passThrough.write(`data: ${JSON.stringify({ text: '', done: true, fullText })}\n\n`);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

      if (!passThrough.writableEnded) {
        passThrough.write(`data: ${JSON.stringify({ text: '', done: true, fullText })}\n\n`);
        passThrough.end();
      }
    } catch (error: any) {
      console.error('Stream error:', error);
      if (!passThrough.writableEnded) {
        passThrough.write(`data: ${JSON.stringify({ error: error.message, done: true })}\n\n`);
        passThrough.end();
      }
    }
  })();

  return passThrough;
}

// AI-based intent recognition
export async function checkIntentWithAI(input: string, agentType: 'psychological' | 'aiTools'): Promise<{ isRelevant: boolean; score: number; reason: string }> {
  const systemPrompt = agentType === 'psychological'
    ? `你是一个意图识别助手。判断用户输入是否与心理疏导相关。

心理疏导相关的话题包括：
- 情绪问题（焦虑、抑郁、压力、愤怒、悲伤等）
- 人际关系困扰
- 工作/学习压力
- 情感问题
- 自我成长
- 寻求心理建议
- 希望获得书籍/名言推荐

只返回 "relevant" 或 "not_relevant"，不要返回其他内容。`
    : `你是一个意图识别助手。判断用户输入是否与 AI 工具/技术推荐相关。

AI 相关的话题包括：
- AI 工具推荐（编程、图像、视频等）
- AI 技术介绍（模型、框架、算法等）
- AI 行业动态
- AI 应用场景
- 编程开发工具

只返回 "relevant" 或 "not_relevant"，不要返回其他内容。`;

  try {
    const response = await chatWithAI({
      messages: [{ role: 'user', content: input }],
      system: systemPrompt,
      maxTokens: 20,
      temperature: 0,
    });

    const isRelevant = response.toLowerCase().includes('relevant') && !response.toLowerCase().includes('not_relevant');
    return {
      isRelevant,
      score: isRelevant ? 1 : 0,
      reason: isRelevant ? '意图相关' : '意图不相关',
    };
  } catch (error) {
    return {
      isRelevant: true,
      score: 0.5,
      reason: 'AI 服务不可用，默认通过',
    };
  }
}